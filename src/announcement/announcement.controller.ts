// announcement.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { DepartmentKeys } from './departments.config';

@Controller('announcement')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Get(':department')
  async getAnnouncements(@Param('department') department: DepartmentKeys) {
    return this.announcementService.getAnnouncements(department);
  }
}
