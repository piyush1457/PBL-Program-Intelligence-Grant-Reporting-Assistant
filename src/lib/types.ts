export interface SchoolRecord {
  id?: number;
  reporting_month: string;
  school_name: string;
  school_code: string;
  district: string;
  block: string;
  pbl_conducted: number; // 0 or 1
  evidence_submitted: number; // 0 or 1
  classes: string;
  subject: string;
  enrollment_6: number;
  enrollment_7: number;
  enrollment_8: number;
  attendance_6_science: number;
  attendance_6_math: number;
  attendance_7_science: number;
  attendance_7_math: number;
  attendance_8_science: number;
  attendance_8_math: number;
  total_enrollment: number;
  total_attendance: number;
  attendance_rate: number;
  risk_status: string;
}

export interface GrantFinanceRow {
  grant_id: string;
  donor: string;
  grant_name: string;
  period_start: string;
  period_end: string;
  covered_districts: string;
  reporting_month: string;
  budget_line: string;
  approved_budget: number;
  monthly_utilized: number;
  cumulative_utilized: number;
  utilization_rate: number;
  finance_note: string;
}

export interface GrantPerformanceRow {
  grant_id: string;
  donor: string;
  grant_name: string;
  reporting_month: string;
  pbl_completion_rate: number;
  evidence_submission_rate: number;
  total_enrollment: number;
  total_attendance: number;
  attendance_rate: number;
  risk_status: string;
  milestone_summary: string;
  draft_report_text: string;
  report_status: string;
  covered_districts: string;
}

export interface EvidenceMediaRow {
  record_id: string;
  record_type: string;
  grant_id: string;
  donor: string;
  reporting_month: string;
  district: string;
  title: string;
  summary_or_caption: string;
  file_name: string;
  relative_path: string;
  usage_note: string;
}

export interface KPIOverview {
  totalSchools: number;
  participatingSchools: number;
  participationPercentage: number;
  evidenceSubmissionPercentage: number;
  totalEnrollment: number;
  totalAttendance: number;
  attendancePercentage: number;
  prevParticipationPercentage?: number;
  prevEvidenceSubmissionPercentage?: number;
  prevAttendancePercentage?: number;
  riskDistribution: {
    onTrack: number;
    behind: number;
    atRisk: number;
    critical: number;
  };
}

export interface GeographySummary {
  name: string;
  type: 'district' | 'block';
  totalSchools: number;
  participatingSchools: number;
  participationRate: number;
  evidenceSubmissionRate: number;
  totalEnrollment: number;
  totalAttendance: number;
  attendanceRate: number;
  participationRisk: 'On Track' | 'Behind' | 'At Risk' | 'Critical';
  evidenceRisk: 'On Track' | 'Behind' | 'At Risk' | 'Critical';
  attendanceRisk: 'On Track' | 'Behind' | 'At Risk' | 'Critical';
  overallRisk: 'On Track' | 'Behind' | 'At Risk' | 'Critical';
  riskReason: string;
}
