import express from 'express';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// Necesario para __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar Express
const app = express();
const server = createServer(app);
const io = new Server(server);

// Middleware para JSON
app.use(express.json());

// Servir archivos estáticos desde /public
import { join } from 'path';
app.use(express.static(join(__dirname, 'public')));

// Configuración de LowDB
const adapter = new JSONFile('db.json');
const db = new Low(adapter, { devices: [] });

await db.read();

// API: obtener dispositivos
app.get('/api/devices', (req, res) => {
  res.json(db.data.devices);
});

// Endpoint para recibir posiciones (OwnTracks o similar)
app.post('/api/update-location', async (req, res) => {
  const { deviceId, lat, lng } = req.body;

  if (!deviceId || !lat || !lng) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  const device = db.data.devices.find(d => d.deviceId === deviceId);

  if (device) {
    device.lat = lat;
    device.lng = lng;
    device.history.push({ lat, lng, time: Date.now() });
  } else {
    db.data.devices.push({
      deviceId,
      lat,
      lng,
      history: [{ lat, lng, time: Date.now() }]
    });
  }

  await db.write();

  // Enviar actualización a todos los clientes
  io.emit('locationUpdate', { deviceId, lat, lng });

  res.json({ success: true });
});

// WebSocket conexión
io.on('connection', (socket) => {
  console.log('Cliente conectado');
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
