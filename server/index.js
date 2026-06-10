import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../data');
const uploadsDir = path.join(dataDir, 'uploads');
mkdirSync(dataDir, { recursive: true });
mkdirSync(uploadsDir, { recursive: true });

const db = new Database(path.join(dataDir, 'amax.sqlite'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const defaultUsers = [
  {
    id: 'usr-001',
    username: 'admin',
    password: 'admin888',
    displayName: '管理员',
    email: 'admin@amax.lab',
    role: 'super_admin',
    avatar: 'A',
    permissions: [
      'dashboard', 'models', 'isos', 'software', 'audit', 'admin'
    ].map((module) => ({ module, canView: true, canCreate: true, canEdit: true, canDelete: true })),
    createdAt: '2024-01-01',
    status: 'active',
  },
];

const getStmt = db.prepare('SELECT value FROM kv_store WHERE key = ?');
const setStmt = db.prepare(`
  INSERT INTO kv_store (key, value, updated_at)
  VALUES (?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
`);

function readJson(key, fallback = null) {
  const row = getStmt.get(key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  setStmt.run(key, JSON.stringify(value));
}

if (!readJson('users')) {
  writeJson('users', defaultUsers);
}

const app = express();
const port = Number(process.env.API_PORT || 3201);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

function sanitizeFileName(name) {
  return String(name || 'firmware.bin')
    .replace(/[\\/]/g, '_')
    .replace(/[^a-zA-Z0-9._()\-\u4e00-\u9fa5]/g, '_')
    .slice(0, 180);
}

function normalizeOriginalFileName(name) {
  if (!name) return '';
  return String(name).replace(/[\\/]/g, '_').slice(0, 240);
}

app.post('/api/uploads/firmware', async (req, res) => {
  const originalName = normalizeOriginalFileName(req.query.name) || 'firmware.bin';
  const safeName = sanitizeFileName(originalName);
  const prefix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const storedName = `${prefix}-${safeName}`;
  const targetPath = path.join(uploadsDir, storedName);
  const md5 = createHash('md5');
  let size = 0;
  let completed = false;

  const output = createWriteStream(targetPath);

  req.on('data', (chunk) => {
    size += chunk.length;
    md5.update(chunk);
  });

  req.on('aborted', () => {
    if (completed) return;
    output.destroy();
    unlink(targetPath).catch(() => {});
  });

  output.on('error', (error) => {
    if (!res.headersSent) {
      res.status(500).json({ error: 'write upload file failed' });
    }
    req.destroy(error);
  });

  output.on('finish', () => {
    completed = true;
    res.json({
      originalName,
      storedName,
      size,
      md5: md5.digest('hex'),
      downloadUrl: `/api/uploads/firmware/${encodeURIComponent(storedName)}`,
    });
  });

  req.pipe(output);
});

app.get('/api/uploads/firmware/:storedName', (req, res) => {
  const storedName = sanitizeFileName(req.params.storedName);
  const originalName = normalizeOriginalFileName(req.query.name) || storedName.replace(/^\d+-[a-z0-9]+-/, '') || storedName;
  res.download(path.join(uploadsDir, storedName), originalName, (error) => {
    if (error && !res.headersSent) {
      res.status(404).json({ error: 'file not found' });
    }
  });
});

app.delete('/api/uploads/firmware/:storedName', async (req, res) => {
  const storedName = sanitizeFileName(req.params.storedName);
  if (!storedName) {
    res.status(400).json({ error: 'missing file name' });
    return;
  }
  try {
    await unlink(path.join(uploadsDir, storedName));
    res.json({ ok: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      res.json({ ok: true, missing: true });
      return;
    }
    res.status(500).json({ error: 'delete file failed' });
  }
});

app.get('/api/data', (_req, res) => {
  res.json(readJson('app-data'));
});

app.put('/api/data', (req, res) => {
  writeJson('app-data', req.body);
  res.json({ ok: true });
});

app.get('/api/users', (_req, res) => {
  res.json(readJson('users', defaultUsers));
});

app.put('/api/users', (req, res) => {
  if (!Array.isArray(req.body)) {
    res.status(400).json({ error: 'users payload must be an array' });
    return;
  }
  writeJson('users', req.body);
  res.json({ ok: true });
});

app.use(express.static(path.resolve(__dirname, '../dist')));
app.use((_req, res) => {
  res.sendFile(path.resolve(__dirname, '../dist/index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`API server listening on http://0.0.0.0:${port}`);
  console.log(`SQLite database: ${path.join(dataDir, 'amax.sqlite')}`);
});
