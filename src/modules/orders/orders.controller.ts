import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { BlockOrderDto } from './dto/block-order.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Orders')
@ApiBearerAuth('JWT')
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('state', 'staff', 'specialist')
  findAll(@Query() pagination: PaginationDto) {
    return this.ordersService.findAll(pagination);
  }

  @Get('my-orders')
  @UseGuards(RolesGuard)
  @Roles('buyer')
  findMyOrders(@CurrentUser() user: AuthUser, @Query() pagination: PaginationDto) {
    return this.ordersService.findMyOrders(user, pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ordersService.findOne(id, user);
  }

  @Get(':id/invoice-pdf')
  getInvoicePdf(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ordersService.getInvoicePdf(id, user);
  }

  @Get(':id/receipt-pdf')
  getReceiptPdf(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ordersService.getReceiptPdf(id, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('buyer')
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthUser) {
    return this.ordersService.create(dto, user);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('buyer')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.update(id, dto, user);
  }

  @Post(':id/pay')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('buyer')
  pay(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ordersService.pay(id, user);
  }

  @Post(':id/block')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('state')
  block(
    @Param('id') id: string,
    @Body() dto: BlockOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.block(id, dto, user);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('state')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ordersService.cancel(id, user);
  }

  @Post(':id/escalate-to-state')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('staff')
  escalateToState(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ordersService.escalateToState(id, user);
  }
}
