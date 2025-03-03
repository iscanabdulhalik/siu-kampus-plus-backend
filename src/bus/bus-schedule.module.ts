import { Module } from '@nestjs/common';
import { BusController } from './bus-schedule.controller';
import { BusScraperService } from './bus-schedule.service';

@Module({
  controllers: [BusController],
  providers: [BusScraperService],
  exports: [BusScraperService],
})
export class BusModule {}
