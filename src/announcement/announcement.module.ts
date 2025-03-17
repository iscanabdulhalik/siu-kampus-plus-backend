import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';

@Module({
  imports: [
    HttpModule,
    CacheModule.register({
      store: redisStore,
      host: 'localhost',
      port: 6379,
      ttl: 60 * 60 * 3, // 3 hours default TTL
      max: 100,
      isGlobal: true,
    }),
  ],
  providers: [AnnouncementService],
  exports: [AnnouncementService],
  controllers: [AnnouncementController],
})
export class AnnouncementModule {}
