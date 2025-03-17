import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { AcademicStaffService } from './academic-staff.service';
import { AcademicStaffController } from './academic-staff.controller';

@Module({
  imports: [
    HttpModule,
    CacheModule.register({
      store: redisStore,
      host: 'localhost',
      port: 6379,
      ttl: 60 * 60 * 24, // 24 hours in seconds
      max: 100,
      // password: 'your-redis-password', // If Redis requires authentication
      isGlobal: true,
    }),
  ],
  providers: [AcademicStaffService],
  exports: [AcademicStaffService],
  controllers: [AcademicStaffController],
})
export class AcademicStaffModule {}
