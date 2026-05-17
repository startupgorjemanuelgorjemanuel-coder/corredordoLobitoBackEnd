import { Module } from '@nestjs/common';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';
import { AuditModule } from '../audit/audit.module';
import { StorageService } from '../../common/services/storage.service';
import { PdfGeneratorService } from '../../common/services/pdf-generator.service';

@Module({
  imports:     [AuditModule],
  controllers: [ShipmentsController],
  providers:   [ShipmentsService, StorageService, PdfGeneratorService],
})
export class ShipmentsModule {}
