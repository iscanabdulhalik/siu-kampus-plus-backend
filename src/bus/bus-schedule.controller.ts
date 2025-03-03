import { Controller, Get } from '@nestjs/common';
import { BusScraperService } from './bus-schedule.service';

@Controller('bus-schedule')
export class BusController {
  constructor(private readonly busScraperService: BusScraperService) {}

  @Get()
  async getAllBusSchedules() {
    return this.busScraperService.getBusSchedules();
  }

  @Get('a1')
  async getA1BusSchedule() {
    return this.busScraperService.getBusScheduleByRoute('a1-universite-hatti');
  }

  @Get('a2')
  async getA2BusSchedule() {
    return this.busScraperService.getBusScheduleByRoute('a-2-universite-hatti');
  }
}
