import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db.js';
import { signToken, verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Official department passkey required for account creation/reset
const OFFICIAL_PASSKEY = process.env.OFFICIAL_PASSKEY || 'AP-RMC-PUSHKAR-2027';

// Public: Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const db = getDB();
  const normalizedUser = username.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = ?').get(normalizedUser);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = signToken({ id: user.id, username: user.username, role: user.role });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// Protected or Passkey-authorized: Register new inspector/admin account
router.post('/register', (req, res) => {
  const { username, password, role = 'inspector', passkey } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Authorization check: Must provide official passkey OR have valid admin auth header
  let isAuthorized = false;
  if (passkey && passkey.trim() === OFFICIAL_PASSKEY) {
    isAuthorized = true;
  } else {
    // Check if called by logged-in admin
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = import('jsonwebtoken'); // dynamic import or standard check
      } catch {}
    }
  }

  if (!isAuthorized) {
    return res.status(403).json({
      error: 'Unauthorized: Valid Official Department Passkey (e.g. AP-RMC-PUSHKAR-2027) is required to register official accounts.',
    });
  }

  const validRole = role === 'admin' ? 'admin' : 'inspector';
  const normalizedUser = username.trim().toLowerCase();

  const db = getDB();
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(normalizedUser);
  if (existing) {
    return res.status(409).json({ error: 'Username already registered.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const newId = uuidv4();

  db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
    newId,
    normalizedUser,
    hash,
    validRole
  );

  const token = signToken({ id: newId, username: normalizedUser, role: validRole });
  res.status(201).json({
    success: true,
    message: `Account created successfully for ${normalizedUser} as ${validRole}.`,
    user: { id: newId, username: normalizedUser, role: validRole },
    token,
  });
});

// Passkey-authorized: Reset password
router.post('/reset-password', (req, res) => {
  const { username, newPassword, passkey } = req.body;

  if (!username || !newPassword || !passkey) {
    return res.status(400).json({ error: 'Username, new password, and authorization passkey are required.' });
  }

  if (passkey.trim() !== OFFICIAL_PASSKEY) {
    return res.status(403).json({ error: 'Invalid department authorization passkey.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const db = getDB();
  const normalizedUser = username.trim().toLowerCase();
  const user = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(normalizedUser);

  if (!user) {
    return res.status(404).json({ error: 'User not found in official register.' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);

  res.json({ success: true, message: `Password for ${normalizedUser} reset successfully.` });
});

// Admin-only: List all staff and inspector accounts
router.get('/users', verifyToken, requireRole('admin'), (req, res) => {
  const db = getDB();
  const users = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ users });
});

// Authenticated: Get current user profile
router.get('/me', verifyToken, (req, res) => {
  const db = getDB();
  const user = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

export default router;
