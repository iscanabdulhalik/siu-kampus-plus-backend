// Server.js - NestJS uygulamasını çalıştırır
// Port çakışmalarını önlemek için nodemon veya başka bir araç kullanmadan
const { spawn } = require('child_process');
const path = require('path');

// Railway için port'u sabit 8080 olarak ayarla
process.env.PORT = '8080';

// NestJS uygulamasını ayrı bir process olarak başlat
const mainJsPath = path.join(process.cwd(), 'dist/main.js');

// Process başlatma seçeneklerini ayarla
const childProcess = spawn('node', [mainJsPath], {
  stdio: 'inherit', // Stdout ve stderr'i ana process'e ilet
  env: process.env, // Mevcut ortam değişkenlerini aktar
});

// Child process olaylarını dinle
childProcess.on('error', (error) => {
  console.error(`Failed to start NestJS application: ${error.message}`);
  process.exit(1);
});

// Exit sinyalini bekle
process.on('SIGTERM', () => {
  childProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  childProcess.kill('SIGINT');
});

// Child process'in çıkışını dinle
childProcess.on('exit', (code, signal) => {
  process.exit(code || 0);
});
