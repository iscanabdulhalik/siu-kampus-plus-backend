import { Injectable, Logger, Inject } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import axios from 'axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface BusSchedule {
  carsKalkisSaati: string;
  universiteKalkis: string;
}

@Injectable()
export class BusScraperService {
  private readonly logger = new Logger(BusScraperService.name);
  private readonly CACHE_TTL = 60 * 60 * 12; // 12 hours in seconds
  private readonly CACHE_KEY_PREFIX = 'bus_schedule:';

  private readonly urls = [
    'https://www.siirt.bel.tr/a1-universite-hatti',
    'https://www.siirt.bel.tr/a-2-universite-hatti',
  ];

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getBusSchedules(): Promise<{ [key: string]: BusSchedule[] }> {
    try {
      // Try to get from cache first
      const cacheKey = `${this.CACHE_KEY_PREFIX}all`;
      const cachedData = await this.cacheManager.get<string>(cacheKey);

      if (cachedData) {
        this.logger.log('Cache hit for all bus schedules');
        return JSON.parse(cachedData);
      }

      this.logger.log('Cache miss for all bus schedules, fetching from source');

      // Prepare promises for all routes
      const scrapePromises = this.urls.map((url) => {
        const routeName = url.split('/').pop() || '';
        return this.scrapeScheduleFromUrl(url).then((data) => ({
          routeName,
          data,
        }));
      });

      // Execute all promises in parallel
      const results = await Promise.allSettled(scrapePromises);

      // Process results
      const schedules = {};
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.data.length > 0) {
          schedules[result.value.routeName] = result.value.data;
        }
      });

      // Cache the result
      await this.cacheManager.set(
        cacheKey,
        JSON.stringify(schedules),
        this.CACHE_TTL * 1000,
      );

      return schedules;
    } catch (error) {
      this.logger.error(
        `Error fetching all bus schedules: ${error.message}`,
        error.stack,
      );
      return {};
    }
  }

  async getBusScheduleByRoute(routeName: string): Promise<BusSchedule[]> {
    try {
      // Try to get from cache first
      const cacheKey = `${this.CACHE_KEY_PREFIX}${routeName}`;
      const cachedData = await this.cacheManager.get<string>(cacheKey);

      if (cachedData) {
        this.logger.log(`Cache hit for ${routeName} bus schedule`);
        return JSON.parse(cachedData);
      }

      this.logger.log(
        `Cache miss for ${routeName} bus schedule, fetching from source`,
      );

      const url = this.urls.find((u) => u.includes(routeName));
      if (!url) {
        throw new Error(`${routeName} için URL bulunamadı`);
      }

      const schedules = await this.scrapeScheduleFromUrl(url);

      // Cache the result
      await this.cacheManager.set(
        cacheKey,
        JSON.stringify(schedules),
        this.CACHE_TTL * 1000,
      );

      return schedules;
    } catch (error) {
      this.logger.error(
        `Error fetching bus schedule for ${routeName}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  private async scrapeScheduleFromUrl(url: string): Promise<BusSchedule[]> {
    try {
      // Check cache for this specific URL
      const cacheKey = `${this.CACHE_KEY_PREFIX}url:${url}`;
      const cachedData = await this.cacheManager.get<string>(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Fetch from source if not cached
      const response = await axios.get(url);
      const dom = new JSDOM(response.data);
      const document = dom.window.document;

      // Find all tables on the page
      const tables = document.querySelectorAll('table');

      if (tables.length === 0) {
        throw new Error('Sayfada tablo bulunamadı');
      }

      // Try to find the table containing the bus schedule
      let scheduleTable = null;

      // Look for tables with headers containing "Çarşı Kalkış" or "Üniversite Kalkış"
      for (let i = 0; i < tables.length; i++) {
        const tableText = tables[i].textContent || '';
        if (
          tableText.includes('Çarşı Kalkış') ||
          tableText.includes('Üniversite Kalkış')
        ) {
          scheduleTable = tables[i];
          break;
        }
      }

      // If no specific table found, use the largest table
      if (!scheduleTable && tables.length > 0) {
        let maxRows = 0;
        for (let i = 0; i < tables.length; i++) {
          const rowCount = tables[i].querySelectorAll('tr').length;
          if (rowCount > maxRows) {
            maxRows = rowCount;
            scheduleTable = tables[i];
          }
        }
      }

      if (!scheduleTable) {
        throw new Error('Otobüs çizelgesi tablosu bulunamadı');
      }

      const schedules: BusSchedule[] = [];
      const rows = scheduleTable.querySelectorAll('tr');

      // Analyze table structure
      let startIndex = 0;

      // Assume first three rows are headers, but verify
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const rowText = rows[i].textContent || '';
        if (
          rowText.includes('Çarşı Kalkış') ||
          rowText.includes('Üniversite Kalkış')
        ) {
          startIndex = i + 1; // Found header row, start with the next row
          break;
        }
      }

      // Process data rows
      for (let i = startIndex; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');

        // Process rows with at least 3 cells
        if (cells.length >= 3) {
          let carsKalkisSaati = '';
          let universiteKalkis = '';

          // Second column is usually "Çarşı Kalkış"
          if (cells.length > 1) {
            const colSpan = parseInt(
              cells[1].getAttribute('colspan') || '1',
              10,
            );
            if (colSpan > 1 && cells[1]) {
              carsKalkisSaati = cells[1].textContent?.trim() || '';
            } else {
              carsKalkisSaati = cells[1].textContent?.trim() || '';
            }
          }

          // Last column is usually "Üniversite Kalkış"
          if (cells.length > 2) {
            universiteKalkis =
              cells[cells.length - 1].textContent?.trim() || '';
          }

          // Add non-empty records
          if (carsKalkisSaati || universiteKalkis) {
            schedules.push({
              carsKalkisSaati,
              universiteKalkis,
            });
          }
        }
      }

      // Cache the results
      await this.cacheManager.set(
        cacheKey,
        JSON.stringify(schedules),
        this.CACHE_TTL * 1000,
      );

      return schedules;
    } catch (error) {
      this.logger.error(
        `Error scraping from ${url}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  // Utility method to clear cache
  async clearCache(routeName?: string): Promise<void> {
    try {
      if (routeName) {
        // Clear specific route cache
        const cacheKey = `${this.CACHE_KEY_PREFIX}${routeName}`;
        await this.cacheManager.del(cacheKey);
        this.logger.log(`Cache cleared for ${routeName} bus schedule`);
      } else {
        // Clear all bus schedule caches
        await this.cacheManager.del(`${this.CACHE_KEY_PREFIX}all`);

        // Also clear individual URL caches
        for (const url of this.urls) {
          const routeName = url.split('/').pop() || '';
          await this.cacheManager.del(`${this.CACHE_KEY_PREFIX}${routeName}`);
          await this.cacheManager.del(`${this.CACHE_KEY_PREFIX}url:${url}`);
        }

        this.logger.log('All bus schedule caches cleared');
      }
    } catch (error) {
      this.logger.error(`Error clearing cache: ${error.message}`, error.stack);
    }
  }
}
