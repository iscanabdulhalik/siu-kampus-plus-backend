import { Controller, Get, Param } from '@nestjs/common';
import {
  AcademicStaffService,
  AcademicStaffMember,
} from './academic-staff.service';
import { DepartmentKeys } from '../announcement/departments.config';

@Controller('academic-staff')
export class AcademicStaffController {
  constructor(private readonly academicStaffService: AcademicStaffService) {}

  @Get(':department')
  async getAcademicStaff(
    @Param('department') department: DepartmentKeys,
  ): Promise<AcademicStaffMember[]> {
    return this.academicStaffService.getAcademicStaff(department);
  }
}
