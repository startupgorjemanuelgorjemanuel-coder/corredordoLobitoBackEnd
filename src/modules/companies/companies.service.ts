import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { paginate, PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateCompanyDto } from './dto/create-company.dto';
import { ValidateDocsDto } from './dto/validate-docs.dto';
import { ApproveLicenseDto } from './dto/approve-license.dto';
import { RejectOrSuspendDto } from './dto/reject-or-suspend.dto';

@Injectable()
export class CompaniesService {
  constructor(
    private prisma:   PrismaService,
    private audit:    AuditService,
    private codeGen:  CodeGeneratorService,
  ) {}

  async create(dto: CreateCompanyDto) {
    const cd = await this.codeGen.generate('companies');
    return this.prisma.company.create({
      data: { ...dto, cd, licenseStatus: 'pending' },
    });
  }

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<any>> {
    const page  = pagination.page  ?? 1;
    const limit = pagination.limit ?? 20;
    const skip  = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.company.count(),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    return this.findOrFail(id);
  }

  async validateDocumentation(id: string, dto: ValidateDocsDto, user: AuthUser) {
    const company = await this.findOrFail(id);

    if (!['pending', 'under_review'].includes(company.licenseStatus)) {
      throw new BadRequestException('Empresa não está em estado validável');
    }

    const updated = await this.prisma.company.update({
      where: { id },
      data: {
        licenseStatus:      dto.valid ? 'under_review' : 'pending',
        validationNotes:    dto.notes ?? null,
        validatedByStaffId: user.id,
      },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action:   dto.valid ? 'VALIDATE_DOCS_OK' : 'VALIDATE_DOCS_FAIL',
      entity:   'company', entityId: id,
      before:   { licenseStatus: company.licenseStatus },
      after:    { licenseStatus: updated.licenseStatus },
    });

    return updated;
  }

  async forwardToState(id: string, user: AuthUser) {
    const company = await this.findOrFail(id);

    if (company.licenseStatus !== 'under_review') {
      throw new BadRequestException(
        'Empresa tem de estar em under_review para ser encaminhada ao STATE (executar validate-documentation primeiro)',
      );
    }

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'FORWARD_TO_STATE',
      entity: 'company', entityId: id,
      after:  { licenseStatus: 'under_review', forwardedBy: user.id },
    });

    return { ...company, message: 'Empresa encaminhada ao STATE para decisão de licenciamento.' };
  }

  async approveLicense(id: string, dto: ApproveLicenseDto, user: AuthUser) {
    const company = await this.findOrFail(id);

    if (company.licenseStatus !== 'under_review') {
      throw new BadRequestException('Apenas empresas em under_review podem ser aprovadas');
    }

    const updated = await this.prisma.company.update({
      where: { id },
      data: {
        licenseStatus:    'active',
        licenseNumber:    dto.licenseNumber,
        licenseExpiresAt: new Date(dto.licenseExpiresAt),
        approvedByStateId: user.id,
      },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'APPROVE_LICENSE',
      entity: 'company', entityId: id,
      before: { licenseStatus: company.licenseStatus },
      after:  { licenseStatus: 'active' },
    });

    return updated;
  }

  async rejectLicense(id: string, dto: RejectOrSuspendDto, user: AuthUser) {
    const company = await this.findOrFail(id);

    if (!['pending', 'under_review'].includes(company.licenseStatus)) {
      throw new BadRequestException(
        `Apenas empresas em pending ou under_review podem ser rejeitadas (estado actual: ${company.licenseStatus})`,
      );
    }

    const updated = await this.prisma.company.update({
      where: { id },
      data:  { licenseStatus: 'rejected', rejectionReason: dto.reason },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'REJECT_LICENSE',
      entity: 'company', entityId: id,
      before: { licenseStatus: company.licenseStatus },
      after:  { licenseStatus: 'rejected', reason: dto.reason },
    });

    return updated;
  }

  async suspend(id: string, dto: RejectOrSuspendDto, user: AuthUser) {
    const company = await this.findOrFail(id);

    if (company.licenseStatus !== 'active') {
      throw new BadRequestException('Apenas empresas activas podem ser suspensas');
    }

    const updated = await this.prisma.company.update({
      where: { id },
      data:  { licenseStatus: 'suspended', suspensionReason: dto.reason },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'SUSPEND_COMPANY',
      entity: 'company', entityId: id,
      before: { licenseStatus: 'active' },
      after:  { licenseStatus: 'suspended', reason: dto.reason },
    });

    return updated;
  }

  async revoke(id: string, dto: RejectOrSuspendDto, user: AuthUser) {
    const company = await this.findOrFail(id);

    if (!['active', 'suspended'].includes(company.licenseStatus)) {
      throw new BadRequestException(
        `Apenas empresas activas ou suspensas podem ter a licença revogada (estado actual: ${company.licenseStatus})`,
      );
    }

    const updated = await this.prisma.company.update({
      where: { id },
      data:  { licenseStatus: 'rejected', rejectionReason: dto.reason },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'REVOKE_COMPANY',
      entity: 'company', entityId: id,
      before: { licenseStatus: company.licenseStatus },
      after:  { licenseStatus: 'rejected', reason: dto.reason },
    });

    return updated;
  }

  private async findOrFail(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Empresa não encontrada');
    return company;
  }
}
