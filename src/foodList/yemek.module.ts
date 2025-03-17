import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { YemekService } from './yemek.service';
import { YemekController } from './yemek.controller';

@Module({
  imports: [
    CacheModule.register({
      store: redisStore,
      host: 'localhost',
      port: 6379,
      ttl: 60 * 60 * 4, // 4 saat (saniye cinsinden)
      max: 100,
      isGlobal: false, // Global yapılandırma istenirse true olarak ayarlayın
    }),
  ],
  providers: [YemekService],
  exports: [YemekService],
  controllers: [YemekController],
})
export class YemekModule {}
