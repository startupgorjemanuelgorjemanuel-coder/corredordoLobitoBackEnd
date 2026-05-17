import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { paginate, PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { BlockUserDto } from './dto/block-user.dto';

const SAFE_SELECT = {
  id: true, cd: true, email: true, fullName: true,
  phone: true, role: true, status: true, companyId: true,
  lastLoginAt: true, createdAt: true, updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(
    private prisma:   PrismaService,
    private audit:    AuditService,
    private codeGen:  CodeGeneratorService,
  ) {}

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<any>> {
    const page  = pagination.page  ?? 1;
    const limit = pagination.limit ?? 20;
    const skip  = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ skip, take: limit, select: SAFE_SELECT, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count(),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!user) throw new NotFoundException('Utilizador não encontrado');
    return user;
  }

  async create(dto: CreateUserDto, actor: AuthUser) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email já registado');

    const cd = await this.codeGen.generate('users');
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        cd,
        email:        dto.email,
        passwordHash,
        fullName:     dto.fullName,
        phone:        dto.phone ?? null,
        role:         dto.role as any,
        companyId:    dto.companyId ?? null,
      },
      select: SAFE_SELECT,
    });

    await this.audit.log({
      userId: actor.id, role: actor.role,
      action: 'CREATE_USER',
      entity: 'user', entityId: user.id,
      after:  { email: user.email, role: user.role },
    });

    return user;
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser) {
    await this.findOne(id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName  !== undefined ? { fullName:  dto.fullName }  : {}),
        ...(dto.phone     !== undefined ? { phone:     dto.phone }     : {}),
        ...(dto.companyId !== undefined ? { companyId: dto.companyId } : {}),
      },
      select: SAFE_SELECT,
    });

    await this.audit.log({
      userId: actor.id, role: actor.role,
      action: 'UPDATE_USER',
      entity: 'user', entityId: id,
      after:  dto,
    });

    return updated;
  }

  async block(id: string, dto: BlockUserDto, actor: AuthUser) {
    const user = await this.findOne(id);

    if (user.status === 'blocked') {
      throw new BadRequestException('Utilizador já está bloqueado');
    }
    // STATE não pode bloquear a si mesmo
    if (id === actor.id) {
      throw new ForbiddenException('Não pode bloquear a sua própria conta');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data:  { status: 'blocked' },
      select: SAFE_SELECT,
    });

    await this.audit.log({
      userId: actor.id, role: actor.role,
      action: 'BLOCK_USER',
      entity: 'user', entityId: id,
      before: { status: 'active' },
      after:  { status: 'blocked', reason: dto.reason },
    });

    return updated;
  }

  async unblock(id: string, actor: AuthUser) {
    const user = await this.findOne(id);

    if (user.status === 'active') {
      throw new BadRequestException('Utilizador já está activo');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data:  { status: 'active' },
      select: SAFE_SELECT,
    });

    await this.audit.log({
      userId: actor.id, role: actor.role,
      action: 'UNBLOCK_USER',
      entity: 'user', entityId: id,
      before: { status: 'blocked' },
      after:  { status: 'active' },
    });

    return updated;
  }

  async updateRole(id: string, dto: UpdateRoleDto, actor: AuthUser) {
    await this.findOne(id);

    if (id === actor.id) {
      throw new ForbiddenException('Não pode alterar o seu próprio role');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data:  { role: dto.role as any },
      select: SAFE_SELECT,
    });

    await this.audit.log({
      userId: actor.id, role: actor.role,
      action: 'UPDATE_USER_ROLE',
      entity: 'user', entityId: id,
      after:  { newRole: dto.role },
    });

    return updated;
  }
}
