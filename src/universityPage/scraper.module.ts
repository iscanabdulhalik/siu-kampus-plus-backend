import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // 10 seconds timeout for HTTP requests
      maxRedirects: 5, // Maximum redirects to follow
    }),
    CacheModule.register({
      store: redisStore,
      host: 'localhost',
      port: 6379,
      ttl: 60 * 60 * 2, // 2 hours in seconds
      max: 200, // Increased max items for scraper service
      isGlobal: false,
    }),
  ],
  providers: [ScraperService],
  controllers: [ScraperController],
  exports: [ScraperService],
})
export class ScraperModule {}
