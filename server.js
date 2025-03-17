// Server.js - Bellek optimizasyonu yapılmış NestJS başlatıcı
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

// Çevre değişkenlerini ayarla
process.env.PORT = '8080';
// NodeJS bellek limitleri için
process.env.NODE_OPTIONS = '--max-old-space-size=1536'; // 1.5GB bellek limiti

// Başlangıç bellek durumunu logla
console.log('Uygulama başlatılıyor...');
console.log('Node.js sürümü:', process.version);
console.log('Bellek limiti:', process.env.NODE_OPTIONS);

const startMemory = process.memoryUsage();
console.log('Başlangıç bellek kullanımı:', {
  rss: `${Math.round(startMemory.rss / 1024 / 1024)} MB`,
  heapTotal: `${Math.round(startMemory.heapTotal / 1024 / 1024)} MB`,
  heapUsed: `${Math.round(startMemory.heapUsed / 1024 / 1024)} MB`,
});

console.log('Sistem bellek:', {
  totalMem: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
  freeMem: `${Math.round(os.freemem() / 1024 / 1024)} MB`,
});

// NestJS uygulamasını başlat
const mainJsPath = path.join(process.cwd(), 'dist/main.js');
console.log(`NestJS uygulaması başlatılıyor: ${mainJsPath}`);

// Önceki child process'ler için temizleme yapabilmek için flag
let shuttingDown = false;
let childProcess = null;

// Process başlatma fonksiyonu - yeniden başlatma için kullanılabilir
function startChildProcess() {
  // Eğer kapatma işlemi başladıysa, yeni process başlatma
  if (shuttingDown) return null;

  // Önceki child process varsa ve hala çalışıyorsa, sonlandır
  if (childProcess) {
    try {
      childProcess.kill('SIGTERM');
    } catch (e) {
      console.error('Önceki process sonlandırılamadı:', e.message);
    }
  }

  // Yeni process başlat - bellek limitini artır
  const child = spawn('node', [mainJsPath], {
    stdio: 'inherit',
    env: process.env,
  });

  console.log('Child process başlatıldı, PID:', child.pid);

  // Child process hata dinleyicisi
  child.on('error', (error) => {
    console.error(`Child process başlatma hatası: ${error.message}`);

    // Bekle ve yeniden başlat
    if (!shuttingDown) {
      console.log('5 saniye içinde yeniden başlatılacak...');
      setTimeout(() => {
        childProcess = startChildProcess();
      }, 5000);
    }
  });

  // Process çıkış dinleyicisi
  child.on('exit', (code, signal) => {
    console.log(`Child process sonlandı, kod: ${code}, sinyal: ${signal}`);

    // Hata kodu ile çıkış yaptıysa ve kapanma sinyali verilmediyse, yeniden başlat
    if (!shuttingDown && code !== 0) {
      console.log('Anormal sonlanma, 5 saniye içinde yeniden başlatılacak...');
      setTimeout(() => {
        childProcess = startChildProcess();
      }, 5000);
    } else if (shuttingDown) {
      console.log('Ana süreç de kapatılıyor...');
      process.exit(code || 0);
    }
  });

  return child;
}

// İlk process başlatma
childProcess = startChildProcess();

// Düzenli bellek durumu kontrol fonksiyonu
function checkMemoryUsage() {
  const memUsage = process.memoryUsage();
  const usedMemoryMB = Math.round(memUsage.rss / 1024 / 1024);
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const freeSystemMemMB = Math.round(os.freemem() / 1024 / 1024);

  console.log(
    `Bellek durumu: RSS=${usedMemoryMB}MB, Heap=${heapUsedMB}MB, System Free=${freeSystemMemMB}MB`,
  );

  // Bellek kullanımı çok yüksekse, yeniden başlat
  // Railway veya benzeri ortamlarda bellek limiti genellikle 512MB-1GB arasındadır
  const memoryThresholdMB = 1300; // 1.3GB'dan yüksek bellek kullanımında yeniden başlat

  if (usedMemoryMB > memoryThresholdMB) {
    console.warn(
      `Bellek kullanımı çok yüksek (${usedMemoryMB}MB), uygulama yeniden başlatılıyor...`,
    );

    // Child process'i yeniden başlat
    if (childProcess && !shuttingDown) {
      childProcess.kill('SIGTERM');
      setTimeout(() => {
        childProcess = startChildProcess();
      }, 5000);
    }
  }
}

// Her 5 dakikada bir bellek durumunu kontrol et
const memoryCheckInterval = setInterval(checkMemoryUsage, 5 * 60 * 1000);

// Kapatma işlemleri - SIGTERM
process.on('SIGTERM', () => {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log('SIGTERM alındı, tüm süreçler kapatılıyor...');
  clearInterval(memoryCheckInterval);

  if (childProcess) {
    childProcess.kill('SIGTERM');
  }

  // Eğer child process 5 saniye içinde kapanmazsa zorla kapat
  setTimeout(() => {
    console.log('Kapatma zaman aşımı, zorla kapatılıyor...');
    process.exit(0);
  }, 5000);
});

// Kapatma işlemleri - SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log('SIGINT alındı, tüm süreçler kapatılıyor...');
  clearInterval(memoryCheckInterval);

  if (childProcess) {
    childProcess.kill('SIGINT');
  }

  setTimeout(() => {
    console.log('Kapatma zaman aşımı, zorla kapatılıyor...');
    process.exit(0);
  }, 5000);
});

// Yakalanmayan hatalar için
process.on('uncaughtException', (error) => {
  console.error('Ana süreçte yakalanmayan hata:', error);

  if (!shuttingDown) {
    // Kritik bir hata ise yeniden başlat
    if (childProcess) {
      childProcess.kill('SIGTERM');

      setTimeout(() => {
        childProcess = startChildProcess();
      }, 5000);
    }
  }
});

console.log('Ana süreç başlatıldı, uygulama çalışıyor...');
