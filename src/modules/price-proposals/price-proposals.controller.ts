import { Controller, Get, Post, Put, Body, Param, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PriceProposalsService } from './price-proposals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreatePriceProposalDto } from './dto/create-price-proposal.dto';
import { UpdatePriceProposalDto } from './dto/update-price-proposal.dto';
import { RejectProposalDto } from './dto/reject-proposal.dto';

@ApiTags('Price Proposals')
@ApiBearerAuth('JWT')
@Controller('price-proposals')
@UseGuards(JwtAuthGuard)
export class PriceProposalsController {
  constructor(private priceProposalsService: PriceProposalsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('state', 'specialist')
  findAll() {
    return this.priceProposalsService.findAll();
  }

  @Get('my-proposals')
  @UseGuards(RolesGuard)
  @Roles('specialist')
  findMyProposals(@CurrentUser() user: AuthUser) {
    return this.priceProposalsService.findMyProposals(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.priceProposalsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('specialist')
  create(@Body() dto: CreatePriceProposalDto, @CurrentUser() user: AuthUser) {
    return this.priceProposalsService.create(dto, user);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('specialist')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePriceProposalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.priceProposalsService.update(id, dto, user);
  }

  @Post(':id/submit')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('specialist')
  submit(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.priceProposalsService.submit(id, user);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('state')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.priceProposalsService.approve(id, user);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('state')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectProposalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.priceProposalsService.reject(id, dto, user);
  }
}
