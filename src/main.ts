import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

// Bellek yönetimi için yardımcı fonksiyon
function logMemoryUsage() {
  const memUsage = process.memoryUsage();
  return {
    rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`, // Resident Set Size
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`, // V8 bellek tahsisi
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`, // Kullanılan V8 belleği
    external: `${Math.round(memUsage.external / 1024 / 1024)} MB`, // C++ nesneleri belleği
  };
}

// Global hata yakalama için yardımcı
function setupGlobalErrorHandlers() {
  process.on('uncaughtException', (error) => {
    Logger.error(`Uncaught Exception: ${error.message}`, error.stack);
    // Anında çıkış yapmayın, sadece log alın
  });

  process.on('unhandledRejection', (reason, promise) => {
    Logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    // Anında çıkış yapmayın, sadece log alın
  });
}

// Bellek temizliğini zorlayan fonksiyon
function forceGarbageCollection() {
  if (global.gc) {
    const beforeMemory = process.memoryUsage();
    global.gc();
    const afterMemory = process.memoryUsage();

    Logger.log(
      `Bellek temizliği yapıldı: Öncesi ${Math.round(beforeMemory.heapUsed / 1024 / 1024)}MB, Sonrası ${Math.round(afterMemory.heapUsed / 1024 / 1024)}MB`,
    );
  } else {
    Logger.warn(
      'Manuel çöp toplama kullanılamıyor. Node.js --expose-gc ile başlatılmadı.',
    );
  }
}

// Uygulama sonlandırma işleyicisi
async function gracefulShutdown(app, signal) {
  Logger.log(`${signal} sinyali alındı, uygulama kapatılıyor...`);

  try {
    // Bellek kullanımını logla
    Logger.log(
      `Kapatma sırasında bellek durumu: ${JSON.stringify(logMemoryUsage())}`,
    );

    // JSDOM nesnelerini temizlemeye çalış
    if (global.gc) {
      global.gc();
      Logger.log('Çöp toplayıcı çalıştırıldı');
    }

    // Uygulama kapatma
    await app.close();
    Logger.log('Uygulama temiz bir şekilde kapatıldı');
    process.exit(0);
  } catch (error) {
    Logger.error(`Uygulama kapatma hatası: ${error.message}`, error.stack);
    process.exit(1);
  }
}

async function bootstrap() {
  try {
    // Başlangıç bellek durumunu logla
    Logger.log(`Başlangıç bellek durumu: ${JSON.stringify(logMemoryUsage())}`);

    // Global hata yakalayıcıları kur
    setupGlobalErrorHandlers();

    // Load .env file
    dotenv.config();

    // Log startup information
    Logger.log(
      `Starting application in ${process.env.NODE_ENV || 'development'} environment`,
    );
    Logger.log(`Current directory: ${process.cwd()}`);
    Logger.log(`PORT: ${process.env.PORT || '3000'}`);
    Logger.log(`SECRET_KEY set: ${process.env.SECRET_KEY ? 'YES' : 'NO'}`);

    // Create NestJS application
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug'],
      bodyParser: true, // Ensure bodyParser is enabled
    });

    // Enable CORS
    app.enableCors();

    // Log incoming requests
    app.use((req, res, next) => {
      // Sağlık kontrolleri için loglama eklemeyelim
      if (req.url !== '/health') {
        Logger.log(`Incoming request: ${req.method} ${req.url}`);
        Logger.log(
          `Authorization header present: ${req.headers['authorization'] ? 'YES' : 'NO'}`,
        );
      }
      next();
    });

    // Authorization middleware with health check bypass
    app.use((req, res, next) => {
      if (req.url === '/health') {
        return next();
      }

      const secretKey = process.env.SECRET_KEY;
      let authHeader = req.headers['authorization'];

      if (!secretKey) {
        Logger.warn('SECRET_KEY environment variable is not set!');
        return res.status(500).json({
          statusCode: 500,
          message: 'Server configuration error - contact administrator',
        });
      }

      // Check for missing authorization header
      if (!authHeader) {
        Logger.warn(`Missing authorization header: ${req.url}`);
        return res.status(401).json({
          statusCode: 401,
          message: 'Unauthorized access - missing auth header',
        });
      }

      // Clean Bearer token format
      if (authHeader.startsWith('Bearer ')) {
        authHeader = authHeader.slice(7);
      }

      if (authHeader !== secretKey) {
        Logger.warn(`Unauthorized access attempt: ${req.url}`);
        return res.status(401).json({
          statusCode: 401,
          message: 'Unauthorized access - invalid credentials',
        });
      }

      next();
    });

    // Periyodik çöp toplama zamanlaması kur
    // Her 15 dakikada bir
    // Not: Çöp toplama performans etkisi yapabilir
    setInterval(
      () => {
        forceGarbageCollection();
      },
      15 * 60 * 1000,
    );

    // Bellek durumu raporlaması
    setInterval(
      () => {
        Logger.log(
          `Çalışma anı bellek durumu: ${JSON.stringify(logMemoryUsage())}`,
        );
      },
      10 * 60 * 1000,
    ); // Her 10 dakikada bir

    // Use port assigned by Railway
    const port = parseInt(process.env.PORT || '8080', 10);
    Logger.log(`Trying to start application on port: ${port}`);
    await app.listen(port, '0.0.0.0');
    Logger.log(`Application is running on port: ${port}`);
    Logger.log(
      `Health check should be available at: http://localhost:${port}/health`,
    );

    // Graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown(app, 'SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown(app, 'SIGINT'));
  } catch (error) {
    Logger.error(`Failed to start application: ${error.message}`);
    Logger.error(`Stack trace: ${error.stack}`);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  Logger.error('Unhandled error in bootstrap:', err);
  process.exit(1);
});
