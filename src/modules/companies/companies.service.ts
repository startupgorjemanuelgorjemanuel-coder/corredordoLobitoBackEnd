import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { StorageService } from '../../common/services/storage.service';
import { PdfGeneratorService } from '../../common/services/pdf-generator.service';
import { ConfigService } from '@nestjs/config';
import { paginate, PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ValidateDocsDto } from './dto/validate-docs.dto';
import { ApproveLicenseDto } from './dto/approve-license.dto';
import { RejectOrSuspendDto } from './dto/reject-or-suspend.dto';

@Injectable()
export class CompaniesService {
  constructor(
    private prisma:   PrismaService,
    private audit:    AuditService,
    private codeGen:  CodeGeneratorService,
    private storage:  StorageService,
    private pdfGen:   PdfGeneratorService,
    private config:   ConfigService,
  ) {}

  async create(dto: CreateCompanyDto, user: AuthUser) {
    const cd = await this.codeGen.generate('companies');

    const company = await this.prisma.company.create({
      data: {
        cd,
        name:         dto.name,
        country:      dto.country as any,
        companyType:  dto.companyType as any ?? null,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone ?? null,
        address:      dto.address ?? null,
        licenseStatus: 'pending',
      },
    });

    // Auto-link: só roles de negócio sem empresa ainda (nunca roles governamentais)
    const BUSINESS_ROLES = ['producer', 'buyer', 'operator', 'company'];
    if (!user.companyId && BUSINESS_ROLES.includes(user.role)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data:  { companyId: company.id },
      });
    }

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'CREATE_COMPANY',
      entity: 'company', entityId: company.id,
      after:  { name: company.name, country: company.country, licenseStatus: 'pending' },
    });

    return company;
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
    const company = await this.findOrFail(id);
    const documents = await this.prisma.document.findMany({
      where:   { entityType: 'company', entityId: id },
      orderBy: { createdAt: 'desc' },
      select:  { id: true, cd: true, type: true, name: true, fileName: true, mimeType: true, sizeBytes: true, status: true, rejectedReason: true, createdAt: true },
    });
    return { ...company, documents };
  }

  async getLicensePdf(id: string) {
    const company = await this.findOrFail(id);
    if (!company.licenseDocumentUrl) {
      throw new NotFoundException('PDF da licença ainda não foi gerado. A licença deve estar activa.');
    }
    const [bucket, ...rest] = company.licenseDocumentUrl
      .replace('https://paydpuwjjuezmjfzxmvi.supabase.co/storage/v1/object/public/', '')
      .split('/');
    const signedUrl = await this.storage.getSignedUrl(bucket, rest.join('/'), 3600);
    return { signedUrl, fileName: `licenca-${company.cd}.pdf`, expiresIn: 3600 };
  }

  async update(id: string, dto: UpdateCompanyDto) {
    await this.findOrFail(id);
    return this.prisma.company.update({
      where: { id },
      data: {
        ...(dto.name         !== undefined ? { name:         dto.name             } : {}),
        ...(dto.companyType  !== undefined ? { companyType:  dto.companyType as any } : {}),
        ...(dto.contactEmail !== undefined ? { contactEmail: dto.contactEmail     } : {}),
        ...(dto.contactPhone !== undefined ? { contactPhone: dto.contactPhone     } : {}),
        ...(dto.address      !== undefined ? { address:      dto.address          } : {}),
      },
    });
  }

  async validateDocumentation(id: string, dto: ValidateDocsDto, user: AuthUser) {
    const company = await this.findOrFail(id);

    if (!['pending', 'under_review'].includes(company.licenseStatus)) {
      throw new BadRequestException('Empresa não está em estado validável');
    }

    const documentationValidation = {
      validatedAt:  new Date().toISOString(),
      validatedBy:  user.id,
      result:       dto.valid ? 'approved' : 'rejected',
      notes:        dto.notes ?? null,
    };

    const updated = await this.prisma.company.update({
      where: { id },
      data: {
        licenseStatus:           dto.valid ? 'under_review' : 'pending',
        validationNotes:         dto.notes ?? null,
        documentationValidation,
        validatedByStaffId:      user.id,
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
        verifiedByState:  true,
      },
    });

    // Gerar PDF da licença e guardar no Storage
    try {
      const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
      const verifyUrl = `${appUrl}/verify/license/${id}`;
      const pdfBuffer = await this.pdfGen.generateLicense({
        companyName:    updated.name,
        companyCd:      updated.cd,
        companyCountry: updated.country,
        companyType:    updated.companyType ?? null,
        contactEmail:   updated.contactEmail,
        licenseNumber:  dto.licenseNumber,
        issuedAt:       new Date(),
        expiresAt:      new Date(dto.licenseExpiresAt),
        approvedByName: user.fullName ?? user.id,
        verifyUrl,
      });
      const fileName = `licenca-${updated.cd}-${Date.now()}.pdf`;
      const { storageUrl } = await this.storage.upload(
        'emitted-docs', `licenses/${id}/${fileName}`, pdfBuffer, 'application/pdf',
      );
      await this.prisma.company.update({ where: { id }, data: { licenseDocumentUrl: storageUrl } });
    } catch (e) {
      // PDF é best-effort — não bloqueia a aprovação
    }

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'APPROVE_LICENSE',
      entity: 'company', entityId: id,
      before: { licenseStatus: company.licenseStatus },
      after:  { licenseStatus: 'active' },
    });

    return this.prisma.company.findUnique({ where: { id } });
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
