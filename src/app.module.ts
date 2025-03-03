import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnnouncementModule } from './announcement/announcement.module';
import { ScraperModule } from './universityPage/scraper.module';
import { YemekModule } from './foodList/yemek.module';
import { AcademicStaffModule } from './academicStaff/academic-staff.module';
import { BusModule } from './bus/bus-schedule.module';

@Module({
  imports: [
    AnnouncementModule,
    ScraperModule,
    YemekModule,
    AcademicStaffModule,
    BusModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
