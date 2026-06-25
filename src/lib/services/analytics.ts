import { db } from '@/lib/db';
import { classifyGeography, classifyRisk } from '@/lib/risk';
import { getPrevMonth } from '@/lib/utils';
import { GeographySummary, KPIOverview, GrantFinanceRow, GrantPerformanceRow, EvidenceMediaRow } from '@/lib/types';

export interface QueryFilters {
  month: string;
  district?: string;
  block?: string;
  grade?: string;
  subject?: string;
}

export interface ReviewSummaryData {
  reportingMonth: string;
  achievements: string[];
  gaps: string[];
  priorityGeographies: GeographySummary[];
  discussionPrompts: string[];
}

export interface GrantDetailsData {
  performance?: GrantPerformanceRow;
  finance: GrantFinanceRow[];
  media: EvidenceMediaRow[];
  grantsList: { grant_id: string; grant_name: string; donor: string }[];
}

// 1. Reusable SQL rollups to reduce code duplication
export function fetchDistrictRollups(month: string): any[] {
  const query = `
    SELECT 
      district as name,
      COUNT(*) as total_schools,
      SUM(CASE WHEN pbl_conducted = 1 THEN 1 ELSE 0 END) as participating_schools,
      SUM(CASE WHEN pbl_conducted = 1 AND evidence_submitted = 1 THEN 1 ELSE 0 END) as evidence_submitted_schools,
      SUM(enrollment_6 + enrollment_7 + enrollment_8) as total_enrollment,
      SUM(total_attendance) as total_attendance
    FROM school_responses
    WHERE reporting_month = ? AND district IS NOT NULL AND district != ''
    GROUP BY district
    ORDER BY district ASC
  `;
  return db.prepare(query).all(month);
}

export function fetchBlockRollups(month: string, district?: string): any[] {
  let query = `
    SELECT 
      block as name,
      district,
      COUNT(*) as total_schools,
      SUM(CASE WHEN pbl_conducted = 1 THEN 1 ELSE 0 END) as participating_schools,
      SUM(CASE WHEN pbl_conducted = 1 AND evidence_submitted = 1 THEN 1 ELSE 0 END) as evidence_submitted_schools,
      SUM(enrollment_6 + enrollment_7 + enrollment_8) as total_enrollment,
      SUM(total_attendance) as total_attendance
    FROM school_responses
    WHERE reporting_month = ? AND block IS NOT NULL AND block != ''
  `;
  const params: any[] = [month];

  if (district) {
    query += ' AND district = ?';
    params.push(district);
  }

  query += `
    GROUP BY block, district
    ORDER BY block ASC
  `;

  return db.prepare(query).all(...params);
}

// 2. Rollup maps from DB rows to GeographySummary
export function mapToGeographySummary(row: any, type: 'district' | 'block'): GeographySummary {
  const totalSchools = Number(row.total_schools || 0);
  const participatingSchools = Number(row.participating_schools || 0);
  const evidenceSubmittedSchools = Number(row.evidence_submitted_schools || 0);
  const totalEnrollment = Number(row.total_enrollment || 0);
  const totalAttendance = Number(row.total_attendance || 0);

  const participationRate = totalSchools > 0 ? participatingSchools / totalSchools : 0;
  const evidenceSubmissionRate = participatingSchools > 0 ? evidenceSubmittedSchools / participatingSchools : 0;
  
  // Since overall metrics roll up both subjects for all grades, potential sessions are enrollment * 2
  const possibleAttendance = totalEnrollment * 2;
  const attendanceRate = possibleAttendance > 0 ? totalAttendance / possibleAttendance : 0;

  const classification = classifyGeography(participationRate, evidenceSubmissionRate, attendanceRate);

  return {
    name: row.name,
    type,
    totalSchools,
    participatingSchools,
    participationRate,
    evidenceSubmissionRate,
    totalEnrollment,
    totalAttendance,
    attendanceRate,
    participationRisk: classification.participationRisk,
    evidenceRisk: classification.evidenceRisk,
    attendanceRisk: classification.attendanceRisk,
    overallRisk: classification.overallRisk,
    riskReason: classification.reason
  };
}

