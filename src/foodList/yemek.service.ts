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
  private readonly targetUrl = 'https://siirt.edu.tr/yemeklistesi.html'; // Hedef sitenin URL'sini buraya ekleyin

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

      // Tüm ilk seviye divleri al (genellikle bunlar gün başlıklarıdır)
      const gunDivleri = Array.from(anaDiv.children).filter(
        (el) =>
          el.tagName === 'DIV' &&
          el.hasAttribute('style') &&
          el.getAttribute('style')?.includes('border-bottom'),
      );

      // Sadece ilk 3 günü al (bugün, yarın, sonraki gün)
      const ilkUcGun = gunDivleri.slice(0, 3);

      const gunIsimleri = ['Bugün', 'Yarın', 'Sonraki Gün'];
      const yemekMenuleri: YemekMenu[] = [];

      // Her bir gün div'i için
      ilkUcGun.forEach((gunDiv, index) => {
        // Her bir günün içindeki divleri al
        const icDivler = Array.from(gunDiv.querySelectorAll('div'));

        // İlk div genelde tarih/gün bilgisidir
        const tarihDiv = icDivler[0];
        const tarih = tarihDiv ? tarihDiv.textContent?.trim() || '' : '';

        // Diğer divler menü öğeleridir
        const menuItems: YemekItem[] = [];

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
          gun: gunIsimleri[index],
          tarih: tarih,
          menu: menuItems,
        });
      });

      // Eğer 3 günden az bulunduysa, kalan günleri boş olarak ekle
      for (let i = yemekMenuleri.length; i < 3; i++) {
        yemekMenuleri.push({
          gun: gunIsimleri[i],
          tarih: '',
          menu: [],
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
