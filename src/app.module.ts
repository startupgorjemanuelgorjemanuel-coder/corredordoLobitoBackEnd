import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ProductsModule } from './modules/products/products.module';
import { PriceProposalsModule } from './modules/price-proposals/price-proposals.module';
import { TaxesModule } from './modules/taxes/taxes.module';
import { OrdersModule } from './modules/orders/orders.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SupportTicketsModule } from './modules/support-tickets/support-tickets.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
    AuditModule,
    UsersModule,
    CompaniesModule,
    ProductsModule,
    PriceProposalsModule,
    TaxesModule,
    OrdersModule,
    TransactionsModule,
    ShipmentsModule,
    ReportsModule,
    DashboardModule,
    SupportTicketsModule,
  ],
})
export class AppModule {}