// 3. Main Business Logic Service Methods
export function getAggregatedMetrics(filters: QueryFilters): KPIOverview {
  const whereClauses = ['reporting_month = ?'];
  const params: any[] = [filters.month];

  if (filters.district) {
    whereClauses.push('district = ?');
    params.push(filters.district);
  }
  if (filters.block) {
    whereClauses.push('block = ?');
    params.push(filters.block);
  }
  if (filters.subject) {
    if (filters.subject === 'Math') {
      whereClauses.push("subject LIKE '%Math%'");
    } else if (filters.subject === 'Science') {
      whereClauses.push("subject LIKE '%Science%'");
    } else if (filters.subject === 'Math and Science') {
      whereClauses.push("subject = 'Math and Science'");
    }
  }

  const whereSql = whereClauses.join(' AND ');

  const query = `
    SELECT 
      id,
      pbl_conducted,
      evidence_submitted,
      enrollment_6,
      attendance_6_science,
      attendance_6_math,
      enrollment_7,
      attendance_7_science,
      attendance_7_math,
      enrollment_8,
      attendance_8_science,
      attendance_8_math,
      total_enrollment,
      total_attendance,
      attendance_rate
    FROM school_responses
    WHERE ${whereSql}
  `;

  const rows = db.prepare(query).all(...params) as any[];

  if (rows.length === 0) {
    return {
      totalSchools: 0,
      participatingSchools: 0,
      participationPercentage: 0,
      evidenceSubmissionPercentage: 0,
      totalEnrollment: 0,
      totalAttendance: 0,
      attendancePercentage: 0,
      riskDistribution: { onTrack: 0, behind: 0, atRisk: 0, critical: 0 }
    };
  }

  const totalSchools = rows.length;
  let participatingSchools = 0;
  let evidenceSubmittedCount = 0;
  let totalEnrollment = 0;
  let totalAttendance = 0;
  let possibleAttendanceSessions = 0;

  let onTrackCount = 0;
  let behindCount = 0;
  let atRiskCount = 0;
  let criticalCount = 0;

  rows.forEach(row => {
    if (row.pbl_conducted === 1) {
      participatingSchools++;
      if (row.evidence_submitted === 1) {
        evidenceSubmittedCount++;
      }
    }

    let schoolEnrollment = 0;
    let schoolAttendance = 0;
    let subjectsMultiplier = 2; // Math & Science by default

    if (filters.subject === 'Math' || filters.subject === 'Science') {
      subjectsMultiplier = 1;
    }

    if (filters.grade === '6') {
      schoolEnrollment = row.enrollment_6;
      if (filters.subject === 'Math') {
        schoolAttendance = row.attendance_6_math;
      } else if (filters.subject === 'Science') {
        schoolAttendance = row.attendance_6_science;
      } else {
        schoolAttendance = row.attendance_6_math + row.attendance_6_science;
      }
    } else if (filters.grade === '7') {
      schoolEnrollment = row.enrollment_7;
      if (filters.subject === 'Math') {
        schoolAttendance = row.attendance_7_math;
      } else if (filters.subject === 'Science') {
        schoolAttendance = row.attendance_7_science;
      } else {
        schoolAttendance = row.attendance_7_math + row.attendance_7_science;
      }
    } else if (filters.grade === '8') {
      schoolEnrollment = row.enrollment_8;
      if (filters.subject === 'Math') {
        schoolAttendance = row.attendance_8_math;
      } else if (filters.subject === 'Science') {
        schoolAttendance = row.attendance_8_science;
      } else {
        schoolAttendance = row.attendance_8_math + row.attendance_8_science;
      }
    } else {
      schoolEnrollment = row.enrollment_6 + row.enrollment_7 + row.enrollment_8;
      if (filters.subject === 'Math') {
        schoolAttendance = row.attendance_6_math + row.attendance_7_math + row.attendance_8_math;
      } else if (filters.subject === 'Science') {
        schoolAttendance = row.attendance_6_science + row.attendance_7_science + row.attendance_8_science;
      } else {
        schoolAttendance = row.total_attendance;
      }
    }

    totalEnrollment += schoolEnrollment;
    totalAttendance += schoolAttendance;
    possibleAttendanceSessions += schoolEnrollment * subjectsMultiplier;

    let schoolRate = 0;
    if (row.pbl_conducted === 1 && schoolEnrollment > 0) {
      schoolRate = schoolAttendance / (schoolEnrollment * subjectsMultiplier);
    }
    
    const schoolRisk = row.pbl_conducted === 0 ? 'Critical' : classifyRisk(schoolRate);
    if (schoolRisk === 'On Track') onTrackCount++;
    else if (schoolRisk === 'Behind') behindCount++;
    else if (schoolRisk === 'At Risk') atRiskCount++;
    else criticalCount++;
  });

  const participationPercentage = totalSchools > 0 ? participatingSchools / totalSchools : 0;
  const evidenceSubmissionPercentage = participatingSchools > 0 ? evidenceSubmittedCount / participatingSchools : 0;
  const attendancePercentage = possibleAttendanceSessions > 0 ? totalAttendance / possibleAttendanceSessions : 0;

  return {
    totalSchools,
    participatingSchools,
    participationPercentage,
    evidenceSubmissionPercentage,
    totalEnrollment,
    totalAttendance,
    attendancePercentage,
    riskDistribution: {
      onTrack: onTrackCount,
      behind: behindCount,
      atRisk: atRiskCount,
      critical: criticalCount
    }
  };
}

