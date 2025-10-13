require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const Database = require('better-sqlite3');
const shortid = require('shortid');

const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'mi-token-demo';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const db = new Database('fleet.db');
db.exec(`
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  name TEXT,
  created_at INTEGER
);
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT,
  lat REAL,
  lng REAL,
  speed REAL,
  ts INTEGER
);
CREATE TABLE IF NOT EXISTS shares (
  token TEXT PRIMARY KEY,
  device_ids TEXT,
  expires_at INTEGER
);
`);

const insertDevice = db.prepare('INSERT OR IGNORE INTO devices (id, name, created_at) VALUES (?, ?, ?)');

io.on('connection', socket => {
  console.log('socket connected', socket.id);
});

app.post('/location', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (!token || token !== AUTH_TOKEN) return res.status(401).send({ error: 'unauthorized' });

  const { deviceId, lat, lng, speed } = req.body;
  if (!deviceId || lat == null || lng == null) return res.status(400).send({ error: 'bad request' });

  insertDevice.run(deviceId, deviceId, Date.now());
  const stmt = db.prepare('INSERT INTO locations (device_id, lat, lng, speed, ts) VALUES (?, ?, ?, ?, ?)');
  stmt.run(deviceId, lat, lng, speed || 0, Date.now());

  const payload = { deviceId, lat, lng, speed: speed || 0, ts: Date.now() };
  io.emit('location:update', payload);

  return res.send({ ok: true });
});

app.get('/devices', (req, res) => {
  const rows = db.prepare(`
    SELECT d.id, d.name, l.lat, l.lng, l.ts
    FROM devices d
    LEFT JOIN (
      SELECT device_id, lat, lng, ts FROM locations
      WHERE id IN (SELECT MAX(id) FROM locations GROUP BY device_id)
    ) l ON d.id = l.device_id
  `).all();
  res.send(rows);
});

app.post('/share', (req, res) => {
  const token = shortid.generate();
  const { deviceIds, ttlMinutes } = req.body;
  const expires_at = Date.now() + (ttlMinutes || 60) * 60 * 1000;
  db.prepare('INSERT INTO shares (token, device_ids, expires_at) VALUES (?, ?, ?)').run(token, JSON.stringify(deviceIds || []), expires_at);
  res.send({ token, url: `${req.protocol}://${req.get('host')}/share/${token}`, expires_at });
});

app.get('/share/:token', (req, res) => {
  const token = req.params.token;
  const row = db.prepare('SELECT token, device_ids, expires_at FROM shares WHERE token = ?').get(token);
  if (!row) return res.status(404).send({ error: 'not found' });
  if (Date.now() > row.expires_at) return res.status(410).send({ error: 'expired' });
  res.send({ deviceIds: JSON.parse(row.device_ids), expires_at: row.expires_at });
});

server.listen(PORT, () => console.log('Server listening on', PORT));
