import { Injectable, Logger, Inject } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import axios from 'axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

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
  // Yemek listesi günde bir kez değiştiği için 4 saatlik bir TTL uygun olacaktır
  private readonly CACHE_TTL = 60 * 60 * 4; // 4 saat (saniye cinsinden)
  private readonly CACHE_KEY = 'yemek_listesi';

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getYemekListesi(): Promise<YemekMenu[]> {
    try {
      // Önce cache'den veriyi almayı dene
      const cachedData = await this.cacheManager.get<string>(this.CACHE_KEY);

      if (cachedData) {
        this.logger.log('Cache hit for yemek listesi');
        return JSON.parse(cachedData);
      }

      this.logger.log('Cache miss for yemek listesi, fetching from source');

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

      // Bugün ve sonraki iki gün için verileri paralel olarak işle
      const gunPromises = [];

      for (let i = 0; i < 3; i++) {
        const currentIndex = bugunIndex + i;

        // Eğer indeks sınırlar dışındaysa, promise'i eklemeden devam et
        if (currentIndex >= gunDivleri.length) {
          continue;
        }

        // Her gün için veri çıkarma işlemini bir promise'e dönüştür
        gunPromises.push(
          this.extractYemekMenuForDay(gunDivleri[currentIndex], gunIsimleri[i]),
        );
      }

      // Tüm günlerin işlenmesini bekle
      const results = await Promise.all(gunPromises);

      // Geçerli sonuçları yemekMenuleri dizisine ekle
      results.forEach((menu) => {
        if (menu) {
          yemekMenuleri.push(menu);
        }
      });

      // Sonucu cache'e kaydet
      if (yemekMenuleri.length > 0) {
        await this.cacheManager.set(
          this.CACHE_KEY,
          JSON.stringify(yemekMenuleri),
          this.CACHE_TTL * 1000,
        );
      }

      return yemekMenuleri;
    } catch (error) {
      this.logger.error(
        `Yemek listesi çekilirken hata oluştu: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  // Belirli bir gün için yemek menüsünü çıkaran yardımcı metod
  private async extractYemekMenuForDay(
    gunDiv: Element,
    gunIsmi: string,
  ): Promise<YemekMenu | null> {
    try {
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

      return {
        gun: gunIsmi,
        tarih: tarih,
        menu: menuItems,
      };
    } catch (error) {
      this.logger.error(
        `${gunIsmi} için yemek menüsü işlenirken hata oluştu: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  // Cache'i temizlemek için yardımcı metod
  async clearCache(): Promise<void> {
    try {
      await this.cacheManager.del(this.CACHE_KEY);
      this.logger.log('Yemek listesi cache temizlendi');
    } catch (error) {
      this.logger.error(
        `Cache temizlenirken hata oluştu: ${error.message}`,
        error.stack,
      );
    }
  }
}
