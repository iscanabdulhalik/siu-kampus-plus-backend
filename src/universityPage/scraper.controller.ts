// src/scraper/scraper.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ScraperService } from './scraper.service';

@Controller('uni')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Get('duyuru')
  async getNotices() {
    return this.scraperService.scrapeNotices();
  }

  @Get('events')
  async getEvents(
    @Query('url') url: string = 'https://siirt.edu.tr/etkinliktakvimi.html',
  ) {
    return this.scraperService.scrapeEvents(url);
  }

  @Get('news')
  async getNews(@Query('url') url: string = 'https://siirt.edu.tr/') {
    return this.scraperService.scrapeNews(url);
  }
}
