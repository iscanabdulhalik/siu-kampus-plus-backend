// Server.js - NestJS uygulamasını çalıştırır
// Port çakışmalarını önlemek için nodemon veya başka bir araç kullanmadan
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting server via server.js entrypoint');
console.log(`Current working directory: ${process.cwd()}`);
console.log(`PORT: ${process.env.PORT || '3000'}`);

// NestJS uygulamasını ayrı bir process olarak başlat
const mainJsPath = path.join(process.cwd(), 'dist/main.js');
console.log(`Attempting to start NestJS application at: ${mainJsPath}`);

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
  console.log('SIGTERM received, shutting down gracefully');
  childProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  childProcess.kill('SIGINT');
});

// Child process'in çıkışını dinle
childProcess.on('exit', (code, signal) => {
  console.log(
    `NestJS application exited with code ${code} and signal ${signal}`,
  );
  process.exit(code || 0);
});
