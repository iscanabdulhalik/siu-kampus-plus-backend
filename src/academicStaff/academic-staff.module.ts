import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AcademicStaffController } from './academic-staff.controller';
import { AcademicStaffService } from './academic-staff.service';

@Module({
  imports: [HttpModule],
  controllers: [AcademicStaffController],
  providers: [AcademicStaffService],
})
export class AcademicStaffModule {}
