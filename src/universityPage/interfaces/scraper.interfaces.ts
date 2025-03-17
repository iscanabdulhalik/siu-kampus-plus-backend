// src/universityPage/interfaces/scraper.interfaces.ts

export interface BaseNotice {
  link: string;
  date: string;
}

export interface NoticeDetail {
  link: string;
  title: string;
  content: string[];
  announcement_date: string;
}

export interface NewsDetail {
  link: string;
  title: string;
  img_url: string;
  content: string;
}

export interface EventDetail {
  link: string;
  date: string;
}

export interface NewsDetail {
  link: string;
  title: string;
  img_url: string;
  content: string;
  date: string; // Tarih alanını ekleyin
}
