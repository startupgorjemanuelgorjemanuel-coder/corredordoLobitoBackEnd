import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

const SUSPICIOUS_ACTIONS = [
  'BLOCK_ORDER', 'CANCEL_ORDER',
  'BLOCK_TRANSACTION', 'CANCEL_TRANSACTION',
  'SUSPEND_COMPANY', 'REVOKE_COMPANY', 'REJECT_LICENSE',
  'HOLD_SHIPMENT', 'CUSTOMS_REJECT',
  'VALIDATE_DOCS_FAIL',
];

@ApiTags('Audit Logs')
@ApiBearerAuth('JWT')
@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles('state', 'compliance')
  @ApiOperation({ summary: 'Listar audit logs — filtro por entidade/acção' })
  @ApiQuery({ name: 'entity',   required: false, example: 'order' })
  @ApiQuery({ name: 'entityId', required: false, example: 'uuid-do-pedido' })
  @ApiQuery({ name: 'action',   required: false, example: 'BLOCK_ORDER' })
  findAll(
    @Query('entity')   entity?:   string,
    @Query('entityId') entityId?: string,
    @Query('action')   action?:   string,
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(entity   ? { entity }   : {}),
        ...(entityId ? { entityId } : {}),
        ...(action   ? { action }   : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Get('suspicious-activities')
  @Roles('state', 'compliance')
  @ApiOperation({ summary: 'Listar actividades suspeitas — acções de bloqueio, rejeição e cancelamento' })
  getSuspiciousActivities() {
    return this.prisma.auditLog.findMany({
      where: { action: { in: SUSPICIOUS_ACTIONS } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  @Get(':id')
  @Roles('state', 'compliance')
  findOne(@Param('id') id: string) {
    return this.prisma.auditLog.findUnique({ where: { id } });
  }
}
