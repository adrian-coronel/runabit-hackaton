import('open').then((open) => open.default('http://localhost:3000'));


const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');

const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const isWindows = os.platform() === 'win32';

// === Servir archivos estáticos desde la carpeta 'public' ===
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de puerto según sistema operativo
let portConfig;
if (isWindows) {
  portConfig = {
    path: 'COM3',  // Cambia esto al puerto correcto en tu Windows
    baudRate: 115200,
  };
  console.log('🖥️ Sistema Windows detectado, usando puerto:', portConfig.path);
} else {
  portConfig = {
    path: '/dev/ttyACM0',
    baudRate: 115200,
  };
  console.log('🐧 Sistema Linux detectado, usando puerto:', portConfig.path);
}

// Abrir puerto serial con manejo de errores
let port;
try {
  port = new SerialPort(portConfig);
  
  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
  
  port.on('open', () => {
    console.log('Arduino OK');
  });
  
  port.on('error', (err) => {
    console.error('Error en puerto serial:', err.message);
  });
  
  parser.on('data', (data) => {
    console.log(`Arduino dice: ${data.trim()}`);
    io.emit('arduino-data', data.trim()); 
  });
} catch (err) {
  console.error('No se pudo abrir el puerto serial:', err.message);
  // Crear un puerto simulado para pruebas
  port = {
    write: (msg, callback) => {
      console.log('SIMULADO - Enviado al Arduino:', msg);
      if (callback) callback();
    }
  };
}

// Socket.io con navegador
io.on('connection', (socket) => {
  console.log('🧠 Cliente web conectado');

  socket.on('lenvantarceja', (msg) => {
    console.log('📝 Mensaje del cliente:', msg);
    port.write(msg + '\n', (err) => {
      if (err) {
        console.error('❌ Error al escribir en serial:', err.message);
      } else {
        console.log('📤 Enviado al Arduino:', msg);
      }
    });
  });
});

// === Iniciar servidor web ===
server.listen(3000, () => {
  console.log('🌐 Servidor web abierto en http://localhost:3000');
});
