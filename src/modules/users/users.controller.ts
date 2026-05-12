import {
  Controller, Get, Post, Put, Body, Param, Query,
  UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { BlockUserDto } from './dto/block-user.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles('admin', 'state', 'staff')
  @ApiOperation({ summary: 'Listar todos os utilizadores' })
  findAll(@Query() pagination: PaginationDto) {
    return this.usersService.findAll(pagination);
  }

  @Get(':id')
  @Roles('admin', 'state', 'staff')
  @ApiOperation({ summary: 'Ver utilizador por ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'ADMIN cria novo utilizador' })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser) {
    return this.usersService.create(dto, actor);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'ADMIN actualiza dados do utilizador' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.update(id, dto, actor);
  }

  @Put(':id/block')
  @HttpCode(200)
  @Roles('state')
  @ApiOperation({ summary: 'STATE bloqueia utilizador' })
  block(
    @Param('id') id: string,
    @Body() dto: BlockUserDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.block(id, dto, actor);
  }

  @Put(':id/unblock')
  @HttpCode(200)
  @Roles('state')
  @ApiOperation({ summary: 'STATE desbloqueia utilizador' })
  unblock(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.usersService.unblock(id, actor);
  }

  @Put(':id/role')
  @HttpCode(200)
  @Roles('admin')
  @ApiOperation({ summary: 'ADMIN altera o role de um utilizador' })
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.updateRole(id, dto, actor);
  }
}
