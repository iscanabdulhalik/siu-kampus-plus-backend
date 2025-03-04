import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

async function bootstrap() {
  try {
    // .env dosyasını yükle
    dotenv.config();

    const app = await NestFactory.create(AppModule);

    // Global middleware ekleyerek tüm routelar için SECRET_KEY kontrolü yap
    app.use((req, res, next) => {
      const secretKey = process.env.SECRET_KEY;
      const authHeader = req.headers['authorization'];

      if (!authHeader || authHeader !== secretKey) {
        return res.status(401).json({
          statusCode: 401,
          message: 'Unauthorized access',
        });
      }

      next();
    });

    await app.listen(3000);
    Logger.log(`Application is running on port: 3000`);
  } catch (error) {
    Logger.error(`Failed to start application: ${error.message}`, error.stack);
    process.exit(1);
  }
}

bootstrap();
