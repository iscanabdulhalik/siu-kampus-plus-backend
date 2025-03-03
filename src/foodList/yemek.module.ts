import { Module } from '@nestjs/common';
import { YemekController } from './yemek.controller';
import { YemekService } from './yemek.service';

@Module({
  controllers: [YemekController],
  providers: [YemekService],
  exports: [YemekService],
})
export class YemekModule {}
