import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

async function bootstrap() {
  try {
    // Load .env file
    dotenv.config();

    // Başlangıç bilgilerini logla
    Logger.log(
      `Starting application in ${process.env.NODE_ENV || 'development'} environment`,
    );
    Logger.log(`Current directory: ${process.cwd()}`);
    Logger.log(`PORT: ${process.env.PORT || 3000}`);

    // Create NestJS application with verbose logging
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Enable CORS
    app.enableCors();

    // Log incoming requests (debugging için)
    app.use((req, res, next) => {
      Logger.log(`Incoming request: ${req.method} ${req.url}`);
      next();
    });

    // Auth middleware (health check hariç)
    app.use((req, res, next) => {
      // Health check için auth bypass
      if (req.url === '/health') {
        Logger.log('Health check request received, bypassing auth');
        return next();
      }

      const secretKey = process.env.SECRET_KEY;
      const authHeader = req.headers['authorization'];

      if (!secretKey) {
        Logger.warn('SECRET_KEY environment variable is not set!');
      }

      if (!authHeader || authHeader !== secretKey) {
        Logger.warn(`Unauthorized access attempt: ${req.url}`);
        return res.status(401).json({
          statusCode: 401,
          message: 'Unauthorized access',
        });
      }

      next();
    });

    // Start NestJS application
    const port = process.env.PORT || 3000;
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
