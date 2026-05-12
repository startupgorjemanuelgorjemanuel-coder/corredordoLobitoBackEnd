import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { RejectReportDto } from './dto/reject-report.dto';

@ApiTags('Reports')
@ApiBearerAuth('JWT')
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('state', 'staff', 'specialist', 'analyst', 'compliance')
  @ApiOperation({ summary: 'Listar todos os relatórios com paginação' })
  findAll(@Query() pagination: PaginationDto) {
    return this.reportsService.findAll(pagination);
  }

  @Get('my-reports')
  @UseGuards(RolesGuard)
  @Roles('analyst', 'specialist', 'compliance')
  @ApiOperation({ summary: 'Listar os meus relatórios' })
  findMyReports(@CurrentUser() user: AuthUser, @Query() pagination: PaginationDto) {
    return this.reportsService.findMyReports(user, pagination);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('state', 'staff', 'specialist', 'analyst', 'compliance')
  @ApiOperation({ summary: 'Ver relatório por ID' })
  findOne(@Param('id') id: string) {
    return this.reportsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('analyst', 'specialist', 'compliance')
  @ApiOperation({ summary: 'Criar relatório em draft' })
  create(@Body() dto: CreateReportDto, @CurrentUser() user: AuthUser) {
    return this.reportsService.create(dto, user);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('analyst', 'specialist', 'compliance')
  @ApiOperation({ summary: 'Editar relatório (apenas draft)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reportsService.update(id, dto, user);
  }

  @Post(':id/submit')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('analyst', 'specialist', 'compliance')
  @ApiOperation({ summary: 'Submeter relatório para publicação' })
  submit(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.reportsService.submit(id, user);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('state')
  @ApiOperation({ summary: 'STATE publica relatório oficialmente' })
  publish(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.reportsService.publish(id, user);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('state')
  @ApiOperation({ summary: 'STATE rejeita relatório com motivo (volta a draft)' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectReportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reportsService.reject(id, dto, user);
  }
}
