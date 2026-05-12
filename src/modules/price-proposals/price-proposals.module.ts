import { Module } from '@nestjs/common';
import { PriceProposalsController } from './price-proposals.controller';
import { PriceProposalsService } from './price-proposals.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports:     [AuditModule],
  controllers: [PriceProposalsController],
  providers:   [PriceProposalsService],
  exports:     [PriceProposalsService],
})
export class PriceProposalsModule {}
