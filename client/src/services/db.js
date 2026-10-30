import { openDB } from 'idb';

const DB_NAME = 'civicproof-gis';
const DB_VERSION = 1;

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
          db.createObjectStore('routes', { keyPath: 'id' }); // id = `${startLat},${startLng}->${destId}`
        }
        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'localId' });
        }
      },
    });
  }
  return dbPromise;
}

// Facilities
export async function cacheFacility(facility) {
  const db = await getDB();
  await db.put('facilities', { ...facility, cachedAt: new Date().toISOString() });
}

export async function cacheAllFacilities(facilities) {
  const db = await getDB();
  const tx = db.transaction('facilities', 'readwrite');
  await Promise.all(facilities.map((f) => tx.store.put({ ...f, cachedAt: new Date().toISOString() })));
  await tx.done;
}

export async function getCachedFacility(id) {
  const db = await getDB();
  // Try by id first
  let f = await db.get('facilities', id);
  if (!f) {
    // Try by qr_token
    f = await db.getFromIndex('facilities', 'qr_token', id);
  }
  return f;
}

export async function getCachedFacilities(category) {
  const db = await getDB();
  if (category && category !== 'all') {
    return db.getAllFromIndex('facilities', 'category', category);
  }
  return db.getAll('facilities');
}

// Routes
export async function cacheRoute(routeData) {
  const db = await getDB();
  await db.put('routes', { ...routeData, cachedAt: new Date().toISOString() });
}

export async function getCachedRoute(id) {
  const db = await getDB();
  return db.get('routes', id);
}

// Drafts
export async function saveDraft(draft) {
  const db = await getDB();
  await db.put('drafts', { ...draft, savedAt: new Date().toISOString(), syncStatus: 'pending' });
}

export async function getDrafts() {
  const db = await getDB();
  return db.getAll('drafts');
}

export async function deleteDraft(localId) {
  const db = await getDB();
  await db.delete('drafts', localId);
}

export async function updateDraftStatus(localId, syncStatus) {
  const db = await getDB();
  const draft = await db.get('drafts', localId);
  if (draft) await db.put('drafts', { ...draft, syncStatus });
}
