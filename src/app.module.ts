import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AcademicStaffModule } from './academicStaff/academic-staff.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { BusModule } from './bus/bus-schedule.module';
import { YemekModule } from './foodList/yemek.module';
import { ScraperModule } from './universityPage/scraper.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000, // 10 saniye
      maxRedirects: 5,
    }),
    AcademicStaffModule,
    AnnouncementModule,
    BusModule,
    YemekModule,
    ScraperModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
