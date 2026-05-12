import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { paginate, PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { RejectReportDto } from './dto/reject-report.dto';

// Roles que podem criar relatórios
const REPORT_CREATOR_ROLES = ['analyst', 'specialist', 'compliance'];

@Injectable()
export class ReportsService {
  constructor(
    private prisma:  PrismaService,
    private audit:   AuditService,
    private codeGen: CodeGeneratorService,
  ) {}

  async create(dto: CreateReportDto, user: AuthUser) {
    if (!REPORT_CREATOR_ROLES.includes(user.role)) {
      throw new ForbiddenException('Apenas analyst, specialist e compliance podem criar relatórios');
    }

    const cd = await this.codeGen.generate('reports');
    const report = await this.prisma.report.create({
      data: {
        cd,
        title:          dto.title,
        type:           dto.type as any,
        authorId:       user.id,
        period:         dto.period,
        content:        dto.content,
        targetAudience: (dto.targetAudience ?? 'internal') as any,
        status:         'draft',
      },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'CREATE_REPORT',
      entity: 'report', entityId: report.id,
      after:  { status: 'draft', type: dto.type },
    });

    return report;
  }

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<any>> {
    const page  = pagination.page  ?? 1;
    const limit = pagination.limit ?? 20;
    const skip  = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        skip,
        take:    limit,
        include: { author: { select: { id: true, fullName: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.report.count(),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const report = await this.prisma.report.findUnique({
      where:   { id },
      include: { author: { select: { id: true, fullName: true, role: true } } },
    });
    if (!report) throw new NotFoundException('Relatório não encontrado');
    return report;
  }

  async findMyReports(user: AuthUser, pagination: PaginationDto): Promise<PaginatedResult<any>> {
    const page  = pagination.page  ?? 1;
    const limit = pagination.limit ?? 20;
    const skip  = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where:   { authorId: user.id },
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.report.count({ where: { authorId: user.id } }),
    ]);

    return paginate(data, total, page, limit);
  }

  async update(id: string, dto: UpdateReportDto, user: AuthUser) {
    const report = await this.findOrFail(id);

    if (report.authorId !== user.id) {
      throw new ForbiddenException('Apenas o autor pode editar este relatório');
    }
    if (report.status !== 'draft') {
      throw new BadRequestException('Apenas relatórios em draft podem ser editados');
    }

    return this.prisma.report.update({
      where: { id },
      data: {
        title:          dto.title,
        period:         dto.period,
        content:        dto.content,
        targetAudience: dto.targetAudience as any,
      },
    });
  }

  async submit(id: string, user: AuthUser) {
    const report = await this.findOrFail(id);

    if (report.authorId !== user.id) {
      throw new ForbiddenException('Apenas o autor pode submeter este relatório');
    }
    if (report.status !== 'draft') {
      throw new BadRequestException('Apenas relatórios em draft podem ser submetidos');
    }

    const updated = await this.prisma.report.update({
      where: { id },
      data:  { status: 'submitted', submittedAt: new Date() },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'SUBMIT_REPORT',
      entity: 'report', entityId: id,
      before: { status: 'draft' },
      after:  { status: 'submitted' },
    });

    return updated;
  }

  async publish(id: string, user: AuthUser) {
    const report = await this.findOrFail(id);

    if (report.status !== 'submitted') {
      throw new BadRequestException('Apenas relatórios submetidos podem ser publicados');
    }

    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        status:       'published',
        publishedAt:  new Date(),
        publishedById: user.id,
      },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'PUBLISH_REPORT',
      entity: 'report', entityId: id,
      before: { status: 'submitted' },
      after:  { status: 'published' },
    });

    return updated;
  }

  async reject(id: string, dto: RejectReportDto, user: AuthUser) {
    const report = await this.findOrFail(id);

    if (report.status !== 'submitted') {
      throw new BadRequestException('Apenas relatórios submetidos podem ser rejeitados');
    }

    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        status:          'draft',
        rejectionReason: dto.reason,
      },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'REJECT_REPORT',
      entity: 'report', entityId: id,
      before: { status: 'submitted' },
      after:  { status: 'draft', reason: dto.reason },
    });

    return updated;
  }

  private async findOrFail(id: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Relatório não encontrado');
    return report;
  }
}
