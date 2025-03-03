import { Controller, Get } from '@nestjs/common';
import { YemekService, YemekMenu } from './yemek.service';

@Controller('yemek')
export class YemekController {
  constructor(private readonly yemekService: YemekService) {}

  @Get()
  async getYemekListesi(): Promise<YemekMenu[]> {
    return this.yemekService.getYemekListesi();
  }
}
