import { Module } from '@nestjs/common';
import { SupportTicketsController } from './support-tickets.controller';
import { SupportTicketsService } from './support-tickets.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports:     [AuditModule],
  controllers: [SupportTicketsController],
  providers:   [SupportTicketsService],
})
export class SupportTicketsModule {}
