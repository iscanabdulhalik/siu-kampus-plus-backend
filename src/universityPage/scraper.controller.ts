import { Controller, Get, Query } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import {
  NoticeDetail,
  NewsDetail,
  EventDetail,
} from './interfaces/scraper.interfaces';

@Controller('university')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Get('notices')
  async getNotices(): Promise<NoticeDetail[]> {
    return this.scraperService.scrapeNotices();
  }

  @Get('events')
  async getEvents(@Query('url') url?: string): Promise<EventDetail[]> {
    // If URL is provided, use it. Otherwise let the service discover the correct URL
    return this.scraperService.scrapeEvents(url || 'https://siirt.edu.tr/');
  }

  @Get('news')
  async getNews(
    @Query('url') url: string = 'https://siirt.edu.tr/',
  ): Promise<NewsDetail[]> {
    return this.scraperService.scrapeNews(url);
  }

  @Get('clear-cache')
  async clearCache(): Promise<{ success: boolean; message: string }> {
    try {
      await this.scraperService.clearCache();
      return { success: true, message: 'Cache cleared successfully' };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear cache: ${error.message}`,
      };
    }
  }
}
