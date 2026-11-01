
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB } from './db.js';
import facilitiesRouter from './routes/facilities.js';
import qrRouter from './routes/qr.js';
import authRouter from './routes/auth.js';
import inspectionsRouter from './routes/inspections.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

let initPromise;

app.use(async (req, res, next) => {
  try {
    if (!initPromise) {
      initPromise = initDB().catch((error) => {
        initPromise = null;
        throw error;
      });
    }

    await initPromise;
    next();
  } catch (error) {
    console.error('Database initialization failed:', error);
    res.status(500).json({ error: 'Database initialization failed' });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/facilities', facilitiesRouter);
app.use('/api/qr', qrRouter);
app.use('/api/inspections', inspectionsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
