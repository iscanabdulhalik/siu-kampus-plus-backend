import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as cheerio from 'cheerio';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class AnnouncementService {
  private readonly logger = new Logger(AnnouncementService.name);

  constructor(private readonly httpService: HttpService) {}

  async getAnnouncements(): Promise<any[]> {
    // Duyuruların bulunduğu ana sayfa URL'si
    const targetUrl = 'https://mmf.siirt.edu.tr/';

    try {
      // Ana duyuru sayfasının HTML'ini çekiyoruz
      const response = await lastValueFrom(this.httpService.get(targetUrl));
      const html = response.data;
      const $ = cheerio.load(html);

      // Duyuruların listelendiği alanı seçiyoruz
      const listItems = $('#ctl15_div_duyurulist_ ul li');
      const total = listItems.length;
      const startIndex = total > 10 ? total - 10 : 0;

      const announcements = [];

      for (let i = startIndex; i < total; i++) {
        const li = listItems.eq(i);
        // Her bir duyuru için linki alıyoruz
        const aTag = li.find('div > div:nth-child(2) > span > a');
        const relativeUrl = aTag.attr('href');
        if (!relativeUrl) continue;

        // Relative URL'yi tam URL'ye çeviriyoruz
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
          // Duyurunun detay sayfasını çekiyoruz
          const detailResponse = await lastValueFrom(
            this.httpService.get(fullUrl),
          );
          const detailHtml = detailResponse.data;
          const detail$ = cheerio.load(detailHtml);

          // Title: XPath: //*[@id="ctl15_aktivitebaslik_"]/text()
          title = detail$('#ctl15_aktivitebaslik_').text().trim();
          // İçerik: XPath: //*[@id="ctl15_aktivitedetay_"] içerisindeki tüm text
          contentBody = detail$('#ctl15_aktivitedetay_').text().trim();
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
        });
      }
      return announcements;
    } catch (error) {
      this.logger.error('Ana sayfa alınamadı', error.stack);
      throw error;
    }
  }
}
