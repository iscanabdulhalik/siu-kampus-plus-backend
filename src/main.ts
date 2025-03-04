import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

async function bootstrap() {
  try {
    // .env dosyasını yükle
    dotenv.config();

    const app = await NestFactory.create(AppModule);

    // CORS'u etkinleştir
    app.enableCors();

    // Global middleware ekleyerek tüm routelar için SECRET_KEY kontrolü yap
    app.use((req, res, next) => {
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
    const port = process.env.PORT || 3000;

    // Health check endpoint ekle
    app.use('/health', (req, res) => {
      res.status(200).send('OK');
    });

    await app.listen(port);
    Logger.log(`Application is running on port: ${port}`);
  } catch (error) {
    Logger.error(`Failed to start application: ${error.message}`, error.stack);
    process.exit(1);
  }
}

bootstrap();
