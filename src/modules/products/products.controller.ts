import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RejectProductDto } from './dto/reject-product.dto';
import { StaffValidateProductDto } from './dto/staff-validate-product.dto';

@ApiTags('Products')
@ApiBearerAuth('JWT')
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.productsService.findAll(pagination);
  }

  @Get('my-products')
  @UseGuards(RolesGuard)
  @Roles('producer')
  findMyProducts(@CurrentUser() user: AuthUser) {
    return this.productsService.findMyProducts(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('producer')
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    return this.productsService.create(dto, user);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('producer')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.update(id, dto, user);
  }

  @Post(':id/request-publication')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('producer')
  requestPublication(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.requestPublication(id, user);
  }

  @Post(':id/validate-technical')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('staff')
  staffValidateTechnical(
    @Param('id') id: string,
    @Body() dto: StaffValidateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.staffValidateTechnical(id, dto, user);
  }

  @Post(':id/forward-product-to-state')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('staff')
  staffForwardProductToState(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.staffForwardProductToState(id, user);
  }

  @Post(':id/approve-publication')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('state')
  approvePublication(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.approvePublication(id, user);
  }

  @Post(':id/reject-publication')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('state')
  rejectPublication(
    @Param('id') id: string,
    @Body() dto: RejectProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.rejectPublication(id, dto, user);
  }

  @Post(':id/suspend')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('state')
  suspend(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.suspend(id, user);
  }
}
