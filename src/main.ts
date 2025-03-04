import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

async function bootstrap() {
  try {
    // .env dosyasını yükle
    dotenv.config();

    // Log başlangıç bilgisi
    Logger.log('Starting application initialization...');

    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'], // Tam loglama aktif
    });

    Logger.log('Application instance created successfully');

    // CORS'u etkinleştir
    app.enableCors();
    Logger.log('CORS enabled');

    // Health check endpoint ekle (Express middleware olarak)
    app.use('/health', (req, res) => {
      Logger.log('Health check endpoint called');
      res.status(200).send('OK');
    });

    // Global middleware ekleyerek tüm routelar için SECRET_KEY kontrolü yap
    app.use((req, res, next) => {
      // Health check endpoint için auth bypass
      if (req.url === '/health') {
        return next();
      }

      const secretKey = process.env.SECRET_KEY;
      const authHeader = req.headers['authorization'];

      if (!secretKey) {
        Logger.warn('SECRET_KEY environment variable is not set!');
      }

      if (!authHeader || authHeader !== secretKey) {
        return res.status(401).json({
          statusCode: 401,
          message: 'Unauthorized access',
        });
      }

      next();
    });

    // Railway tarafından sağlanan PORT değişkenini kullan
    const port = parseInt(process.env.PORT) || 3000;
    Logger.log(`Configured to use port: ${port}`);

    // Uygulama başlatma
    await app.listen(port, '0.0.0.0');
    Logger.log(`Application is running on port: ${port}`);
  } catch (error) {
    Logger.error(`Failed to start application: ${error.message}`);
    Logger.error(`Stack trace: ${error.stack}`);
    process.exit(1);
  }
}

bootstrap();
