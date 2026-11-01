import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import fallbackFacilities from '../../../client/src/data/fallbackFacilities.json' with { type: 'json' };

export function seedFacilities(db) {
  // Seed demo users
  const users = [
    { id: uuidv4(), username: 'admin', password: 'admin123', role: 'admin' },
    { id: uuidv4(), username: 'inspector1', password: 'inspect123', role: 'inspector' },
    { id: uuidv4(), username: 'field1', password: 'field123', role: 'field_staff' },
  ];

  const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)');
  for (const u of users) {
    const hash = bcrypt.hashSync(u.password, 10);
    insertUser.run(u.id, u.username, hash, u.role);
  }

  const insertFacility = db.prepare(`
    INSERT OR REPLACE INTO facilities
      (id, qr_token, name, name_te, name_hi, category, transport_type, lat, lng, address, status, operational_status, capacity, description, description_te, description_hi, data_source, is_verified)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const f of fallbackFacilities) {
    insertFacility.run(
      f.id,
      f.qr_token,
      f.name,
      f.name_te || null,
      f.name_hi || null,
      f.category,
      f.transport_type || null,
      f.lat,
      f.lng,
      f.address || null,
      f.status || 'verified',
      f.operational_status || 'operational',
      f.capacity || 1000,
      f.description || null,
      f.description_te || null,
      f.description_hi || null,
      f.data_source || 'official_gis',
      f.is_verified ?? 1
    );
  }
}
