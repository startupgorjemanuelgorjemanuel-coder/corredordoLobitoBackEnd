import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { AuditModule } from '../audit/audit.module';
import { StorageService } from '../../common/services/storage.service';
import { PdfGeneratorService } from '../../common/services/pdf-generator.service';

@Module({
  imports:     [AuditModule],
  controllers: [CompaniesController],
  providers:   [CompaniesService, StorageService, PdfGeneratorService],
  exports:     [CompaniesService],
})
export class CompaniesModule {}
