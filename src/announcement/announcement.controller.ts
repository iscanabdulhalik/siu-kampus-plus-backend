import { Controller, Get } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';

@Controller('university')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Get('announcement')
  async getAnnouncements() {
    const announcements = await this.announcementService.getAnnouncements();
    return announcements;
  }
}
