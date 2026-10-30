import { Router } from 'express';
import { getDB } from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Public: list facilities
router.get('/', (req, res) => {
  const db = getDB();
  const { category, status, search } = req.query;
  let sql = 'SELECT id, qr_token, name, name_te, name_hi, category, lat, lng, address, status, operational_status, capacity, description, description_te, description_hi, last_inspected, last_updated, is_verified, data_source FROM facilities WHERE 1=1';
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
    'SELECT id, qr_token, name, name_te, name_hi, category, lat, lng, address, status, operational_status, capacity, description, description_te, description_hi, last_inspected, last_updated, is_verified, data_source FROM facilities WHERE id = ? OR qr_token = ?'
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

export default router;
