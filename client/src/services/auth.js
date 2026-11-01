/**
 * auth.js — Official Authentication & Credentials Management
 *
 * Supports:
 * - Creating & updating custom Admin and Inspector credentials in the persistent database
 * - Validating logins against official database records
 * - Rejecting unvalidated logins
 * - Role-based authorization for administrative and inspection tools
 */

import { authAPI } from './api.js';
import { saveUserToDatabase, getUserFromDatabase, getAllUsersFromDatabase } from './db.js';

// Pre-seeded default official credentials
const DEFAULT_ACCOUNTS = [
  { username: 'admin', password: 'admin123', role: 'admin', label: 'Admin (Full GIS & QR Management)' },
  { username: 'inspector1', password: 'inspect123', role: 'inspector', label: 'Field Inspector (Sanitation & Ghat Verification)' },
  { username: 'field1', password: 'field123', role: 'field_staff', label: 'Field Staff' },
];

// Initialize default accounts into database if not already present
export async function initDefaultAccounts() {
  for (const acc of DEFAULT_ACCOUNTS) {
    const existing = await getUserFromDatabase(acc.username);
    if (!existing) {
      await saveUserToDatabase({
        username: acc.username.toLowerCase(),
        password: acc.password,
        role: acc.role,
        label: acc.label,
        createdAt: new Date().toISOString(),
      });
    }
  }
}

// Immediately ensure defaults are seeded
initDefaultAccounts().catch(console.warn);

/**
 * Register or update official credentials in the database
 */
export async function createOfficialCredentials(username, password, role) {
  if (!username || !password) {
    throw new Error('Username and password are required.');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const normalizedUser = username.trim().toLowerCase();
  const validRole = role === 'admin' ? 'admin' : 'inspector';

  const userRecord = {
    username: normalizedUser,
    password: password.trim(),
    role: validRole,
    label: validRole === 'admin' ? 'Official Admin' : 'Official Inspector',
    updatedAt: new Date().toISOString(),
  };

  // 1. Save locally in persistent database (IndexedDB + localStorage)
  await saveUserToDatabase(userRecord);

  // 2. Also attempt backend registration if server is online
  try {
    if (navigator.onLine) {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: normalizedUser, password: password.trim(), role: validRole }),
      });
    }
  } catch {}

  return {
    success: true,
    user: { username: normalizedUser, role: validRole },
    message: `Official ${validRole.toUpperCase()} credentials successfully saved in database.`,
  };
}

/**
 * Authenticate and validate login
 */
export async function authenticateLogin(username, password) {
  if (!username || !password) {
    throw new Error('Please enter both username and password.');
  }

  const normalizedUser = username.trim().toLowerCase();
  const cleanPass = password.trim();

  // 1. First, check persistent database (IndexedDB / localStorage)
  const dbUser = await getUserFromDatabase(normalizedUser);

  if (dbUser && dbUser.password === cleanPass) {
    const sessionToken = `local_token_${btoa(normalizedUser + ':' + Date.now())}`;
    return {
      user: {
        id: dbUser.id || `usr_${normalizedUser}`,
        username: normalizedUser,
        role: dbUser.role || 'inspector',
      },
      token: sessionToken,
    };
  }

  // 2. Next, try remote server login API if online
  if (navigator.onLine) {
    try {
      const res = await authAPI.login(normalizedUser, cleanPass);
      if (res && res.user && res.token) {
        // Sync to local database
        await saveUserToDatabase({
          username: res.user.username.toLowerCase(),
          password: cleanPass,
          role: res.user.role,
        });
        return res;
      }
    } catch (err) {
      if (err.response?.status === 401) {
        throw new Error('Invalid username or password. Check your credentials.');
      }
    }
  }

  // 3. Fallback check against default demo accounts in case DB is newly initialized
  const defaultMatch = DEFAULT_ACCOUNTS.find(
    (a) => a.username.toLowerCase() === normalizedUser && a.password === cleanPass
  );

  if (defaultMatch) {
    await saveUserToDatabase({
      username: defaultMatch.username.toLowerCase(),
      password: defaultMatch.password,
      role: defaultMatch.role,
    });
    return {
      user: {
        id: `usr_${defaultMatch.username}`,
        username: defaultMatch.username,
        role: defaultMatch.role,
      },
      token: `local_token_${btoa(defaultMatch.username + ':' + Date.now())}`,
    };
  }

  throw new Error('Invalid username or password. Only validated official logins can access this feature.');
}
