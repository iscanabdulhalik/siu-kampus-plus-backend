import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { JSDOM } from 'jsdom';
import {
  DEPARTMENT_URLS,
  DepartmentKeys,
} from '../announcement/departments.config';

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

  constructor(private readonly httpService: HttpService) {}

  async getAcademicStaff(
    department: DepartmentKeys,
  ): Promise<AcademicStaffMember[]> {
    const baseUrl = DEPARTMENT_URLS[department];
    if (!baseUrl) {
      throw new Error(`Bölüm bulunamadı: ${department}`);
    }

    // Akademik personel sayfasının URL'sini oluştur (genel URL yapısını kullan)
    const targetUrl = `${baseUrl}personel/akademik/739614.html`;

    try {
      const response = await lastValueFrom(this.httpService.get(targetUrl));
      const html = response.data;
      const dom = new JSDOM(html);
      const document = dom.window.document;

      const staffMembers: AcademicStaffMember[] = [];

      // XPath'e eşdeğer CSS selektörünü kullanarak personel listesini bul
      // XPath: //*[@id="ctl15_div_personlist_2"]/ul
      const staffList = document.querySelector('#ctl15_div_personlist_2 > ul');

      if (!staffList) {
        this.logger.warn(
          `${department} bölümü için akademik personel listesi bulunamadı`,
        );
        return [];
      }

      // Her bir personel öğesini (li) bul
      const staffItems = staffList.querySelectorAll('li');

      // Her bir personel için detay bilgilerini al
      for (const staffItem of staffItems) {
        // Her bir div içindeki a etiketini bul
        const linkElement = staffItem.querySelector('div a');

        if (!linkElement) continue;

        // Href değerini al
        const relativeDetailUrl = linkElement.getAttribute('href');

        if (!relativeDetailUrl) continue;

        // Tam URL'yi oluştur
        const detailPageUrl = new URL(relativeDetailUrl, baseUrl).href;

        try {
          // Detay sayfasını çek
          const staffDetailResponse = await lastValueFrom(
            this.httpService.get(detailPageUrl),
          );
          const staffDetailHtml = staffDetailResponse.data;
          const staffDetailDom = new JSDOM(staffDetailHtml);
          const staffDetailDocument = staffDetailDom.window.document;

          // İsmi al: //*[@id="ctl11_h2_kisiad_"]
          const nameElement =
            staffDetailDocument.querySelector('#ctl11_h2_kisiad_');
          const name = nameElement ? nameElement.textContent?.trim() : '';

          // Ünvanı al: //*[@id="ctl11_div_gorev_"]/table/tbody/tr[1]/td[2]/b
          const titleElement = staffDetailDocument.querySelector(
            '#ctl11_div_gorev_ table tr:first-child td:nth-child(2) b',
          );
          const title = titleElement ? titleElement.textContent?.trim() : '';

          // Branşı al: //*[@id="ctl11_span_abd_"]
          const branchElement =
            staffDetailDocument.querySelector('#ctl11_span_abd_');
          const branch = branchElement ? branchElement.textContent?.trim() : '';

          // E-postayı al: //*[@id="ctl11_span_mailkurumsal_"]/text()[1]
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

          // Telefon numarasını al: //*[@id="ctl11_span_telefon_"]
          const phoneElement = staffDetailDocument.querySelector(
            '#ctl11_span_telefon_',
          );
          const phone = phoneElement ? phoneElement.textContent?.trim() : '';

          if (name) {
            staffMembers.push({
              name,
              title: title || '',
              branch: branch || '',
              email: email || '',
              phone: phone || '',
              detailPageUrl,
            });
          }
        } catch (detailError) {
          this.logger.error(
            `Personel detay sayfası alınırken hata oluştu (${detailPageUrl}): ${detailError.message}`,
            detailError.stack,
          );
          // Hata olsa bile işleme devam et, diğer personeli almaya çalış
          continue;
        }
      }

      return staffMembers;
    } catch (error) {
      this.logger.error(
        `Akademik personel listesi alınırken hata oluştu: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }
}
