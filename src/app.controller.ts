import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getIndex() {
    return {
      name: 'Siirt University API',
      version: '1.0.0',
      description: "Siirt Üniversitesi veri çekme API'si",
      endpoints: [
        {
          path: '/academic-staff/:department',
          description: 'Akademik personel bilgilerini getirir',
        },
        {
          path: '/announcement/:department',
          description: 'Bölüm duyurularını getirir',
        },
        {
          path: '/duyuru/uni',
          description: 'Üniversite genel duyurularını getirir',
        },
        { path: '/bus-schedule', description: 'Tüm otobüs saatlerini getirir' },
        {
          path: '/bus-schedule/a1',
          description: 'A1 hattı otobüs saatlerini getirir',
        },
        {
          path: '/bus-schedule/a2',
          description: 'A2 hattı otobüs saatlerini getirir',
        },
        { path: '/yemek', description: 'Yemek listesini getirir' },
      ],
    };
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
