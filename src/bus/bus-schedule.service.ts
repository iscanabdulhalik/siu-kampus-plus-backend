import { Injectable } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import axios from 'axios';

export interface BusSchedule {
  carsKalkisSaati: string;
  universiteKalkis: string;
}

@Injectable()
export class BusScraperService {
  private readonly urls = [
    'https://www.siirt.bel.tr/a1-universite-hatti',
    'https://www.siirt.bel.tr/a-2-universite-hatti',
  ];

  async getBusSchedules(): Promise<{ [key: string]: BusSchedule[] }> {
    const result = {};

    for (const url of this.urls) {
      const routeName = url.split('/').pop();
      result[routeName] = await this.scrapeScheduleFromUrl(url);
    }

    return result;
  }

  async getBusScheduleByRoute(routeName: string): Promise<BusSchedule[]> {
    const url = this.urls.find((u) => u.includes(routeName));
    if (!url) {
      throw new Error(`${routeName} için URL bulunamadı`);
    }
    return await this.scrapeScheduleFromUrl(url);
  }

  private async scrapeScheduleFromUrl(url: string): Promise<BusSchedule[]> {
    try {
      const response = await axios.get(url);
      const dom = new JSDOM(response.data);
      const document = dom.window.document;

      // Doğrudan tablo elementini bul - sayfa içindeki tüm tabloları araştır
      const tables = document.querySelectorAll('table');

      if (tables.length === 0) {
        throw new Error('Sayfada tablo bulunamadı');
      }

      // Otobüs çizelgesini içeren tabloyu bulmaya çalış
      let scheduleTable = null;

      // Başlık satırlarında "Çarşı Kalkış" veya "Üniversite Kalkış" içeren tabloyu bul
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

      // Eğer özel bir tablo bulunamadıysa, en büyük tabloyu kullan
      // (Genellikle çizelge tablosu sayfadaki en detaylı tablodur)
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

      // Tablodaki yapıyı analiz et
      let startIndex = 0;

      // İlk üç satırın başlık olduğunu varsayıyoruz, ama doğrulamak için kontrol edelim
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const rowText = rows[i].textContent || '';
        if (
          rowText.includes('Çarşı Kalkış') ||
          rowText.includes('Üniversite Kalkış')
        ) {
          startIndex = i + 1; // Başlık satırını bulduk, sonraki satırdan başla
          break;
        }
      }

      // Veri satırlarını işle
      for (let i = startIndex; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');

        // En az 3 hücre bulunan satırları işle (No, Çarşı Kalkış, Üniversite Kalkış)
        if (cells.length >= 3) {
          // Hücrelerin içeriğini al
          let carsKalkisSaati = '';
          let universiteKalkis = '';

          // Normalde ikinci sütun Çarşı Kalkış Saatidir
          if (cells.length > 1) {
            // Bazı tablolarda iki sütun birleştirilmiş olabilir, bu yüzden colspan kontrol ediyoruz
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

          // Normalde son sütun Üniversite Kalkış saatidir
          if (cells.length > 2) {
            universiteKalkis =
              cells[cells.length - 1].textContent?.trim() || '';
          }

          // Boş olmayan kayıtları ekle
          if (carsKalkisSaati || universiteKalkis) {
            schedules.push({
              carsKalkisSaati,
              universiteKalkis,
            });
          }
        }
      }

      return schedules;
    } catch (error) {
      console.error(`${url} adresinden veri çekilirken hata oluştu:`, error);
      return [];
    }
  }
}
