import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    const port = process.env.PORT || 3000;

    // CORS ayarlarını ekleyin
    app.enableCors();

    await app.listen(port, '0.0.0.0');
    Logger.log(`Application is running on port: ${port}`);
  } catch (error) {
    Logger.error(`Failed to start application: ${error.message}`, error.stack);
    process.exit(1);
  }
}
bootstrap();
