import { openDB } from 'idb';

const DB_NAME = 'civicproof-gis';
const DB_VERSION = 2;

let dbPromise;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('facilities')) {
          const store = db.createObjectStore('facilities', { keyPath: 'id' });
          store.createIndex('qr_token', 'qr_token', { unique: true });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('cachedAt', 'cachedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains('routes')) {
          db.createObjectStore('routes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'localId' });
        }
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'username' });
        }
      },
    });
  }
  return dbPromise;
}

// Facilities Cache
export async function cacheFacility(facility) {
  if (!facility || !facility.id) return;
  const db = await getDB();
  await db.put('facilities', { ...facility, cachedAt: new Date().toISOString() });
}

export async function cacheAllFacilities(facilities) {
  if (!Array.isArray(facilities) || facilities.length === 0) return;
  const db = await getDB();
  const tx = db.transaction('facilities', 'readwrite');
  await Promise.all(
    facilities
      .filter((f) => f && f.id)
      .map((f) => tx.store.put({ ...f, cachedAt: new Date().toISOString() }))
  );
  await tx.done;
}

export async function getCachedFacility(idOrToken) {
  if (!idOrToken) return null;
  const db = await getDB();
  let f = await db.get('facilities', idOrToken);
  if (!f) {
    try {
      f = await db.getFromIndex('facilities', 'qr_token', idOrToken);
    } catch {}
  }
  return f || null;
}

export async function getCachedFacilities(category) {
  const db = await getDB();
  if (category && category !== 'all') {
    return db.getAllFromIndex('facilities', 'category', category);
  }
  return db.getAll('facilities');
}

// Offline Inspection Drafts
export async function saveDraft(draft) {
  const db = await getDB();
  await db.put('drafts', {
    ...draft,
    status: draft.status || 'pending',
    savedAt: new Date().toISOString(),
  });
}

export async function getDrafts() {
  const db = await getDB();
  return db.getAll('drafts');
}

export async function updateDraftStatus(localId, status, error = null) {
  const db = await getDB();
  const draft = await db.get('drafts', localId);
  if (draft) {
    draft.status = status;
    if (error) draft.error = error;
    await db.put('drafts', draft);
  }
}

export async function deleteDraft(localId) {
  const db = await getDB();
  await db.delete('drafts', localId);
}

// User Accounts Database
export async function saveUserToDatabase(userAccount) {
  if (!userAccount || !userAccount.username) return;
  const db = await getDB();
  await db.put('users', {
    ...userAccount,
    updatedAt: new Date().toISOString(),
  });

  // Also persist in localStorage backup
  try {
    const raw = localStorage.getItem('civicproof_users_db');
    const existing = raw ? JSON.parse(raw) : {};
    existing[userAccount.username.toLowerCase()] = userAccount;
    localStorage.setItem('civicproof_users_db', JSON.stringify(existing));
  } catch {}
}

export async function getUserFromDatabase(username) {
  if (!username) return null;
  const normalized = username.trim().toLowerCase();
  
  // 1. Check IndexedDB
  try {
    const db = await getDB();
    const u = await db.get('users', normalized);
    if (u) return u;
  } catch {}

  // 2. Check localStorage backup
  try {
    const raw = localStorage.getItem('civicproof_users_db');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed[normalized]) return parsed[normalized];
    }
  } catch {}

  return null;
}

export async function getAllUsersFromDatabase() {
  const list = [];
  try {
    const db = await getDB();
    const idbUsers = await db.getAll('users');
    list.push(...idbUsers);
  } catch {}

  try {
    const raw = localStorage.getItem('civicproof_users_db');
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.values(parsed).forEach((u) => {
        if (!list.some((existing) => existing.username === u.username)) {
          list.push(u);
        }
      });
    }
  } catch {}

  return list;
}
