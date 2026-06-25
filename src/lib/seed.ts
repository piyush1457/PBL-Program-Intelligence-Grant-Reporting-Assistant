import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { db } from './db';

function isAlreadySeeded(): boolean {
  try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='school_responses'").get();
    if (!tableCheck) return false;
    const rowCount = db.prepare('SELECT count(*) as count FROM school_responses').get() as { count: number };
    return rowCount.count > 0;
  } catch {
    return false;
  }
}

export function runSeeding() {
  if (isAlreadySeeded()) {
    console.log('Database already populated. Skipping seeding.');
    try {
      copyImagesToPublic();
    } catch (e) {
      console.error('Failed to copy images during skipped seeding:', e);
    }
    return;
  }

  // Create seeding status table first to act as a lock
  db.exec(`
    CREATE TABLE IF NOT EXISTS seeding_status (
      status TEXT PRIMARY KEY
    );
  `);

  try {
    db.prepare("INSERT INTO seeding_status (status) VALUES ('seeding')").run();
  } catch (err) {
    // UNIQUE constraint failed means it's already seeding or seeded
    console.log('Seeding lock exists. Skipping seeding for this worker.');
    return;
  }

  console.log('--- Starting Database Seeding (Lock Acquired) ---');

  // 1. Create Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS school_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporting_month TEXT,
      school_name TEXT,
      school_code TEXT,
      district TEXT,
      block TEXT,
      pbl_conducted INTEGER,
      evidence_submitted INTEGER,
      classes TEXT,
      subject TEXT,
      enrollment_6 INTEGER,
      attendance_6_science INTEGER,
      attendance_6_math INTEGER,
      enrollment_7 INTEGER,
      attendance_7_science INTEGER,
      attendance_7_math INTEGER,
      enrollment_8 INTEGER,
      attendance_8_science INTEGER,
      attendance_8_math INTEGER,
      total_enrollment INTEGER,
      total_attendance INTEGER,
      attendance_rate REAL,
      risk_status TEXT
    );

    CREATE TABLE IF NOT EXISTS grant_finance (
      grant_id TEXT,
      donor TEXT,
      grant_name TEXT,
      period_start TEXT,
      period_end TEXT,
      covered_districts TEXT,
      reporting_month TEXT,
      budget_line TEXT,
      approved_budget INTEGER,
      monthly_utilized INTEGER,
      cumulative_utilized INTEGER,
      utilization_rate REAL,
      finance_note TEXT
    );

    CREATE TABLE IF NOT EXISTS grant_performance (
      grant_id TEXT,
      donor TEXT,
      grant_name TEXT,
      reporting_month TEXT,
      period_end_date TEXT,
      report_due_date TEXT,
      report_status TEXT,
      covered_districts TEXT,
      sampled_school_records INTEGER,
      schools_completed_pbl INTEGER,
      pbl_completion_rate REAL,
      schools_with_evidence INTEGER,
      evidence_submission_rate REAL,
      total_enrollment INTEGER,
      total_attendance INTEGER,
      attendance_rate REAL,
      risk_status TEXT,
      milestone_summary TEXT,
      draft_report_text TEXT
    );

    CREATE TABLE IF NOT EXISTS evidence_media (
      record_id TEXT PRIMARY KEY,
      record_type TEXT,
      grant_id TEXT,
      donor TEXT,
      reporting_month TEXT,
      district TEXT,
      title TEXT,
      summary_or_caption TEXT,
      file_name TEXT,
      relative_path TEXT,
      usage_note TEXT
    );
  `);

  // 2. Parse and Insert School Responses CSVs
  const months = ['July', 'August', 'September'];
  const schoolInsert = db.prepare(`
    INSERT INTO school_responses (
      reporting_month, school_name, school_code, district, block,
      pbl_conducted, evidence_submitted, classes, subject,
      enrollment_6, attendance_6_science, attendance_6_math,
      enrollment_7, attendance_7_science, attendance_7_math,
      enrollment_8, attendance_8_science, attendance_8_math,
      total_enrollment, total_attendance, attendance_rate, risk_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTransaction = db.transaction((rows: any[]) => {
    for (const row of rows) {
      schoolInsert.run(
        row.reportingMonth, row.schoolName, row.schoolCode, row.district, row.block,
        row.pblConducted, row.evidenceSubmitted, row.classes, row.subject,
        row.enrollment_6, row.attendance_6_science, row.attendance_6_math,
        row.enrollment_7, row.attendance_7_science, row.attendance_7_math,
        row.enrollment_8, row.attendance_8_science, row.attendance_8_math,
        row.total_enrollment, row.total_attendance, row.attendance_rate, row.risk_status
      );
    }
  });

  for (const m of months) {
    const csvPath = path.join(process.cwd(), 'csv_exports', `PBL_School_Response_Data_${m}_2025.csv`);
    if (!fs.existsSync(csvPath)) {
      console.error(`Missing school response file: ${csvPath}`);
      continue;
    }
    console.log(`Parsing and seeding: ${csvPath}`);
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    
    const records: any[] = [];
    for (const item of parsed.data as any[]) {
      // Map verbose headers to clean fields
      const reportingMonth = item['Reporting Month'] || `2025-${m === 'July' ? '07' : m === 'August' ? '08' : '09'}`;
      const schoolName = item['What is the name of your school?'];
      const schoolCode = item["What is your school's synthetic school code?"];
      const district = item['What is the name of your district?'];
      const block = item['Block Details'];
      const pblConducted = (item['Was the PBL project conducted in your school this month?'] || '').trim().toLowerCase() === 'yes' ? 1 : 0;
      const evidenceSubmitted = (item['Was evidence submitted for the completed PBL project?'] || '').trim().toLowerCase() === 'yes' ? 1 : 0;
      const classes = item['In which class/classes did you conduct the PBL project?'];
      const subject = item['Which subject do you teach?'];
      
      const enrollment_6 = parseInt(item['Total number of students enrolled in Class 6, including all sections'] || '0', 10);
      const attendance_6_science = parseInt(item['Average student attendance during the Class 6 PBL Science session. If you did not teach Science in Class 6, enter 0.'] || '0', 10);
      const attendance_6_math = parseInt(item['Average student attendance during the Class 6 PBL Math session. If you did not teach Math in Class 6, enter 0.'] || '0', 10);
      
      const enrollment_7 = parseInt(item['Total number of students enrolled in Class 7, including all sections'] || '0', 10);
      const attendance_7_science = parseInt(item['Average student attendance during the Class 7 PBL Science session. If you did not teach Science in Class 7, enter 0.'] || '0', 10);
      const attendance_7_math = parseInt(item['Average student attendance during the Class 7 PBL Math session. If you did not teach Math in Class 7, enter 0.'] || '0', 10);
      
      const enrollment_8 = parseInt(item['Total number of students enrolled in Class 8, including all sections'] || '0', 10);
      const attendance_8_science = parseInt(item['Average student attendance during the Class 8 PBL Science session. If you did not teach Science in Class 8, enter 0.'] || '0', 10);
      const attendance_8_math = parseInt(item['Average student attendance during the Class 8 PBL Math session. If you did not teach Math in Class 8, enter 0.'] || '0', 10);

      const total_enrollment = parseInt(item['Derived: Total enrollment across Classes 6-8'] || '0', 10);
      const total_attendance = parseInt(item['Derived: Total attendance across PBL Science and Math sessions'] || '0', 10);
      const attendance_rate = parseFloat(item['Derived: Overall PBL attendance rate'] || '0');
      const risk_status = item['Derived: Risk status'];

      records.push({
        reportingMonth, schoolName, schoolCode, district, block,
        pblConducted, evidenceSubmitted, classes, subject,
        enrollment_6, attendance_6_science, attendance_6_math,
        enrollment_7, attendance_7_science, attendance_7_math,
        enrollment_8, attendance_8_science, attendance_8_math,
        total_enrollment, total_attendance, attendance_rate, risk_status
      });
    }

    insertTransaction(records);
    console.log(`Seeded ${records.length} records for ${m} 2025.`);
  }

  // 3. Seed Grant Finance CSV
  const financeCsvPath = path.join(process.cwd(), 'csv', '01_Grant_Profile_and_Finance.csv');
  if (fs.existsSync(financeCsvPath)) {
    console.log('Seeding Grant Finance...');
    const csvContent = fs.readFileSync(financeCsvPath, 'utf8');
    const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    
    const insert = db.prepare(`
      INSERT INTO grant_finance (
        grant_id, donor, grant_name, period_start, period_end, covered_districts,
        reporting_month, budget_line, approved_budget, monthly_utilized,
        cumulative_utilized, utilization_rate, finance_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    db.transaction(() => {
      for (const row of parsed.data as any[]) {
        insert.run(
          row.grant_id, row.donor, row.grant_name, row.period_start, row.period_end, row.covered_districts,
          row.reporting_month, row.budget_line, parseInt(row.approved_budget_units || '0', 10),
          parseInt(row.monthly_utilized_units || '0', 10), parseInt(row.cumulative_utilized_units || '0', 10),
          parseFloat(row.cumulative_utilization_rate || '0'), row.finance_note
        );
      }
    })();
    console.log(`Seeded ${(parsed.data as any[]).length} Grant Finance records.`);
  }

  // 4. Seed Grant Performance CSV
  const perfCsvPath = path.join(process.cwd(), 'csv', '02_Grant_Performance_and_Report_Material.csv');
  if (fs.existsSync(perfCsvPath)) {
    console.log('Seeding Grant Performance...');
    const csvContent = fs.readFileSync(perfCsvPath, 'utf8');
    const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    
    const insert = db.prepare(`
      INSERT INTO grant_performance (
        grant_id, donor, grant_name, reporting_month, period_end_date, report_due_date,
        report_status, covered_districts, sampled_school_records, schools_completed_pbl,
        pbl_completion_rate, schools_with_evidence, evidence_submission_rate,
        total_enrollment, total_attendance, attendance_rate, risk_status,
        milestone_summary, draft_report_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      for (const row of parsed.data as any[]) {
        insert.run(
          row.grant_id, row.donor, row.grant_name, row.reporting_month, row.period_end_date, row.report_due_date,
          row.report_status, row.covered_districts, parseInt(row.sampled_school_records || '0', 10),
          parseInt(row.schools_completed_pbl || '0', 10), parseFloat(row.pbl_completion_rate || '0'),
          parseInt(row.schools_with_evidence || '0', 10), parseFloat(row.evidence_submission_rate || '0'),
          parseInt(row.total_enrollment || '0', 10), parseInt(row.total_attendance || '0', 10),
          parseFloat(row.attendance_rate || '0'), row.risk_status, row.milestone_summary, row.draft_report_text
        );
      }
    })();
    console.log(`Seeded ${(parsed.data as any[]).length} Grant Performance records.`);
  }

  // 5. Seed Evidence & Media Index CSV
  const mediaCsvPath = path.join(process.cwd(), 'csv', '03_Evidence_and_Media_Index.csv');
  if (fs.existsSync(mediaCsvPath)) {
    console.log('Seeding Evidence and Media Index...');
    const csvContent = fs.readFileSync(mediaCsvPath, 'utf8');
    const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    
    const insert = db.prepare(`
      INSERT INTO evidence_media (
        record_id, record_type, grant_id, donor, reporting_month,
        district, title, summary_or_caption, file_name, relative_path, usage_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      for (const row of parsed.data as any[]) {
        insert.run(
          row.record_id, row.record_type, row.grant_id, row.donor, row.reporting_month,
          row.district, row.title, row.summary_or_caption, row.file_name, row.relative_path, row.usage_note
        );
      }
    })();
    console.log(`Seeded ${(parsed.data as any[]).length} Evidence and Media Index records.`);
  }

  // 6. Copy static images
  try {
    copyImagesToPublic();
  } catch (e) {
    console.error('Failed to copy images to public/images:', e);
  }

  // Update status in lock table to completed
  db.prepare("UPDATE seeding_status SET status = 'completed' WHERE status = 'seeding'").run();

  console.log('--- Database Seeding Complete ---');
}

function copyImagesToPublic() {
  const srcDir = path.join(process.cwd(), 'images');
  const destDir = path.join(process.cwd(), 'public', 'images');

  if (!fs.existsSync(srcDir)) {
    console.log('Source images directory not found. Skipping image copy.');
    return;
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const files = fs.readdirSync(srcDir);
  let count = 0;
  for (const f of files) {
    const srcFile = path.join(srcDir, f);
    const destFile = path.join(destDir, f);
    if (fs.statSync(srcFile).isFile()) {
      if (!fs.existsSync(destFile)) {
        try {
          fs.copyFileSync(srcFile, destFile);
          count++;
        } catch (copyErr: any) {
          // Ignore EBUSY/EEXIST since another worker might be copying it
          if (copyErr.code !== 'EBUSY' && copyErr.code !== 'EEXIST') {
            throw copyErr;
          }
        }
      }
    }
  }
  console.log(`Copied ${count} images to /public/images`);
}
