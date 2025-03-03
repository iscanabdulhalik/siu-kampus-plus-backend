import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as cheerio from 'cheerio';
import { lastValueFrom } from 'rxjs';
import { DEPARTMENT_URLS, DepartmentKeys } from './departments.config';

@Injectable()
export class AnnouncementService {
  private readonly logger = new Logger(AnnouncementService.name);

  constructor(private readonly httpService: HttpService) {}

  async getAnnouncements(department: DepartmentKeys): Promise<any[]> {
    const targetUrl = DEPARTMENT_URLS[department];
    if (!targetUrl) {
      throw new Error(`Bölüm bulunamadı: ${department}`);
    }

    try {
      const response = await lastValueFrom(this.httpService.get(targetUrl));
      const html = response.data;
      const $ = cheerio.load(html);
      const listItems = $('#ctl15_div_duyurulist_ ul li');
      const total = listItems.length;
      const startIndex = total > 10 ? total - 10 : 0;
      const announcements = [];

      for (let i = startIndex; i < total; i++) {
        const li = listItems.eq(i);
        const aTag = li.find('div > div:nth-child(2) > span > a');
        const relativeUrl = aTag.attr('href');
        if (!relativeUrl) continue;

        // Extract announcement date from the first div > span
        const dateSpan = li.find('div > div:nth-child(1) span').text().trim();

        // Format date to add space between day and month (e.g., "28Şubat" -> "28 Şubat")
        let announcement_date = null;
        if (dateSpan) {
          // Find the position where the number ends and text begins
          const match = dateSpan.match(/(\d+)([A-Za-zşŞçÇöÖüÜğĞıİ]+)/);
          if (match && match.length >= 3) {
            announcement_date = `${match[1]} ${match[2]}`;
          } else {
            announcement_date = dateSpan;
          }
        }

        let fullUrl: string;
        try {
          fullUrl = new URL(relativeUrl, targetUrl).href;
        } catch (urlErr) {
          this.logger.error(`Geçersiz URL: ${relativeUrl}`, urlErr.stack);
          continue;
        }

        let title = null;
        let contentBody = null;

        try {
          const detailResponse = await lastValueFrom(
            this.httpService.get(fullUrl),
          );
          const detailHtml = detailResponse.data;
          const detail$ = cheerio.load(detailHtml);
          title = detail$('#ctl15_aktivitebaslik_').text().trim();

          // Get full content first
          const fullContent = detail$('#ctl15_aktivitedetay_').text().trim();

          // Limit content to first 250 characters
          contentBody =
            fullContent.length > 250
              ? fullContent.substring(0, 250) + '...'
              : fullContent;
        } catch (detailErr) {
          this.logger.error(
            `Detay sayfası alınamadı: ${fullUrl}`,
            detailErr.stack,
          );
        }

        announcements.push({
          title,
          url: fullUrl,
          content: contentBody,
          announcement_date,
        });
      }
      return announcements;
    } catch (error) {
      this.logger.error('Ana sayfa alınamadı', error.stack);
      throw error;
    }
  }
}
