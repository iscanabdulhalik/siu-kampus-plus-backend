// app.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getIndex() {
    return {
      name: 'Siirt University API',
      version: '1.0.0',
      status: 'running',
    };
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
    };
  }
}
