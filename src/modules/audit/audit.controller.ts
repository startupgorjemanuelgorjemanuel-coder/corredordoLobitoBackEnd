import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/dto/pagination.dto';
import { LogsQueryDto } from './dto/logs-query.dto';

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
  @ApiOperation({ summary: 'Listar audit logs — filtro por entidade/acção — retorna {data, meta}' })
  async findAll(@Query() query: LogsQueryDto) {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;
    const skip  = (page - 1) * limit;

    const where = {
      ...(query.entity   ? { entity:   query.entity }   : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.action   ? { action:   query.action }   : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  @Get('suspicious-activities')
  @Roles('state', 'compliance')
  @ApiOperation({ summary: 'Listar actividades suspeitas — retorna {data, meta}' })
  async getSuspiciousActivities(@Query() query: LogsQueryDto) {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 50;
    const skip  = (page - 1) * limit;

    const where = { action: { in: SUSPICIOUS_ACTIONS } };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  @Get(':id')
  @Roles('state', 'compliance')
  findOne(@Param('id') id: string) {
    return this.prisma.auditLog.findUnique({ where: { id } });
  }
}
