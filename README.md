       # Live-location-tracker

       Proyecto: seguimiento en tiempo real de varios dispositivos (furgonetas/móviles).
       Esta versión es un prototipo listo para desplegar en Render o probar localmente.

       ## Contenido
       - `server.js` - backend Node.js + Socket.IO
       - `public/index.html` - frontend con Mapbox GL JS (ver lista y seleccionar dispositivos)
       - `.env.example` - ejemplo de variables de entorno
       - `package.json` - dependencias
       - `fleet.db` - base de datos SQLite (se crea en ejecución)

       ## Requisitos
       - Node.js (LTS)
       - npm
       - Cuenta en Mapbox (para token de mapas)
       - (Opcional) ngrok para exponer localhost durante pruebas

       ## Instrucciones rápidas (local)
       1. Clona o descarga este repositorio.
       2. Copia `.env.example` a `.env` y edita `AUTH_TOKEN` y `PORT` si lo deseas.
       3. Instala dependencias:
          ```bash
          npm install
          ```
       4. Arranca el servidor:
          ```bash
          node server.js
          ```
       5. Abre `http://localhost:3000` en el navegador.
       6. Envia una ubicación de prueba (ejemplo con curl):
          ```bash
          curl -X POST http://localhost:3000/location \
-H "Content-Type: application/json" \
-H "x-auth-token: mi-token-demo" \
-d '{"deviceId":"furgoneta-1","lat":40.4168,"lng":-3.7038,"speed":12}'
          ```

       ## Despliegue en Render
       1. Crea un repo en GitHub y sube estos archivos.
       2. En Render, crea un Web Service y conecta con tu repo GitHub.
       3. En Settings > Environment, añade `AUTH_TOKEN` con valor seguro.
       4. Build command: `npm install`; Start command: `node server.js`.
       5. Deploy y usa la URL pública para configurar OwnTracks/Tasker.

       ## Envío desde móvil (sin programar)
       - **OwnTracks (HTTP mode)** o **Tasker** (Android) pueden enviar POST periódicos a `/location` con la cabecera `x-auth-token`.

       ## Nota de seguridad
       - No subir `.env` ni `fleet.db` a GitHub.
       - Cambia `AUTH_TOKEN` por un token fuerte antes del despliegue.

       ## Siguientes pasos sugeridos
       - Añadir autenticación a la web.
       - Añadir `public/share.html` para ver enlaces públicos.
       - Migrar a PostgreSQL para producción.
