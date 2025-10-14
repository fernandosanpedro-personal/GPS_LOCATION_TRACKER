
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configuración DB (LowDB con JSON)
const adapter = new JSONFile('db.json');
const db = new Low(adapter);

// Función para asegurar que la base está inicializada
async function initDB() {
  await db.read();
  if (!db.data) {
    db.data = { devices: [] }; // ✅ default data
    await db.write();
  }
}

// Inicializar DB antes de arrancar el servidor
initDB();

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket para recibir ubicaciones en tiempo real
io.on('connection', (socket) => {
  socket.on('location', async (data) => {
    await db.read();
    let device = db.data.devices.find(d => d.id === data.id);
    if (!device) {
      device = { id: data.id, name: data.name || data.id, locations: [] };
      db.data.devices.push(device);
    }
    device.locations.push({
      lat: data.lat,
      lng: data.lng,
      timestamp: Date.now()
    });
    await db.write();
    io.emit('location_update', data);
  });
});

// API REST: obtener dispositivo y su historial
app.get('/api/devices', async (req, res) => {
  await db.read();
  res.json(db.data.devices);
});

// Arrancar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port', PORT));
