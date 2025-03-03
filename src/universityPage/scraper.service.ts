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
}
