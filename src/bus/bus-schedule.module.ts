import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { BusScraperService } from './bus-schedule.service';
import { BusController } from './bus-schedule.controller';

@Module({
  imports: [
    CacheModule.register({
      store: redisStore,
      host: 'localhost',
      port: 6379,
      ttl: 60 * 60 * 12, // 12 hours in seconds
      max: 100,
      isGlobal: false, // Set to true if you want this cache to be global
    }),
  ],
  providers: [BusScraperService],
  exports: [BusScraperService],
  controllers: [BusController],
})
export class BusModule {}
