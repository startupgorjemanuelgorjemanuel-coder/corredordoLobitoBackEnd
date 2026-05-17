import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ValidateDocsDto } from './dto/validate-docs.dto';
import { ApproveLicenseDto } from './dto/approve-license.dto';
import { RejectOrSuspendDto } from './dto/reject-or-suspend.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Companies')
@ApiBearerAuth('JWT')
@Controller('companies')
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateCompanyDto, @CurrentUser() user: AuthUser) {
    return this.companiesService.create(dto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('state', 'staff')
  findAll(@Query() pagination: PaginationDto) {
    return this.companiesService.findAll(pagination);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Get(':id/license-pdf')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Download da Licença Comercial PDF (URL pré-assinada 60 min)' })
  getLicensePdf(@Param('id') id: string) {
    return this.companiesService.getLicensePdf(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }

  @Post(':id/validate-documentation')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('staff')
  validateDocumentation(
    @Param('id') id: string,
    @Body() dto: ValidateDocsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.companiesService.validateDocumentation(id, dto, user);
  }

  @Post(':id/forward-to-state')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('staff')
  forwardToState(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.companiesService.forwardToState(id, user);
  }

  @Post(':id/approve-license')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('state')
  approveLicense(
    @Param('id') id: string,
    @Body() dto: ApproveLicenseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.companiesService.approveLicense(id, dto, user);
  }

  @Post(':id/reject-license')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('state')
  rejectLicense(
    @Param('id') id: string,
    @Body() dto: RejectOrSuspendDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.companiesService.rejectLicense(id, dto, user);
  }

  @Post(':id/suspend')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('state')
  suspend(
    @Param('id') id: string,
    @Body() dto: RejectOrSuspendDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.companiesService.suspend(id, dto, user);
  }

  @Post(':id/revoke')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('state')
  revoke(
    @Param('id') id: string,
    @Body() dto: RejectOrSuspendDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.companiesService.revoke(id, dto, user);
  }
}
