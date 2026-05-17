import { Controller, Get, Post, Param, Body, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ComplianceAlertsService } from './compliance-alerts.service';
import { ResolveAlertDto } from './dto/resolve-alert.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Compliance Alerts')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('state', 'compliance')
@Controller('compliance-alerts')
export class ComplianceAlertsController {
  constructor(private readonly svc: ComplianceAlertsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar alertas de compliance — state, compliance' })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('severity')   severity?: string,
    @Query('alertType')  alertType?: string,
    @Query('status')     status?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.svc.findAll(pagination, { severity, alertType, status, entityType });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumo por severidade, estado e tipo' })
  summary() {
    return this.svc.summary();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um alerta' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post(':id/review')
  @HttpCode(200)
  @ApiOperation({ summary: 'Marcar alerta em revisão — compliance' })
  @Roles('compliance')
  markUnderReview(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.markUnderReview(id, user);
  }

  @Post(':id/resolve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Resolver alerta com notas — state, compliance' })
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveAlertDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.resolve(id, dto.notes, user);
  }

  @Post(':id/dismiss')
  @HttpCode(200)
  @ApiOperation({ summary: 'Dispensar alerta (falso positivo) — state' })
  @Roles('state')
  dismiss(
    @Param('id') id: string,
    @Body() dto: ResolveAlertDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.dismiss(id, dto.notes, user);
  }
}
