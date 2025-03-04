// This file is required for deployment and should match what's expected in config.json
const dotenv = require('dotenv');
dotenv.config();
const { NestFactory } = require('@nestjs/core');
const { Logger } = require('@nestjs/common');
const { AppModule } = require('./dist/app.module');

async function bootstrap() {
  try {
    Logger.log('Server starting...');

    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Enable CORS
    app.enableCors();

    // Auth middleware (bypass for health check)
    app.use((req, res, next) => {
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

    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');
    Logger.log(`Server is running on port: ${port}`);

    // Graceful shutdown
    process.on('SIGTERM', () => {
      Logger.log('SIGTERM received, shutting down gracefully');
      app.close().then(() => {
        Logger.log('Server closed');
      });
    });

    process.on('SIGINT', () => {
      Logger.log('SIGINT received, shutting down gracefully');
      app.close().then(() => {
        Logger.log('Server closed');
      });
    });
  } catch (error) {
    Logger.error(`Failed to start server: ${error.message}`);
    Logger.error(`Stack trace: ${error.stack}`);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  Logger.error('Unhandled error in bootstrap:', err);
  process.exit(1);
});
