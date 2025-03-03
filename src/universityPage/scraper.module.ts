// src/scraper/scraper.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';

@Module({
  imports: [HttpModule],
  controllers: [ScraperController],
  providers: [ScraperService],
})
export class ScraperModule {}
