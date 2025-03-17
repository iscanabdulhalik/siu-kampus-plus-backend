import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { JSDOM } from 'jsdom';
import {
  DEPARTMENT_URLS,
  DepartmentKeys,
} from '../announcement/departments.config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface AcademicStaffMember {
  name: string;
  title: string;
  branch: string;
  email: string;
  phone: string;
  detailPageUrl: string;
}

@Injectable()
export class AcademicStaffService {
  private readonly logger = new Logger(AcademicStaffService.name);
  private readonly CACHE_TTL = 60 * 60 * 24; // 24 hours in seconds
  private readonly CACHE_KEY_PREFIX = 'academic_staff:';

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getAcademicStaff(
    department: DepartmentKeys,
  ): Promise<AcademicStaffMember[]> {
    try {
      // Try to get data from cache first
      const cacheKey = `${this.CACHE_KEY_PREFIX}${department}`;
      const cachedData = await this.cacheManager.get<string>(cacheKey);

      if (cachedData) {
        this.logger.log(`Cache hit for ${department} academic staff`);
        return JSON.parse(cachedData);
      }

      this.logger.log(
        `Cache miss for ${department} academic staff, fetching from source`,
      );

      const baseUrl = DEPARTMENT_URLS[department];
      if (!baseUrl) {
        throw new Error(`Bölüm bulunamadı: ${department}`);
      }

      // Akademik personel sayfasının URL'sini oluştur
      const targetUrl = `${baseUrl}personel/akademik/739614.html`;

      const response = await lastValueFrom(this.httpService.get(targetUrl));
      const html = response.data;
      const dom = new JSDOM(html);
      const document = dom.window.document;

      const staffList = document.querySelector('#ctl15_div_personlist_2 > ul');

      if (!staffList) {
        this.logger.warn(
          `${department} bölümü için akademik personel listesi bulunamadı`,
        );
        return [];
      }

      const staffItems = staffList.querySelectorAll('li');
      const staffDetailPromises = [];

      // Collect promises for all staff detail fetches
      for (const staffItem of staffItems) {
        const linkElement = staffItem.querySelector('div a');
        if (!linkElement) continue;

        const relativeDetailUrl = linkElement.getAttribute('href');
        if (!relativeDetailUrl) continue;

        const detailPageUrl = new URL(relativeDetailUrl, baseUrl).href;
        staffDetailPromises.push(this.fetchStaffDetail(detailPageUrl, baseUrl));
      }

      // Wait for all promises to resolve in parallel
      const staffMembers = (await Promise.allSettled(staffDetailPromises))
        .filter(
          (
            result,
          ): result is PromiseFulfilledResult<AcademicStaffMember | null> =>
            result.status === 'fulfilled' && result.value !== null,
        )
        .map((result) => result.value);

      // Cache the result
      await this.cacheManager.set(
        cacheKey,
        JSON.stringify(staffMembers),
        this.CACHE_TTL * 1000,
      );

      return staffMembers;
    } catch (error) {
      this.logger.error(
        `Akademik personel listesi alınırken hata oluştu: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  private async fetchStaffDetail(
    detailPageUrl: string,
    baseUrl: string,
  ): Promise<AcademicStaffMember | null> {
    try {
      // Try to get staff detail from cache first
      const cacheKey = `${this.CACHE_KEY_PREFIX}detail:${detailPageUrl}`;
      const cachedDetail = await this.cacheManager.get<string>(cacheKey);

      if (cachedDetail) {
        return JSON.parse(cachedDetail);
      }

      // Fetch from source if not in cache
      const staffDetailResponse = await lastValueFrom(
        this.httpService.get(detailPageUrl),
      );
      const staffDetailHtml = staffDetailResponse.data;
      const staffDetailDom = new JSDOM(staffDetailHtml);
      const staffDetailDocument = staffDetailDom.window.document;

      // İsmi al
      const nameElement =
        staffDetailDocument.querySelector('#ctl11_h2_kisiad_');
      const name = nameElement ? nameElement.textContent?.trim() : '';

      if (!name) return null;

      // Ünvanı al
      const titleElement = staffDetailDocument.querySelector(
        '#ctl11_div_gorev_ table tr:first-child td:nth-child(2) b',
      );
      const title = titleElement ? titleElement.textContent?.trim() : '';

      // Branşı al
      const branchElement =
        staffDetailDocument.querySelector('#ctl11_span_abd_');
      const branch = branchElement ? branchElement.textContent?.trim() : '';

      // E-postayı al
      const emailElement = staffDetailDocument.querySelector(
        '#ctl11_span_mailkurumsal_',
      );
      let email = '';
      if (
        emailElement &&
        emailElement.firstChild &&
        emailElement.firstChild.nodeType === 3
      ) {
        // Text node
        email = emailElement.firstChild.textContent?.trim() || '';
      } else if (emailElement) {
        email = emailElement.textContent?.trim() || '';
      }

      // Telefon numarasını al
      const phoneElement = staffDetailDocument.querySelector(
        '#ctl11_span_telefon_',
      );
      const phone = phoneElement ? phoneElement.textContent?.trim() : '';

      const staffMember = {
        name,
        title: title || '',
        branch: branch || '',
        email: email || '',
        phone: phone || '',
        detailPageUrl,
      };

      // Cache individual staff detail
      await this.cacheManager.set(
        cacheKey,
        JSON.stringify(staffMember),
        this.CACHE_TTL * 1000,
      );

      return staffMember;
    } catch (detailError) {
      this.logger.error(
        `Personel detay sayfası alınırken hata oluştu (${detailPageUrl}): ${detailError.message}`,
        detailError.stack,
      );
      return null;
    }
  }

  // Utility method to clear cache (useful for admin endpoints or scheduled tasks)
  async clearCache(department?: DepartmentKeys): Promise<void> {
    try {
      if (department) {
        // Clear specific department cache
        const cacheKey = `${this.CACHE_KEY_PREFIX}${department}`;
        await this.cacheManager.del(cacheKey);
        this.logger.log(`Cache cleared for ${department}`);
      } else {
        // Note: cache-manager doesn't provide a direct way to clear by pattern
        // You would need to maintain a list of keys or reset the entire cache
        // This is a limitation compared to direct Redis implementation
        this.logger.log(
          'Cache clearing for all departments not implemented with cache-manager',
        );
      }
    } catch (error) {
      this.logger.error(`Error clearing cache: ${error.message}`, error.stack);
    }
  }
}
