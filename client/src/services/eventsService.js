import defaultEvents from '../data/pushkaraluEvents.json';

const STORAGE_KEY = 'pushkaram_admin_events';

/**
 * Returns merged events: base events combined with admin additions, edits, and deletions.
 */
export function getStoredEvents() {
  const base = defaultEvents || [];
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return base;
    const adminEvents = JSON.parse(raw);
    if (!Array.isArray(adminEvents)) return base;

    const adminMap = new Map(adminEvents.map((e) => [e.id, e]));

    // Update or filter out deleted base events
    const merged = base
      .filter((e) => {
        const override = adminMap.get(e.id);
        return !(override && override._deleted);
      })
      .map((e) => adminMap.get(e.id) || e);

    // Append newly created admin events not present in base
    const baseIds = new Set(base.map((e) => e.id));
    for (const ae of adminEvents) {
      if (!baseIds.has(ae.id) && !ae._deleted) {
        merged.push(ae);
      }
    }

    return merged;
  } catch (err) {
    console.error('Failed reading events storage:', err);
    return base;
  }
}

/**
 * Adds or updates an event in admin storage.
 */
export function saveEvent(eventData) {
  const allEvents = getStoredEvents();
  let adminEvents = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) adminEvents = JSON.parse(raw) || [];
  } catch {}

  const isNew = !eventData.id;
  const eventId = isNew ? `evt-custom-${Date.now()}` : eventData.id;

  const updatedRecord = {
    ...eventData,
    id: eventId,
    status: eventData.status || 'verified',
    updated_at: new Date().toISOString(),
  };

  const existingIdx = adminEvents.findIndex((e) => e.id === eventId);
  if (existingIdx >= 0) {
    adminEvents[existingIdx] = updatedRecord;
  } else {
    adminEvents.push(updatedRecord);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(adminEvents));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('pushkaram_events_updated'));
  }

  return getStoredEvents();
}

/**
 * Deletes an event. If it's a base event, marks it as _deleted.
 */
export function deleteEvent(eventId) {
  let adminEvents = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) adminEvents = JSON.parse(raw) || [];
  } catch {}

  const base = defaultEvents || [];
  const isBaseEvent = base.some((e) => e.id === eventId);

  if (isBaseEvent) {
    const existingIdx = adminEvents.findIndex((e) => e.id === eventId);
    if (existingIdx >= 0) {
      adminEvents[existingIdx]._deleted = true;
    } else {
      adminEvents.push({ id: eventId, _deleted: true });
    }
  } else {
    adminEvents = adminEvents.filter((e) => e.id !== eventId);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(adminEvents));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('pushkaram_events_updated'));
  }

  return getStoredEvents();
}

/**
 * Resets all events back to the default pushkaraluEvents.json data.
 */
export function resetEventsToDefault() {
  localStorage.removeItem(STORAGE_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('pushkaram_events_updated'));
  }
  return defaultEvents || [];
}
