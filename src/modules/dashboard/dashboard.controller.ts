import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Dashboard & Analytics')
@ApiBearerAuth('JWT')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('dashboard')
  @Roles('state', 'staff', 'analyst', 'compliance')
  @ApiOperation({ summary: 'Overview consolidado do ecossistema' })
  @ApiResponse({ status: 200, description: 'KPIs de todas as entidades em tempo real' })
  getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('dashboard/metrics')
  @Roles('state', 'staff', 'analyst', 'compliance')
  @ApiOperation({ summary: 'KPIs detalhados com comparações temporais (7d / 30d)' })
  getMetrics() {
    return this.dashboardService.getMetrics();
  }

  @Get('analytics/revenue')
  @Roles('state', 'staff', 'specialist', 'analyst')
  @ApiOperation({ summary: 'Análise de receita — por país, produto e período' })
  getRevenue() {
    return this.dashboardService.getRevenueAnalytics();
  }

  @Get('analytics/logistics-performance')
  @Roles('state', 'staff', 'analyst', 'compliance')
  @ApiOperation({ summary: 'Performance logística — embarques, alfândega e rotas' })
  getLogistics() {
    return this.dashboardService.getLogisticsPerformance();
  }

  @Get('analytics/compliance-score')
  @Roles('state', 'compliance', 'analyst')
  @ApiOperation({ summary: 'Score de conformidade e indicadores de risco' })
  getComplianceScore() {
    return this.dashboardService.getComplianceScore();
  }
}
