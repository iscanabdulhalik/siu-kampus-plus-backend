import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS'ı etkinleştirin (gerekirse)
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Sunucu dinleme portu (Vercel için gerekli)
  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`Application is running on: ${await app.getUrl()}`);
}

// Serverless için export edilen işlev
if (process.env.NODE_ENV !== 'production') {
  bootstrap();
}

export default bootstrap;
