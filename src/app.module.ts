import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnnouncementModule } from './announcement/announcement.module';

@Module({
  imports: [AnnouncementModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
