import { Router } from 'express';
import { getDB } from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Public: list facilities
router.get('/', (req, res) => {
  const db = getDB();
  const { category, status, search } = req.query;
  let sql = 'SELECT id, qr_token, name, name_te, name_hi, category, transport_type, lat, lng, address, status, operational_status, capacity, description, description_te, description_hi, last_inspected, last_updated, is_verified, data_source FROM facilities WHERE 1=1';
  const params = [];

  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (search) {
    sql += ' AND (name LIKE ? OR name_te LIKE ? OR address LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q, q);
  }

  sql += ' ORDER BY name';
  res.json(db.prepare(sql).all(...params));
});

// Public: get facility by ID (opaque — uses qr_token for QR scanning)
router.get('/:id', (req, res) => {
  const db = getDB();
  const facility = db.prepare(
    'SELECT id, qr_token, name, name_te, name_hi, category, transport_type, lat, lng, address, status, operational_status, capacity, description, description_te, description_hi, last_inspected, last_updated, is_verified, data_source FROM facilities WHERE id = ? OR qr_token = ?'
  ).get(req.params.id, req.params.id);
  if (!facility) return res.status(404).json({ error: 'Facility not found' });
  res.json(facility);
});

// Protected: update facility status
router.patch('/:id/status', verifyToken, requireRole('admin', 'inspector'), (req, res) => {
  const { operational_status, status } = req.body;
  const db = getDB();
  db.prepare('UPDATE facilities SET operational_status = ?, status = ?, last_updated = datetime(\'now\') WHERE id = ?')
    .run(operational_status, status, req.params.id);
  res.json({ success: true });
});

// Protected: verify facility
router.post('/:id/verify', verifyToken, requireRole('admin', 'inspector'), (req, res) => {
  const db = getDB();
  db.prepare('UPDATE facilities SET is_verified = 1, status = \'verified\', verified_by = ?, last_updated = datetime(\'now\') WHERE id = ?')
    .run(req.user.id, req.params.id);
  res.json({ success: true });
});

// Protected: create new facility (Admin only)
router.post('/', verifyToken, requireRole('admin'), (req, res) => {
  const db = getDB();
  const {
    id,
    qr_token,
    name,
    name_te,
    name_hi,
    category,
    transport_type,
    lat,
    lng,
    address,
    status,
    operational_status,
    capacity,
    description,
    description_te,
    description_hi,
  } = req.body;

  if (!name || lat == null || lng == null || !category) {
    return res.status(400).json({ error: 'Name, category, latitude and longitude are required' });
  }

  const newId = id || crypto.randomUUID();
  const newQr = qr_token || Math.random().toString(36).substring(2, 14);

  try {
    db.prepare(`
      INSERT INTO facilities
        (id, qr_token, name, name_te, name_hi, category, transport_type, lat, lng, address, status, operational_status, capacity, description, description_te, description_hi, data_source, is_verified)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin_created', 1)
    `).run(
      newId,
      newQr,
      name,
      name_te || null,
      name_hi || null,
      category,
      transport_type || null,
      Number(lat),
      Number(lng),
      address || null,
      status || 'verified',
      operational_status || 'operational',
      capacity ? Number(capacity) : 1000,
      description || null,
      description_te || null,
      description_hi || null
    );

    const created = db.prepare('SELECT * FROM facilities WHERE id = ?').get(newId);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Protected: update facility details (Admin only)
router.put('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const db = getDB();
  const {
    name,
    name_te,
    name_hi,
    category,
    transport_type,
    lat,
    lng,
    address,
    status,
    operational_status,
    capacity,
    description,
  } = req.body;

  try {
    db.prepare(`
      UPDATE facilities
      SET name = COALESCE(?, name),
          name_te = COALESCE(?, name_te),
          name_hi = COALESCE(?, name_hi),
          category = COALESCE(?, category),
          transport_type = COALESCE(?, transport_type),
          lat = COALESCE(?, lat),
          lng = COALESCE(?, lng),
          address = COALESCE(?, address),
          status = COALESCE(?, status),
          operational_status = COALESCE(?, operational_status),
          capacity = COALESCE(?, capacity),
          description = COALESCE(?, description),
          last_updated = datetime('now')
      WHERE id = ?
    `).run(
      name,
      name_te,
      name_hi,
      category,
      transport_type,
      lat != null ? Number(lat) : null,
      lng != null ? Number(lng) : null,
      address,
      status,
      operational_status,
      capacity != null ? Number(capacity) : null,
      description,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM facilities WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Protected: delete facility (Admin only)
router.delete('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const db = getDB();
  try {
    db.prepare('DELETE FROM facilities WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Facility deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
