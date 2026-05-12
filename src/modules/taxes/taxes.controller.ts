import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TaxesService } from './taxes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';

@ApiTags('Taxes')
@ApiBearerAuth('JWT')
@Controller('taxes')
@UseGuards(JwtAuthGuard)
export class TaxesController {
  constructor(private taxesService: TaxesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as regras fiscais' })
  findAll() {
    return this.taxesService.findAll();
  }

  @Get('country/:code')
  @ApiOperation({ summary: 'Listar regras fiscais activas por país' })
  findByCountry(@Param('code') code: string) {
    return this.taxesService.findByCountry(code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver regra fiscal por ID' })
  findOne(@Param('id') id: string) {
    return this.taxesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('state')
  @ApiOperation({ summary: 'STATE cria nova regra fiscal' })
  create(@Body() dto: CreateTaxDto, @CurrentUser() user: AuthUser) {
    return this.taxesService.create(dto, user);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('state')
  @ApiOperation({ summary: 'STATE actualiza regra fiscal existente' })
  update(@Param('id') id: string, @Body() dto: UpdateTaxDto) {
    return this.taxesService.update(id, dto);
  }
}
