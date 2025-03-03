// app.controller.ts dosyasında (yoksa oluşturun)
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello() {
    return { message: 'Siirt University API is running' };
  }

  @Get('health')
  healthCheck() {
    return { status: 'ok' };
  }
}
