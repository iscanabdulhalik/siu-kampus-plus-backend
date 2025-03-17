import { Controller, Get, Query } from '@nestjs/common';
import { ScraperService } from './universityPage/scraper.service';
import {
  NoticeDetail,
  NewsDetail,
  EventDetail,
} from './universityPage/interfaces/scraper.interfaces';

@Controller()
export class AppController {
  constructor(private readonly scraperService: ScraperService) {}

  @Get()
  getIndex() {
    return {
      name: 'Siirt University API',
      version: '1.0.0',
      description: "Siirt Üniversitesi veri çekme API'si",
      endpoints: [
        {
          path: '/academic-staff/:department',
          description: 'Akademik personel bilgilerini getirir',
        },
        {
          path: '/announcement/:department',
          description: 'Bölüm duyurularını getirir',
        },
        {
          path: '/duyuru/uni',
          description: 'Üniversite genel duyurularını getirir',
        },
        { path: '/bus-schedule', description: 'Tüm otobüs saatlerini getirir' },
        {
          path: '/bus-schedule/a1',
          description: 'A1 hattı otobüs saatlerini getirir',
        },
        {
          path: '/bus-schedule/a2',
          description: 'A2 hattı otobüs saatlerini getirir',
        },
        { path: '/yemek', description: 'Yemek listesini getirir' },
        {
          path: '/university/notices',
          description: 'Üniversite duyurularını getirir',
        },
        {
          path: '/university/events',
          description: 'Üniversite etkinliklerini getirir',
        },
        {
          path: '/university/news',
          description: 'Üniversite haberlerini getirir',
        },
        {
          path: '/university/clear-cache',
          description: 'Önbelleği temizler',
        },
      ],
    };
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('university/notices')
  async getNotices(): Promise<NoticeDetail[]> {
    return this.scraperService.scrapeNotices();
  }

  @Get('university/events')
  async getEvents(@Query('url') url?: string): Promise<EventDetail[]> {
    // If URL is provided, use it. Otherwise let the service discover the correct URL
    return this.scraperService.scrapeEvents(url || 'https://siirt.edu.tr/');
  }

  @Get('university/news')
  async getNews(
    @Query('url') url: string = 'https://siirt.edu.tr/',
  ): Promise<NewsDetail[]> {
    return this.scraperService.scrapeNews(url);
  }

  @Get('university/clear-cache')
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
