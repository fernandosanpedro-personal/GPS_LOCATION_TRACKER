const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ✅ LowDB v5 con JSONFile y datos por defecto
const adapter = new JSONFile('db.json');
const db = new Low(adapter, { devices: [] });

async function initDB() {
  await db.read();
  if (!db.data) {
    db.data = { devices: [] };
    await db.write();
  }
}

initDB();

// ✅ middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ WebSocket: recibir ubicación
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

    // reenviar a todos los clientes
    io.emit('location_update', data);
  });
});

// ✅ API: todos los dispositivos
app.get('/api/devices', async (req, res) => {
  await db.read();
  res.json(db.data.devices);
});

// ✅ ¡IMPORTANTE! Render inyecta PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
