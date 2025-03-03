// src/scraper/scraper.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ScraperService } from './scraper.service';

@Controller('duyuru')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Get('uni')
  async getNotices() {
    return this.scraperService.scrapeNotices();
  }
}
