import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ShipmentsService } from './shipments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateTrackingDto } from './dto/update-tracking.dto';
import { CustomsActionDto, CustomsRejectDto, HoldShipmentDto } from './dto/customs-action.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Shipments')
@ApiBearerAuth('JWT')
@Controller('shipments')
@UseGuards(JwtAuthGuard)
export class ShipmentsController {
  constructor(private shipmentsService: ShipmentsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('state', 'staff')
  findAll(@Query() pagination: PaginationDto) {
    return this.shipmentsService.findAll(pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shipmentsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('operator')
  create(@Body() dto: CreateShipmentDto, @CurrentUser() user: AuthUser) {
    return this.shipmentsService.create(dto, user);
  }

  @Put(':id/tracking')
  @UseGuards(RolesGuard)
  @Roles('operator')
  updateTracking(
    @Param('id') id: string,
    @Body() dto: UpdateTrackingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.shipmentsService.updateTracking(id, dto, user);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('customs')
  approve(
    @Param('id') id: string,
    @Body() dto: CustomsActionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.shipmentsService.approve(id, dto, user);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('customs')
  reject(
    @Param('id') id: string,
    @Body() dto: CustomsRejectDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.shipmentsService.reject(id, dto, user);
  }

  @Post(':id/hold')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('customs', 'state')
  hold(
    @Param('id') id: string,
    @Body() dto: HoldShipmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.shipmentsService.hold(id, dto, user);
  }
}
