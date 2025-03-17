import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as cheerio from 'cheerio';
import { lastValueFrom } from 'rxjs';
import { DEPARTMENT_URLS, DepartmentKeys } from './departments.config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface Announcement {
  title: string | null;
  url: string;
  content: string | null;
  announcement_date: string | null;
}

@Injectable()
export class AnnouncementService {
  private readonly logger = new Logger(AnnouncementService.name);
  private readonly CACHE_TTL = 60 * 60 * 3; // 3 hours in seconds (announcements change more frequently)
  private readonly CACHE_KEY_PREFIX = 'announcements:';

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getAnnouncements(department: DepartmentKeys): Promise<Announcement[]> {
    try {
      // Try to get data from cache first
      const cacheKey = `${this.CACHE_KEY_PREFIX}${department}`;
      const cachedData = await this.cacheManager.get<string>(cacheKey);

      if (cachedData) {
        this.logger.log(`Cache hit for ${department} announcements`);
        return JSON.parse(cachedData);
      }

      this.logger.log(
        `Cache miss for ${department} announcements, fetching from source`,
      );

      const targetUrl = DEPARTMENT_URLS[department];
      if (!targetUrl) {
        throw new Error(`Bölüm bulunamadı: ${department}`);
      }

      const response = await lastValueFrom(this.httpService.get(targetUrl));
      const html = response.data;
      const $ = cheerio.load(html);
      const listItems = $('#ctl15_div_duyurulist_ ul li');
      const total = listItems.length;
      const startIndex = total > 10 ? total - 10 : 0;

      // Create an array to hold all announcement detail fetch promises
      const announcementPromises = [];

      // Process each list item to get the URL and date
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

          // Add the announcement fetch promise to our array
          announcementPromises.push(
            this.fetchAnnouncementDetail(fullUrl, announcement_date),
          );
        } catch (urlErr) {
          this.logger.error(`Geçersiz URL: ${relativeUrl}`, urlErr.stack);
          continue;
        }
      }

      // Wait for all promises to resolve in parallel
      const announcements = (await Promise.allSettled(announcementPromises))
        .filter(
          (result): result is PromiseFulfilledResult<Announcement | null> =>
            result.status === 'fulfilled' && result.value !== null,
        )
        .map((result) => result.value);

      // Cache the results
      await this.cacheManager.set(
        cacheKey,
        JSON.stringify(announcements),
        this.CACHE_TTL * 1000,
      );

      return announcements;
    } catch (error) {
      this.logger.error(`Ana sayfa alınamadı: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async fetchAnnouncementDetail(
    fullUrl: string,
    announcement_date: string | null,
  ): Promise<Announcement | null> {
    try {
      // Try to get announcement detail from cache first
      const cacheKey = `${this.CACHE_KEY_PREFIX}detail:${fullUrl}`;
      const cachedDetail = await this.cacheManager.get<string>(cacheKey);

      if (cachedDetail) {
        return JSON.parse(cachedDetail);
      }

      // Fetch from source if not in cache
      const detailResponse = await lastValueFrom(this.httpService.get(fullUrl));
      const detailHtml = detailResponse.data;
      const detail$ = cheerio.load(detailHtml);
      const title = detail$('#ctl15_aktivitebaslik_').text().trim();

      // Get full content first
      const fullContent = detail$('#ctl15_aktivitedetay_').text().trim();

      // Limit content to first 250 characters
      const contentBody =
        fullContent.length > 250
          ? fullContent.substring(0, 250) + '...'
          : fullContent;

      const announcement: Announcement = {
        title,
        url: fullUrl,
        content: contentBody,
        announcement_date,
      };

      // Cache the individual announcement
      await this.cacheManager.set(
        cacheKey,
        JSON.stringify(announcement),
        this.CACHE_TTL * 1000,
      );

      return announcement;
    } catch (detailErr) {
      this.logger.error(`Detay sayfası alınamadı: ${fullUrl}`, detailErr.stack);
      return null;
    }
  }

  // Utility method to clear cache
  async clearCache(department?: DepartmentKeys): Promise<void> {
    try {
      if (department) {
        // Clear specific department cache
        const cacheKey = `${this.CACHE_KEY_PREFIX}${department}`;
        await this.cacheManager.del(cacheKey);
        this.logger.log(`Cache cleared for ${department} announcements`);
      } else {
        // Note: cache-manager doesn't provide a direct way to clear by pattern
        this.logger.log(
          'Cache clearing for all announcements is not directly supported with cache-manager',
        );
      }
    } catch (error) {
      this.logger.error(`Error clearing cache: ${error.message}`, error.stack);
    }
  }
}
