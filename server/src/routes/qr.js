import { Router } from 'express';
import QRCode from 'qrcode';
import { getDB } from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();
const BASE_URL = process.env.BASE_URL || 'https://civisproof-gis.vercel.app';

// Public: resolve QR token to facility (non-sensitive fields only)
router.get('/resolve/:token', (req, res) => {
  const db = getDB();
  const facility = db.prepare(
    'SELECT id, qr_token, name, name_te, name_hi, category, lat, lng, address, status, operational_status, description, description_te, description_hi, last_inspected, last_updated, is_verified, data_source FROM facilities WHERE qr_token = ?'
  ).get(req.params.token);
  if (!facility) return res.status(404).json({ error: 'QR code not found or invalid' });
  res.json(facility);
});

// Protected: generate QR code image for a facility
router.get('/generate/:facilityId', verifyToken, requireRole('admin', 'inspector'), async (req, res) => {
  const db = getDB();
  const facility = db.prepare('SELECT id, qr_token, name FROM facilities WHERE id = ?').get(req.params.facilityId);
  if (!facility) return res.status(404).json({ error: 'Facility not found' });

  const url = `${BASE_URL}/facility/${facility.qr_token}`;
  const png = await QRCode.toBuffer(url, { width: 400, margin: 2, color: { dark: '#1e3a5f', light: '#ffffff' } });
  res.set('Content-Type', 'image/png');
  res.set('Content-Disposition', `attachment; filename="qr-${facility.qr_token}.png"`);
  res.send(png);
});

// Public: get all QR codes summary (for admin download list)
router.get('/list', verifyToken, requireRole('admin'), (req, res) => {
  const db = getDB();
  const facilities = db.prepare('SELECT id, qr_token, name, category FROM facilities ORDER BY category, name').all();
  res.json(facilities.map(f => ({ ...f, qr_url: `${BASE_URL}/facility/${f.qr_token}` })));
});

export default router;
