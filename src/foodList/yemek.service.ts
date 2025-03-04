import { Injectable, Logger } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import axios from 'axios';

export interface YemekItem {
  ad: string;
  kalori: number;
}

export interface YemekMenu {
  gun: string;
  tarih: string;
  menu: YemekItem[];
}

@Injectable()
export class YemekService {
  private readonly logger = new Logger(YemekService.name);
  private readonly targetUrl = 'https://siirt.edu.tr/yemeklistesi.html';

  async getYemekListesi(): Promise<YemekMenu[]> {
    try {
      const response = await axios.get(this.targetUrl);
      const dom = new JSDOM(response.data);
      const document = dom.window.document;

      // Ana div'i seç
      const anaDiv = document.getElementById('ctl14_div_yemeklist_');

      if (!anaDiv) {
        this.logger.error('Yemek listesi içeren div bulunamadı');
        return [];
      }

      // Tüm ilk seviye divleri al (günlük menu blokları)
      const gunDivleri = Array.from(anaDiv.children).filter(
        (el) =>
          el.tagName === 'DIV' &&
          el.hasAttribute('style') &&
          el.getAttribute('style')?.includes('border-bottom'),
      );

      // Bugünü (sarı etiketli div) bul
      const bugunIndex = gunDivleri.findIndex((div) => {
        const ilkDiv = div.querySelector('div');
        return (
          ilkDiv &&
          ilkDiv.hasAttribute('style') &&
          ilkDiv.getAttribute('style')?.includes('background-color:#ecc41a')
        );
      });

      if (bugunIndex === -1) {
        this.logger.error('Bugünü belirten sarı etiketli div bulunamadı');
        return [];
      }

      // Üç gün için menü verilerini hazırla
      const gunIsimleri = ['Bugün', 'Yarın', 'Sonraki Gün'];
      const yemekMenuleri: YemekMenu[] = [];

      // Bugün ve sonraki iki gün için verileri ekle
      for (let i = 0; i < 3; i++) {
        const currentIndex = bugunIndex + i;

        // Eğer günler mevcut değilse, hata mesajı döndür
        if (currentIndex >= gunDivleri.length) {
          this.logger.error(`${gunIsimleri[i]} için yemek verisi bulunamadı`);
          return yemekMenuleri.length > 0 ? yemekMenuleri : [];
        }

        const gunDiv = gunDivleri[currentIndex];
        const icDivler = Array.from(gunDiv.querySelectorAll('div'));

        // Gün/tarih bilgisini al
        const tarihDiv = icDivler[0];
        const tarih = tarihDiv ? tarihDiv.textContent?.trim() || '' : '';

        // Menü öğelerini al
        const menuItems: YemekItem[] = [];

        // İlk div'i atla (tarih bilgisi) ve diğerlerini işle
        icDivler.slice(1).forEach((div) => {
          const text = div.textContent?.trim();
          if (text) {
            // Yemek adı ve kalori bilgisini ayır
            const match = text.match(/(.*?)(\d+)\s*Kalori$/i);
            if (match) {
              const yemekAdi = match[1].trim();
              const kalori = parseInt(match[2], 10);

              menuItems.push({
                ad: yemekAdi,
                kalori: kalori,
              });
            } else {
              // Eğer kalori bilgisi yoksa, tüm metni yemek adı olarak ekle
              menuItems.push({
                ad: text,
                kalori: 0,
              });
            }
          }
        });

        yemekMenuleri.push({
          gun: gunIsimleri[i],
          tarih: tarih,
          menu: menuItems,
        });
      }

      return yemekMenuleri;
    } catch (error) {
      this.logger.error(
        `Yemek listesi çekilirken hata oluştu: ${error.message}`,
      );
      return [];
    }
  }
}
