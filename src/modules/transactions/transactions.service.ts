import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { paginate, PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import type { AuthUser } from '../../common/types/auth-user.type';
import { BlockTransactionDto } from './dto/block-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma:  PrismaService,
    private audit:   AuditService,
    private codeGen: CodeGeneratorService,
  ) {}

  async create(payload: {
    orderId:  string;
    amount:   number;
    currency: string;
  }) {
    const cd = await this.codeGen.generate('transactions');
    return this.prisma.transaction.create({
      data: {
        cd,
        orderId:  payload.orderId,
        amount:   payload.amount,
        currency: payload.currency,
        method:   'bank_transfer',
        status:   'completed',
        paidAt:   new Date(),
      },
    });
  }

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<any>> {
    const page  = pagination.page  ?? 1;
    const limit = pagination.limit ?? 20;
    const skip  = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        skip,
        take:    limit,
        include: { order: { select: { id: true, cd: true, buyerId: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.count(),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where:   { id },
      include: { order: { select: { id: true, cd: true, buyerId: true, status: true } } },
    });
    if (!transaction) throw new NotFoundException('Transacção não encontrada');
    return transaction;
  }

  async getSummary() {
    const [total, completed, blocked, cancelled] = await this.prisma.$transaction([
      this.prisma.transaction.count(),
      this.prisma.transaction.count({ where: { status: 'completed' } }),
      this.prisma.transaction.count({ where: { status: 'blocked' } }),
      this.prisma.transaction.count({ where: { status: 'cancelled' } }),
    ]);

    const aggregated = await this.prisma.transaction.aggregate({
      where:  { status: 'completed' },
      _sum:   { amount: true },
      _avg:   { amount: true },
      _max:   { amount: true },
      _min:   { amount: true },
    });

    return {
      counts: { total, completed, blocked, cancelled },
      amounts: {
        totalCompleted: aggregated._sum.amount ?? 0,
        average:        aggregated._avg.amount ?? 0,
        max:            aggregated._max.amount ?? 0,
        min:            aggregated._min.amount ?? 0,
      },
    };
  }

  async block(id: string, dto: BlockTransactionDto, user: AuthUser) {
    const transaction = await this.findOrFail(id);

    if (transaction.status !== 'completed') {
      throw new BadRequestException(
        `Apenas transacções completadas podem ser bloqueadas (estado: ${transaction.status})`,
      );
    }

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: {
        status:       'blocked',
        blockedAt:    new Date(),
        blockedById:  user.id,
        blockedReason: dto.reason,
      },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action:   'BLOCK_TRANSACTION',
      entity:   'transaction', entityId: id,
      before:   { status: 'completed' },
      after:    { status: 'blocked', reason: dto.reason },
    });

    return updated;
  }

  async cancel(id: string, user: AuthUser) {
    const transaction = await this.findOrFail(id);

    if (['cancelled', 'refunded'].includes(transaction.status)) {
      throw new BadRequestException('Transacção já está cancelada ou reembolsada');
    }

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: {
        status:      'cancelled',
        cancelledAt: new Date(),
      },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action:   'CANCEL_TRANSACTION',
      entity:   'transaction', entityId: id,
      before:   { status: transaction.status },
      after:    { status: 'cancelled' },
    });

    return updated;
  }

  private async findOrFail(id: string) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id } });
    if (!transaction) throw new NotFoundException('Transacção não encontrada');
    return transaction;
  }
}
