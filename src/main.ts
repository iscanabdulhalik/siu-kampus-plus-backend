import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

async function bootstrap() {
  try {
    // .env dosyasını yükle
    dotenv.config();

    // Başlangıç bilgilerini logla
    Logger.log(
      `Starting application in ${process.env.NODE_ENV || 'development'} environment`,
    );
    Logger.log(`Current directory: ${process.cwd()}`);
    Logger.log(`PORT: ${process.env.PORT || '3000'}`);
    Logger.log(`SECRET_KEY set: ${process.env.SECRET_KEY ? 'YES' : 'NO'}`); // Ekleyin - SECRET_KEY tanımlı mı?

    // NestJS uygulamasını oluştur
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug'],
    });

    // CORS'u etkinleştir
    app.enableCors();

    // Gelen istekleri logla
    app.use((req, res, next) => {
      Logger.log(`Incoming request: ${req.method} ${req.url}`);

      // Header bilgilerini logla (değeri göstermeden)
      Logger.log(
        `Authorization header present: ${req.headers['authorization'] ? 'YES' : 'NO'}`,
      );

      next();
    });

    // Health check için auth bypass
    app.use((req, res, next) => {
      if (req.url === '/health') {
        Logger.log('Health check request received');
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

      // Authorization header format kontrolü ve düzeltme
      if (!authHeader) {
        Logger.warn(`Missing authorization header: ${req.url}`);
        return res.status(401).json({
          statusCode: 401,
          message: 'Unauthorized access - missing auth header',
        });
      }

      // Bearer token formatını temizle
      if (authHeader.startsWith('Bearer ')) {
        authHeader = authHeader.slice(7);
      }

      // Değerleri logla (sadece geliştirme aşamasında kullanın, production'da kaldırın)
      if (process.env.NODE_ENV !== 'production') {
        Logger.log(
          `Auth check: ${authHeader === secretKey ? 'MATCH' : 'NO MATCH'}`,
        );
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

    // Railway tarafından atanan portu kullan
    const port = parseInt(process.env.PORT || '8080', 10);
    Logger.log(`Trying to start application on port: ${port}`);
    await app.listen(port, '0.0.0.0');
    Logger.log(`Application is running on port: ${port}`);
    Logger.log(
      `Health check should be available at: http://localhost:${port}/health`,
    );

    // Graceful shutdown
    process.on('SIGTERM', () => {
      Logger.log('SIGTERM received, shutting down gracefully');
      app.close().then(() => {
        Logger.log('Application closed');
      });
    });

    process.on('SIGINT', () => {
      Logger.log('SIGINT received, shutting down gracefully');
      app.close().then(() => {
        Logger.log('Application closed');
      });
    });
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
