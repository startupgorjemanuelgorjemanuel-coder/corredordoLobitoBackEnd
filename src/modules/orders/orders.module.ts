import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AuditModule } from '../audit/audit.module';
import { TaxesModule } from '../taxes/taxes.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports:     [AuditModule, TaxesModule, TransactionsModule],
  controllers: [OrdersController],
  providers:   [OrdersService],
})
export class OrdersModule {}
