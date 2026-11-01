import app from '../server/src/app.js';
import { initDB } from '../server/src/db.js';

let isReady = false;

export default async function handler(req, res) {
  if (!isReady) {
    try {
      await initDB();
      isReady = true;
    } catch (e) {
      console.warn('Serverless DB initialization note:', e?.message);
    }
  }
  return app(req, res);
}
