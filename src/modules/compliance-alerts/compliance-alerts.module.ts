import { Module } from '@nestjs/common';
import { ComplianceAlertsController } from './compliance-alerts.controller';
import { ComplianceAlertsService } from './compliance-alerts.service';

@Module({
  controllers: [ComplianceAlertsController],
  providers:   [ComplianceAlertsService],
  exports:     [ComplianceAlertsService],
})
export class ComplianceAlertsModule {}
