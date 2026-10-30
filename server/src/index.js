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
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/facilities', facilitiesRouter);
app.use('/api/qr', qrRouter);
app.use('/api/inspections', inspectionsRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

async function start() {
  await initDB();
  app.listen(PORT, () => console.log(`CivicProof GIS API running on port ${PORT}`));
}

start().catch(console.error);
