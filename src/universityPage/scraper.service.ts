import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { JSDOM } from 'jsdom';

@Injectable()
export class ScraperService {
  constructor(private readonly httpService: HttpService) {}

  async scrapeNotices(): Promise<any[]> {
    const url = 'https://siirt.edu.tr/';
    const response = await firstValueFrom(this.httpService.get(url));
    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    const noticeElements = document.querySelectorAll(
      '#ctl14_div_duyurulist1_ > div',
    );

    const notices: Array<{ link: string; date: string }> = [];

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

    return Promise.all(
      notices.map((notice) =>
        this.scrapeNoticeDetail(notice.link, notice.date),
      ),
    );
  }

  async scrapeNoticeDetail(link: string, date: string): Promise<any> {
    const response = await firstValueFrom(this.httpService.get(link));
    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    const title =
      document.querySelector('#ctl14_aktivitebaslik_')?.textContent?.trim() ||
      '';
    const contentElement = document.querySelector('#ctl14_aktivitedetay_');
    const content = this.extractContent(contentElement);

    return { link, title, content, announcement_date: date };
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

  // Method for scraping events from the events calendar page
  async scrapeEvents(url: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(this.httpService.get(url));
      const dom = new JSDOM(response.data);
      const document = dom.window.document;

      // Using the XPath you provided, converted to querySelector format
      const eventElements = document.querySelectorAll(
        '#ctl14_div_alt_etkinlik > div',
      );

      const events: Array<{ link: string; date: string }> = [];

      eventElements.forEach((eventDiv) => {
        // Find the <a> element inside each div div
        const linkElement = eventDiv.querySelector('div a');
        const href = linkElement?.getAttribute('href');

        // Find date information - typically in a specific element or format
        // Look for a date element that might contain the event date
        const dateElement = eventDiv.querySelector(
          '.date, .eventDate, [id*="date"]',
        );
        let date = dateElement?.textContent?.trim() || '';

        // If no specific date element found, try to extract from the general text
        if (!date) {
          const fullText =
            eventDiv.textContent?.replace(/\s+/g, ' ').trim() || '';
          // Try to match a date pattern (DD.MM.YYYY or similar)
          const dateMatch = fullText.match(
            /(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})/,
          );
          if (dateMatch) {
            date = `${dateMatch[1]}.${dateMatch[2]}.${dateMatch[3]}`;
          }
        }

        if (href) {
          const fullUrl = href.startsWith('http')
            ? href
            : new URL(href, new URL(url).origin).toString();

          events.push({
            link: fullUrl,
            date,
          });
        }
      });

      // Sort by date, newest first (assuming date format DD.MM.YYYY)
      events.sort((a, b) => {
        if (!a.date || !b.date) return 0;

        // Try to extract date components regardless of separator (. / or -)
        const datePartsA = a.date.split(/[\.\/\-]/).map(Number);
        const datePartsB = b.date.split(/[\.\/\-]/).map(Number);

        if (datePartsA.length < 3 || datePartsB.length < 3) return 0;

        const [dayA, monthA, yearA] = datePartsA;
        const [dayB, monthB, yearB] = datePartsB;

        if (yearA !== yearB) return yearB - yearA;
        if (monthA !== monthB) return monthB - monthA;
        return dayB - dayA;
      });

      return events;
    } catch (error) {
      console.error('Error scraping events:', error);
      return [];
    }
  }

  // New method for scraping news
  async scrapeNews(url: string): Promise<any[]> {
    try {
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

      // Fetch details for each news article
      return Promise.all(newsLinks.map((link) => this.scrapeNewsDetail(link)));
    } catch (error) {
      console.error('Error scraping news:', error);
      return [];
    }
  }

  async scrapeNewsDetail(link: string): Promise<any> {
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

      return {
        link,
        title,
        img_url: imgUrl.startsWith('http')
          ? imgUrl
          : `${new URL(link).origin}${imgUrl}`,
        content,
      };
    } catch (error) {
      console.error(`Error scraping news detail from ${link}:`, error);
      return { link, title: '', img_url: '', content: '' };
    }
  }
}
