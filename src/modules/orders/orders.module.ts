import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AuditModule } from '../audit/audit.module';
import { TaxesModule } from '../taxes/taxes.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { StorageService } from '../../common/services/storage.service';
import { PdfGeneratorService } from '../../common/services/pdf-generator.service';
import { ComplianceAlertsModule } from '../compliance-alerts/compliance-alerts.module';

@Module({
  imports:     [AuditModule, TaxesModule, TransactionsModule, ComplianceAlertsModule],
  controllers: [OrdersController],
  providers:   [OrdersService, StorageService, PdfGeneratorService],
})
export class OrdersModule {}
