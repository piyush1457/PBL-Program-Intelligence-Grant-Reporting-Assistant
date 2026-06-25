import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'm4c_dashboard.db');
const isVercel = process.env.VERCEL === '1';

// Ensure database connection is cached in development to avoid creating too many open connections
let db: Database.Database;

if (isVercel) {
  // Open as read-only on Vercel serverless functions to support read-only filesystem
  db = new Database(DB_PATH, { readonly: true });
} else if (process.env.NODE_ENV === 'production') {
  db = new Database(DB_PATH);
} else {
  // @ts-ignore
  if (!global._sqliteDb) {
    // @ts-ignore
    global._sqliteDb = new Database(DB_PATH);
  }
  // @ts-ignore
  db = global._sqliteDb;
}

// Only enable WAL mode and run seeding if not on Vercel read-only environment
if (!isVercel) {
  // Enable WAL mode for performance
  db.pragma('journal_mode = WAL');

  // Seed the database asynchronously on initial import
  import('./seed').then(({ runSeeding }) => {
    runSeeding();
  }).catch(err => {
    console.error('Failed to run database seeding:', err);
  });
}

export { db };
export default db;
