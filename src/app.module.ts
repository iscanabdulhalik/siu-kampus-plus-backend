import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AcademicStaffModule } from './academicStaff/academic-staff.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { BusModule } from './bus/bus-schedule.module';
import { YemekModule } from './foodList/yemek.module';
import { ScraperModule } from './universityPage/scraper.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // 10 saniye
      maxRedirects: 5,
    }),
    AcademicStaffModule,
    AnnouncementModule,
    BusModule,
    YemekModule,
    ScraperModule,
  ],
})
export class AppModule {}
