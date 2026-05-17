import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { paginate, PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import { EscalateTicketDto } from './dto/escalate-ticket.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SupportTicketsService {
  constructor(
    private prisma:   PrismaService,
    private audit:    AuditService,
    private codeGen:  CodeGeneratorService,
  ) {}

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<any>> {
    const page  = pagination.page  ?? 1;
    const limit = pagination.limit ?? 20;
    const skip  = (page - 1) * limit;

    const include = {
      user: { select: { id: true, fullName: true, email: true, role: true } },
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.supportTicket.findMany({ skip, take: limit, include, orderBy: { createdAt: 'desc' } }),
      this.prisma.supportTicket.count(),
    ]);

    return paginate(data, total, page, limit);
  }

  async findMyTickets(user: AuthUser, pagination: PaginationDto): Promise<PaginatedResult<any>> {
    const page  = pagination.page  ?? 1;
    const limit = pagination.limit ?? 20;
    const skip  = (page - 1) * limit;

    const where = { userId: user.id };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.supportTicket.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    return this.findOrFail(id);
  }

  async create(dto: CreateTicketDto, user: AuthUser) {
    const cd = await this.codeGen.generate('support_tickets');

    const ticket = await this.prisma.supportTicket.create({
      data: {
        cd,
        userId:  user.id,
        type:    dto.type as any,
        subject: dto.subject,
        content: dto.content ?? Prisma.DbNull,
      },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'CREATE_TICKET',
      entity: 'support_ticket', entityId: ticket.id,
      after:  { type: ticket.type, subject: ticket.subject },
    });

    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto, user: AuthUser) {
    const ticket = await this.findOrFail(id);

    if (ticket.userId !== user.id) {
      throw new ForbiddenException('Apenas o dono do ticket pode editá-lo');
    }
    if (ticket.status !== 'open') {
      throw new BadRequestException('Apenas tickets em estado "open" podem ser editados');
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
      },
    });
  }

  async resolve(id: string, dto: ResolveTicketDto, user: AuthUser) {
    const ticket = await this.findOrFail(id);

    if (!['open', 'in_progress', 'escalated'].includes(ticket.status)) {
      throw new BadRequestException(`Ticket não pode ser resolvido no estado "${ticket.status}"`);
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status:              'resolved',
        resolution:          dto.resolution,
        resolvedByStaffId:   user.id,
        resolvedAt:          new Date(),
      },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'RESOLVE_TICKET',
      entity: 'support_ticket', entityId: id,
      before: { status: ticket.status },
      after:  { status: 'resolved', resolution: dto.resolution },
    });

    return updated;
  }

  async escalate(id: string, dto: EscalateTicketDto, user: AuthUser) {
    const ticket = await this.findOrFail(id);

    if (!['open', 'in_progress'].includes(ticket.status)) {
      throw new BadRequestException(`Ticket não pode ser escalado no estado "${ticket.status}"`);
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status:           'escalated',
        escalatedToState: true,
        escalatedAt:      new Date(),
      },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'ESCALATE_TICKET',
      entity: 'support_ticket', entityId: id,
      before: { status: ticket.status },
      after:  { status: 'escalated', reason: dto.reason },
    });

    return updated;
  }

  async close(id: string, user: AuthUser) {
    const ticket = await this.findOrFail(id);

    const isOwner = ticket.userId === user.id;
    const isState = user.role === 'state';

    if (!isOwner && !isState) {
      throw new ForbiddenException('Apenas o dono do ticket ou o STATE podem fechar tickets');
    }
    if (ticket.status === 'closed') {
      throw new BadRequestException('Ticket já está fechado');
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { status: 'closed', closedAt: new Date() },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'CLOSE_TICKET',
      entity: 'support_ticket', entityId: id,
      before: { status: ticket.status },
      after:  { status: 'closed' },
    });

    return updated;
  }

  private async findOrFail(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    return ticket;
  }
}
