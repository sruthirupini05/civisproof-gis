import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedFacilities } from './data/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../civicproof.db');

let db;

export function getDB() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export async function initDB() {
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'pilgrim',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS facilities (
      id TEXT PRIMARY KEY,
      qr_token TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      name_te TEXT,
      name_hi TEXT,
      category TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      address TEXT,
      status TEXT DEFAULT 'reported',
      operational_status TEXT DEFAULT 'unknown',
      capacity INTEGER,
      description TEXT,
      description_te TEXT,
      description_hi TEXT,
      last_inspected TEXT,
      last_updated TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      verified_by TEXT,
      data_source TEXT DEFAULT 'synthetic',
      is_verified INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS inspections (
      id TEXT PRIMARY KEY,
      facility_id TEXT NOT NULL,
      inspector_id TEXT NOT NULL,
      status TEXT NOT NULL,
      findings TEXT,
      corrective_action TEXT,
      evidence_urls TEXT,
      submitted_at TEXT DEFAULT (datetime('now')),
      sync_status TEXT DEFAULT 'synced',
      FOREIGN KEY (facility_id) REFERENCES facilities(id)
    );

    CREATE TABLE IF NOT EXISTS defects (
      id TEXT PRIMARY KEY,
      facility_id TEXT NOT NULL,
      inspection_id TEXT,
      description TEXT NOT NULL,
      severity TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      reported_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT,
      FOREIGN KEY (facility_id) REFERENCES facilities(id)
    );
  `);

  // Seed if empty
  const countRow = db.prepare('SELECT COUNT(*) as c FROM facilities').get();
  if (!countRow || countRow.c === 0) {
    seedFacilities(db);
    console.log('Database seeded with demo facilities.');
  }

  console.log('Database initialized at', DB_PATH);
}
