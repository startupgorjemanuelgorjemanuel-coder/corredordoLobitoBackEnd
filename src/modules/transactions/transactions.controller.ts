import { Controller, Get, Post, Param, Body, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { BlockTransactionDto } from './dto/block-transaction.dto';

@ApiTags('Transactions')
@ApiBearerAuth('JWT')
@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Get()
  @Roles('state', 'staff', 'specialist', 'compliance')
  @ApiOperation({ summary: 'Listar transacções com paginação' })
  findAll(@Query() pagination: PaginationDto) {
    return this.transactionsService.findAll(pagination);
  }

  @Get('summary')
  @Roles('state', 'staff')
  @ApiOperation({ summary: 'Resumo financeiro de transacções' })
  getSummary() {
    return this.transactionsService.getSummary();
  }

  @Get(':id')
  @Roles('state', 'staff', 'specialist', 'compliance')
  @ApiOperation({ summary: 'Ver transacção por ID' })
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Post(':id/block')
  @HttpCode(200)
  @Roles('state')
  @ApiOperation({ summary: 'STATE bloqueia transacção' })
  block(
    @Param('id') id: string,
    @Body() dto: BlockTransactionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.transactionsService.block(id, dto, user);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Roles('state')
  @ApiOperation({ summary: 'STATE cancela transacção' })
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.transactionsService.cancel(id, user);
  }
}
