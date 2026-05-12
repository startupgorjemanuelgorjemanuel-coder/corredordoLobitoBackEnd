import { Module } from '@nestjs/common';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports:     [AuditModule],
  controllers: [ShipmentsController],
  providers:   [ShipmentsService],
})
export class ShipmentsModule {}
