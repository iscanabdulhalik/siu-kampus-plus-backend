import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { JSDOM } from 'jsdom';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  BaseNotice,
  NoticeDetail,
  NewsDetail,
  EventDetail,
} from './interfaces/scraper.interfaces';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly NOTICES_CACHE_KEY = 'scraper:notices';
  private readonly EVENTS_CACHE_KEY = 'scraper:events';
  private readonly NEWS_CACHE_KEY = 'scraper:news';
  private readonly CACHE_TTL = 60 * 60 * 2; // 2 hours in seconds

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async scrapeNotices(): Promise<NoticeDetail[]> {
    try {
      // Try to get data from cache first
      const cachedData = await this.cacheManager.get<string>(
        this.NOTICES_CACHE_KEY,
      );

      if (cachedData) {
        this.logger.log('Cache hit for notices');
        return JSON.parse(cachedData);
      }

      this.logger.log('Cache miss for notices, fetching from source');

      const url = 'https://siirt.edu.tr/';
      const response = await firstValueFrom(this.httpService.get(url));
      const dom = new JSDOM(response.data);
      const document = dom.window.document;

      const noticeElements = document.querySelectorAll(
        '#ctl14_div_duyurulist1_ > div',
      );

      const notices: BaseNotice[] = [];

      noticeElements.forEach((noticeDiv) => {
        // Get date container for this notice
        const dateContainer = noticeDiv.querySelector('div:first-child');

        // Get link element
        const linkElement = noticeDiv.querySelector('.duyuruanadiv.label a');
        const href = linkElement?.getAttribute('href');

        // Extract all text from the date container, normalize spaces to have just one space between words
        let date = '';
        if (dateContainer) {
          // First replace all whitespace with a single space, then trim
          date = dateContainer.textContent?.replace(/\s+/g, ' ').trim() || '';
        }

        if (href && href.endsWith('.html')) {
          notices.push({
            link: href.startsWith('http') ? href : `${url}${href}`,
            date,
          });
        }
      });

      // Create an array of promises for notice details, including cache checks
      const detailPromises = notices.map((notice) =>
        this.getNoticeDetailWithCache(notice.link, notice.date),
      );

      // Execute all promises in parallel
      const noticeDetails = await Promise.all(detailPromises);

      // Cache the final results
      await this.cacheManager.set(
        this.NOTICES_CACHE_KEY,
        JSON.stringify(noticeDetails),
        this.CACHE_TTL * 1000,
      );

      return noticeDetails;
    } catch (error) {
      this.logger.error(
        `Error scraping notices: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  private async getNoticeDetailWithCache(
    link: string,
    date: string,
  ): Promise<NoticeDetail> {
    try {
      // Generate a cache key for this specific notice detail
      const cacheKey = `scraper:notice:${this.hashUrl(link)}`;
      const cachedDetail = await this.cacheManager.get<string>(cacheKey);

      if (cachedDetail) {
        return JSON.parse(cachedDetail);
      }

      const detail = await this.scrapeNoticeDetail(link, date);

      // Cache the individual notice detail
      await this.cacheManager.set(
        cacheKey,
        JSON.stringify(detail),
        this.CACHE_TTL * 1000,
      );

      return detail;
    } catch (error) {
      this.logger.error(
        `Error getting notice detail for ${link}: ${error.message}`,
        error.stack,
      );
      return { link, title: '', content: [], announcement_date: date };
    }
  }

  async scrapeNoticeDetail(link: string, date: string): Promise<NoticeDetail> {
    try {
      const response = await firstValueFrom(this.httpService.get(link));
      const dom = new JSDOM(response.data);
      const document = dom.window.document;

      const title =
        document.querySelector('#ctl14_aktivitebaslik_')?.textContent?.trim() ||
        '';
      const contentElement = document.querySelector('#ctl14_aktivitedetay_');
      const content = this.extractContent(contentElement);

      return { link, title, content, announcement_date: date };
    } catch (error) {
      this.logger.error(
        `Error scraping notice detail for ${link}: ${error.message}`,
        error.stack,
      );
      return { link, title: '', content: [], announcement_date: date };
    }
  }

  private extractContent(element: Element | null): string[] {
    if (!element) return [];

    const content: string[] = [];

    // Tüm text node'larını topla
    const walkNodes = (node: Node): void => {
      if (node.nodeType === node.TEXT_NODE) {
        // Remove newlines and other whitespace characters
        const text = node.textContent?.trim().replace(/[\n\r\t]/g, ' ');
        if (text) content.push(text);
      }

      node.childNodes.forEach((child) => walkNodes(child));
    };

    walkNodes(element);

    // Join all text into a single string, limit to 250 characters and add ellipsis
    const fullText = content.filter(Boolean).join(' ');
    const truncatedText =
      fullText.length > 250 ? fullText.slice(0, 250) + '...' : fullText;

    return [truncatedText];
  }

  async scrapeEvents(url: string): Promise<EventDetail[]> {
    try {
      // Try to get data from cache first
      const cacheKey = `${this.EVENTS_CACHE_KEY}:${this.hashUrl(url)}`;
      const cachedData = await this.cacheManager.get<string>(cacheKey);

      if (cachedData) {
        this.logger.log(`Cache hit for events from ${url}`);
        return JSON.parse(cachedData);
      }

      this.logger.log(
        `Cache miss for events from ${url}, fetching from source`,
      );

      const response = await firstValueFrom(this.httpService.get(url));
      const dom = new JSDOM(response.data);
      const document = dom.window.document;

      // Event container'ı bulalım
      const eventContainer = document.querySelector('#ctl14_div_alt_etkinlik');

      if (!eventContainer) {
        this.logger.warn(
          `Event container #ctl14_div_alt_etkinlik not found on page: ${url}`,
        );
        return [];
      }

      // Tüm event div'lerini bulalım (birinci seviye alt div'ler)
      const eventDivs = eventContainer.querySelectorAll(':scope > div');
      const events: EventDetail[] = [];

      // Her bir event div'ini işleyelim
      eventDivs.forEach((eventDiv, index) => {
        // Link elementini bul
        const linkElement = eventDiv.querySelector('a');
        const href = linkElement?.getAttribute('href');

        if (!href) return; // Link yoksa atla

        // FIX: XPath ifadesi ile aynı sonucu verecek şekilde div içindeki span elementine erişip
        // doğrudan içeriğinin 2. indeksini (DOM yapısı, içindeki metin içeriği değil) tarih olarak al
        const divElement = eventDiv.querySelector('div');
        let date = 'Tarih belirtilmemiş';

        if (divElement) {
          const spanElement = divElement.querySelector('span');
          if (spanElement) {
            try {
              // Burada XPath ile aynı sonucu elde etmek için evalute kullanabiliriz
              const result = dom.window.document.evaluate(
                `.//text()[2]`, // Yalnızca ikinci text node'u seçme
                spanElement,
                null,
                dom.window.XPathResult.STRING_TYPE,
                null,
              );

              if (result && result.stringValue) {
                date = result.stringValue.trim();
              } else {
                // Alternatif yöntem: Tüm childNode'ları göz önüne al ve ikinci text node'u bul
                const textNodes = Array.from(spanElement.childNodes)
                  .filter((node) => node.nodeType === node.TEXT_NODE)
                  .map((node) => node.textContent?.trim())
                  .filter(Boolean);

                if (textNodes.length >= 2) {
                  date = textNodes[1];
                }
              }
            } catch (error) {
              this.logger.warn(
                `Error extracting date from event div: ${error.message}`,
              );
            }
          }
        }

        // Tam URL oluştur
        const fullUrl = href.startsWith('http')
          ? href
          : new URL(href, new URL(url).origin).toString();

        events.push({
          link: fullUrl,
          date: date,
        });
      });

      // Cache the results (only if we found events)
      if (events.length > 0) {
        await this.cacheManager.set(
          cacheKey,
          JSON.stringify(events),
          this.CACHE_TTL * 1000,
        );
      }

      return events;
    } catch (error) {
      this.logger.error(
        `Error scraping events from ${url}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  // News scraping with caching
  async scrapeNews(url: string): Promise<NewsDetail[]> {
    try {
      // Try to get data from cache first
      const cacheKey = `${this.NEWS_CACHE_KEY}:${this.hashUrl(url)}`;
      const cachedData = await this.cacheManager.get<string>(cacheKey);

      if (cachedData) {
        this.logger.log(`Cache hit for news from ${url}`);
        return JSON.parse(cachedData);
      }

      this.logger.log(`Cache miss for news from ${url}, fetching from source`);

      const response = await firstValueFrom(this.httpService.get(url));
      const dom = new JSDOM(response.data);
      const document = dom.window.document;

      // Using the XPath you provided, but converted to querySelector format
      const newsElements = document.querySelectorAll(
        '#ctl14_div_haberler > div',
      );

      const newsLinks: string[] = [];

      newsElements.forEach((newsDiv) => {
        const linkElement = newsDiv.querySelector('a');
        const href = linkElement?.getAttribute('href');

        if (href) {
          newsLinks.push(href.startsWith('http') ? href : `${url}${href}`);
        }
      });

      // Create promises for each news detail, with cache checks
      const newsDetailPromises = newsLinks.map((link) =>
        this.getNewsDetailWithCache(link),
      );

      // Execute all promises in parallel
      const newsDetails = await Promise.all(newsDetailPromises);

      // Cache the final results
      await this.cacheManager.set(
        cacheKey,
        JSON.stringify(newsDetails),
        this.CACHE_TTL * 1000,
      );

      return newsDetails;
    } catch (error) {
      this.logger.error(
        `Error scraping news from ${url}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  private async getNewsDetailWithCache(link: string): Promise<NewsDetail> {
    try {
      // Generate a cache key for this specific news detail
      const cacheKey = `scraper:news:${this.hashUrl(link)}`;
      const cachedDetail = await this.cacheManager.get<string>(cacheKey);

      if (cachedDetail) {
        return JSON.parse(cachedDetail);
      }

      const detail = await this.scrapeNewsDetail(link);

      // Cache the individual news detail
      await this.cacheManager.set(
        cacheKey,
        JSON.stringify(detail),
        this.CACHE_TTL * 1000,
      );

      return detail;
    } catch (error) {
      this.logger.error(
        `Error getting news detail for ${link}: ${error.message}`,
        error.stack,
      );
      return { link, title: '', img_url: '', content: '', date: '' };
    }
  }

  async scrapeNewsDetail(link: string): Promise<NewsDetail> {
    try {
      const response = await firstValueFrom(this.httpService.get(link));
      const dom = new JSDOM(response.data);
      const document = dom.window.document;

      // Extract title
      const title =
        document.querySelector('#ctl14_aktivitebaslik_')?.textContent?.trim() ||
        '';

      // Extract image URL
      const imgElement = document.querySelector(
        '#ctl14_aktivitedetay_ div a img',
      );
      const imgUrl = imgElement?.getAttribute('src') || '';

      // Extract content
      const contentElement = document.evaluate(
        '//*[@id="ctl14_aktivitedetay_"]/p[2]/span/text()',
        document,
        null,
        dom.window.XPathResult.STRING_TYPE,
        null,
      );

      // Clean the content by removing newlines and normalizing whitespace
      const rawContent = contentElement.stringValue || '';
      const content = rawContent
        .replace(/\n/g, ' ') // Replace newlines with spaces
        .replace(/\r/g, '') // Remove carriage returns
        .replace(/\t/g, ' ') // Replace tabs with spaces
        .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
        .trim(); // Remove leading/trailing whitespace

      // Tarihi doğru elementten çek
      let date = 'Tarih belirtilmemiş';

      // '#ctl14_div_baslamatarihi_' elementinden tarih bilgisini al
      const dateElement = document.querySelector('#ctl14_div_baslamatarihi_');
      if (dateElement && dateElement.textContent) {
        date = dateElement.textContent.trim();
      }

      return {
        link,
        title,
        img_url: imgUrl.startsWith('http')
          ? imgUrl
          : `${new URL(link).origin}${imgUrl}`,
        content,
        date,
      };
    } catch (error) {
      this.logger.error(
        `Error scraping news detail from ${link}: ${error.message}`,
        error.stack,
      );
      return { link, title: '', img_url: '', content: '', date: '' };
    }
  }

  // Utility method to clear all caches
  async clearCache(): Promise<void> {
    try {
      await this.cacheManager.del(this.NOTICES_CACHE_KEY);
      await this.cacheManager.del(this.EVENTS_CACHE_KEY);
      await this.cacheManager.del(this.NEWS_CACHE_KEY);

      // Unfortunately, cache-manager doesn't provide a way to clear by pattern
      // We would need to maintain a list of keys or implement a custom solution
      this.logger.log('All caches cleared');
    } catch (error) {
      this.logger.error(`Error clearing cache: ${error.message}`, error.stack);
    }
  }

  // Helper function to create a simple hash of a URL for use in cache keys
  // Metot tanımlandı ancak hashUrl eksik olduğu için hataya neden oluyor
  // Bu metodu protected yaparak hata oluşmasını engelleyelim
  protected hashUrl(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(36); // Convert to base36 for shorter keys
  }
}
