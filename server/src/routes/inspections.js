import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// List inspections (admin/inspector)
router.get('/', verifyToken, requireRole('admin', 'inspector'), (req, res) => {
  const db = getDB();
  const { facility_id } = req.query;
  let sql = `SELECT i.*, f.name as facility_name, f.category, u.username as inspector_name
             FROM inspections i
             JOIN facilities f ON i.facility_id = f.id
             JOIN users u ON i.inspector_id = u.id
             WHERE 1=1`;
  const params = [];
  if (facility_id) { sql += ' AND i.facility_id = ?'; params.push(facility_id); }
  sql += ' ORDER BY i.submitted_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// Submit inspection (inspector+)
router.post('/', verifyToken, requireRole('admin', 'inspector', 'field_staff'), (req, res) => {
  const { facility_id, status, findings, corrective_action, evidence_urls, defects } = req.body;
  if (!facility_id || !status) return res.status(400).json({ error: 'facility_id and status required' });

  const db = getDB();
  const id = uuidv4();
  db.prepare(`INSERT INTO inspections (id, facility_id, inspector_id, status, findings, corrective_action, evidence_urls)
              VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, facility_id, req.user.id, status, findings, corrective_action, JSON.stringify(evidence_urls || []));

  // Update facility last_inspected
  db.prepare('UPDATE facilities SET last_inspected = datetime(\'now\'), last_updated = datetime(\'now\') WHERE id = ?')
    .run(facility_id);

  // Insert defects if any
  if (defects && defects.length > 0) {
    const insertDefect = db.prepare('INSERT INTO defects (id, facility_id, inspection_id, description, severity) VALUES (?, ?, ?, ?, ?)');
    for (const d of defects) {
      insertDefect.run(uuidv4(), facility_id, id, d.description, d.severity || 'medium');
    }
  }

  res.status(201).json({ id, success: true });
});

// Get inspection by ID
router.get('/:id', verifyToken, requireRole('admin', 'inspector'), (req, res) => {
  const db = getDB();
  const inspection = db.prepare('SELECT * FROM inspections WHERE id = ?').get(req.params.id);
  if (!inspection) return res.status(404).json({ error: 'Not found' });
  res.json(inspection);
});

// Attention queue: facilities needing inspection
router.get('/queue/attention', verifyToken, requireRole('admin', 'inspector'), (req, res) => {
  const db = getDB();
  const facilities = db.prepare(`
    SELECT f.id, f.name, f.category, f.status, f.operational_status, f.last_inspected, f.last_updated,
           COUNT(d.id) as open_defects
    FROM facilities f
    LEFT JOIN defects d ON d.facility_id = f.id AND d.status = 'open'
    WHERE f.status = 'reported'
       OR f.operational_status = 'unknown'
       OR f.last_inspected IS NULL
       OR date(f.last_inspected) < date('now', '-7 days')
    GROUP BY f.id
    ORDER BY open_defects DESC, f.last_inspected ASC
  `).all();
  res.json(facilities);
});

export default router;
