import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SupportTicketsService } from './support-tickets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import { EscalateTicketDto } from './dto/escalate-ticket.dto';

@ApiTags('Support Tickets')
@ApiBearerAuth('JWT')
@Controller('support-tickets')
@UseGuards(JwtAuthGuard)
export class SupportTicketsController {
  constructor(private ticketsService: SupportTicketsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('state', 'staff', 'admin')
  findAll(@Query() pagination: PaginationDto) {
    return this.ticketsService.findAll(pagination);
  }

  @Get('my-tickets')
  findMyTickets(@CurrentUser() user: AuthUser, @Query() pagination: PaginationDto) {
    return this.ticketsService.findMyTickets(user, pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: AuthUser) {
    return this.ticketsService.create(dto, user);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ticketsService.update(id, dto, user);
  }

  @Post(':id/resolve')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('staff', 'state', 'admin')
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveTicketDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ticketsService.resolve(id, dto, user);
  }

  @Post(':id/escalate')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('staff')
  escalate(
    @Param('id') id: string,
    @Body() dto: EscalateTicketDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ticketsService.escalate(id, dto, user);
  }

  @Post(':id/close')
  @HttpCode(200)
  close(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.ticketsService.close(id, user);
  }
}