export function getDistrictSummaries(month: string): GeographySummary[] {
  const rows = fetchDistrictRollups(month);
  const summaries = rows.map(r => mapToGeographySummary(r, 'district'));
  return summaries.sort((a, b) => b.attendanceRate - a.attendanceRate);
}

export function getBlockSummaries(month: string, district?: string): (GeographySummary & { district: string })[] {
  const rows = fetchBlockRollups(month, district);
  const summaries = rows.map(r => {
    const sum = mapToGeographySummary(r, 'block');
    return {
      ...sum,
      district: r.district
    };
  });
  return summaries.sort((a, b) => b.attendanceRate - a.attendanceRate);
}

export function getReviewSummary(month: string): ReviewSummaryData {
  const prevMonth = getPrevMonth(month);

  const currentDistricts = fetchDistrictRollups(month);
  const currentBlocks = fetchBlockRollups(month);

  let prevDistricts: any[] = [];
  let prevBlocks: any[] = [];
  if (prevMonth) {
    prevDistricts = fetchDistrictRollups(prevMonth);
    prevBlocks = fetchBlockRollups(prevMonth);
  }

  const districtSummaries = currentDistricts.map(curr => {
    const prev = prevDistricts.find(d => d.name === curr.name);
    const sum = mapToGeographySummary(curr, 'district');
    
    let prevPRate = 0, prevERate = 0, prevARate = 0;
    if (prev) {
      const prevSum = mapToGeographySummary(prev, 'district');
      prevPRate = prevSum.participationRate;
      prevERate = prevSum.evidenceSubmissionRate;
      prevARate = prevSum.attendanceRate;
    }

    return {
      name: sum.name,
      pRate: sum.participationRate,
      eRate: sum.evidenceSubmissionRate,
      aRate: sum.attendanceRate,
      prevPRate,
      prevERate,
      prevARate,
      overallRisk: sum.overallRisk,
      pRisk: sum.participationRisk,
      eRisk: sum.evidenceRisk,
      aRisk: sum.attendanceRisk,
    };
  });

  const blockSummaries = currentBlocks.map(curr => {
    const prev = prevBlocks.find(b => b.name === curr.name && b.district === curr.district);
    const sum = mapToGeographySummary(curr, 'block');
    
    let prevPRate = 0, prevERate = 0, prevARate = 0;
    if (prev) {
      const prevSum = mapToGeographySummary(prev, 'block');
      prevPRate = prevSum.participationRate;
      prevERate = prevSum.evidenceSubmissionRate;
      prevARate = prevSum.attendanceRate;
    }

    return {
      name: sum.name,
      district: curr.district,
      pRate: sum.participationRate,
      eRate: sum.evidenceSubmissionRate,
      aRate: sum.attendanceRate,
      prevPRate,
      prevERate,
      prevARate,
      overallRisk: sum.overallRisk,
    };
  });

  // Achievements extraction
  const achievements: string[] = [];
  const onTrackDistricts = districtSummaries.filter(d => d.overallRisk === 'On Track');
  if (onTrackDistricts.length > 0) {
    achievements.push(
      `On Track Districts: ${onTrackDistricts.map(d => `${d.name} (Attendance: ${(d.aRate * 100).toFixed(1)}%)`).join(', ')} achieved excellent progress across participation, evidence submission, and student attendance.`
    );
  }

  const perfectParticipation = districtSummaries.filter(d => d.pRate >= 0.95);
  if (perfectParticipation.length > 0) {
    achievements.push(
      `Strong PBL Participation: ${perfectParticipation.map(d => d.name).join(', ')} achieved over 95% PBL project implementation rate in schools.`
    );
  }

  districtSummaries.forEach(d => {
    if (prevMonth && d.aRate - d.prevARate > 0.05) {
      achievements.push(
        `Improved Attendance: ${d.name} saw a substantial student attendance improvement of +${((d.aRate - d.prevARate) * 100).toFixed(1)}% MoM (rising from ${(d.prevARate * 100).toFixed(1)}% to ${(d.aRate * 100).toFixed(1)}%).`
      );
    }
  });

  if (achievements.length === 0) {
    achievements.push('Maintained implementation rates within baseline parameters.');
  }

  // Gaps extraction
  const gaps: string[] = [];
  const criticalDistricts = districtSummaries.filter(d => d.overallRisk === 'Critical');
  const atRiskDistricts = districtSummaries.filter(d => d.overallRisk === 'At Risk');

  if (criticalDistricts.length > 0) {
    gaps.push(
      `Critical Geographies: ${criticalDistricts.map(d => d.name).join(', ')} are classified as Critical. Immediate field support is needed to address implementation bottlenecks.`
    );
  }

  if (atRiskDistricts.length > 0) {
    gaps.push(
      `At Risk Geographies: ${atRiskDistricts.map(d => d.name).join(', ')} are currently At Risk, primarily due to lagging student attendance or evidence uploads.`
    );
  }

  districtSummaries.forEach(d => {
    if (d.pRate >= 0.8 && d.eRate < 0.5) {
      gaps.push(
        `Evidence Collection Gap: In ${d.name}, although PBL project completion is high (${(d.pRate * 100).toFixed(1)}%), evidence submission is critically low at ${(d.eRate * 100).toFixed(1)}%.`
      );
    }
    if (d.aRate < 0.5) {
      gaps.push(
        `Low PBL Attendance: Average student attendance during PBL sessions in ${d.name} is low at ${(d.aRate * 100).toFixed(1)}%.`
      );
    }
  });

  if (gaps.length === 0) {
    gaps.push('No severe gaps detected. All districts remain Behind or On Track.');
  }

  const sortedBlocks = [...blockSummaries].sort((a, b) => a.aRate - b.aRate);
  
  // Cast output geographies matching signature
  const bottomBlocks = sortedBlocks.slice(0, 5).map(b => {
    const classification = classifyGeography(b.pRate, b.eRate, b.aRate);
    return {
      name: b.name,
      district: b.district,
      type: 'block' as const,
      totalSchools: 0, // Placeholder matching type signature
      participatingSchools: 0,
      participationRate: b.pRate,
      evidenceSubmissionRate: b.eRate,
      totalEnrollment: 0,
      totalAttendance: 0,
      attendanceRate: b.aRate,
      participationRisk: classification.participationRisk,
      evidenceRisk: classification.evidenceRisk,
      attendanceRisk: classification.attendanceRisk,
      overallRisk: classification.overallRisk,
      riskReason: classification.reason
    };
  });

  const discussionPrompts: string[] = [];
  if (bottomBlocks.length > 0) {
    discussionPrompts.push(
      `Why is PBL attendance at ${(bottomBlocks[0].attendanceRate * 100).toFixed(1)}% in block ${bottomBlocks[0].name} (${bottomBlocks[0].district})? What local challenges are teachers facing?`
    );
  }

  const evidenceGapDistricts = districtSummaries.filter(d => d.pRate > 0.7 && d.eRate < d.pRate - 0.2);
  if (evidenceGapDistricts.length > 0) {
    discussionPrompts.push(
      `In ${evidenceGapDistricts[0].name}, PBL is happening in schools, but only ${(evidenceGapDistricts[0].eRate * 100).toFixed(1)}% of those schools are uploading evidence. Is this an issue of teacher training on the portal, or is the evidence not being compiled?`
    );
  }

  blockSummaries.forEach(b => {
    if (prevMonth && b.aRate - b.prevARate < -0.1) {
      discussionPrompts.push(
        `Block "${b.name}" in ${b.district} experienced a severe attendance rate drop of ${((b.aRate - b.prevARate) * 100).toFixed(1)}% MoM. What external factors or scheduling conflicts caused this sudden decline?`
      );
    }
  });

  if (discussionPrompts.length < 3) {
    discussionPrompts.push('What support do schools in Critical blocks need from block officers before the next review?');
    discussionPrompts.push('How can we leverage best practices from On Track districts to support Behind blocks?');
  }

  return {
    reportingMonth: month,
    achievements,
    gaps,
    priorityGeographies: bottomBlocks,
    discussionPrompts: discussionPrompts.slice(0, 4)
  };
}

export function getGrantDetails(grantId: string, month: string): GrantDetailsData {
  const performance = db.prepare(`
    SELECT * FROM grant_performance 
    WHERE grant_id = ? AND reporting_month = ?
  `).get(grantId, month) as GrantPerformanceRow | undefined;

  const finance = db.prepare(`
    SELECT * FROM grant_finance 
    WHERE grant_id = ? AND reporting_month = ?
  `).all(grantId, month) as GrantFinanceRow[];

  const media = db.prepare(`
    SELECT * FROM evidence_media 
    WHERE grant_id = ? AND reporting_month = ?
  `).all(grantId, month) as EvidenceMediaRow[];

  const grantsList = db.prepare(`
    SELECT DISTINCT grant_id, grant_name, donor FROM grant_performance
  `).all() as { grant_id: string; grant_name: string; donor: string }[];

  return {
    performance,
    finance,
    media,
    grantsList
  };
}
