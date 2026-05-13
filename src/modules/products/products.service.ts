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
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RejectProductDto } from './dto/reject-product.dto';
import { StaffValidateProductDto } from './dto/staff-validate-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma:  PrismaService,
    private audit:   AuditService,
    private codeGen: CodeGeneratorService,
  ) {}

  async create(dto: CreateProductDto, user: AuthUser) {
    // Validar que a empresa tem licença activa
    const company = await this.prisma.company.findUnique({ where: { id: dto.companyId } });
    if (!company) throw new NotFoundException('Empresa não encontrada');
    if (company.licenseStatus !== 'active') {
      throw new BadRequestException(
        `A empresa "${company.name}" não tem licença activa (estado: ${company.licenseStatus}). Não é possível criar produtos.`,
      );
    }

    const cd = await this.codeGen.generate('products');
    return this.prisma.product.create({
      data: {
        cd,
        name:        dto.name,
        description: dto.description,
        category:    dto.category,
        companyId:   dto.companyId,
        producerId:  user.id,
        status:      'draft',
      },
    });
  }

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<any>> {
    const page  = pagination.page  ?? 1;
    const limit = pagination.limit ?? 20;
    const skip  = (page - 1) * limit;

    const include = { producer: { select: { id: true, fullName: true } }, company: { select: { id: true, name: true } } };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ skip, take: limit, include, orderBy: { createdAt: 'desc' } }),
      this.prisma.product.count(),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    return this.findOrFail(id);
  }

  async findMyProducts(user: AuthUser) {
    return this.prisma.product.findMany({
      where:   { producerId: user.id },
      include: { company: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateProductDto, user: AuthUser) {
    const product = await this.findOrFail(id);

    if (product.producerId !== user.id) {
      throw new ForbiddenException('Apenas o producer do produto pode editá-lo');
    }
    if (product.status !== 'draft') {
      throw new BadRequestException('Apenas produtos em draft podem ser editados');
    }

    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async requestPublication(id: string, user: AuthUser) {
    const product = await this.findOrFail(id);

    if (product.producerId !== user.id) {
      throw new ForbiddenException('Apenas o producer do produto pode solicitar publicação');
    }
    if (product.status !== 'draft') {
      throw new BadRequestException('Apenas produtos em draft podem ser submetidos para revisão');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data:  { status: 'pending_review' },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'REQUEST_PUBLICATION',
      entity: 'product', entityId: id,
      before: { status: 'draft' },
      after:  { status: 'pending_review' },
    });

    return updated;
  }

  async staffValidateTechnical(id: string, dto: StaffValidateProductDto, user: AuthUser) {
    const product = await this.findOrFail(id);

    if (product.status !== 'pending_review') {
      throw new BadRequestException(
        `Apenas produtos em pending_review podem ser validados pelo STAFF (estado actual: ${product.status})`,
      );
    }

    const newStatus = dto.valid ? 'staff_validated' : 'pending_review';

    const updated = await this.prisma.product.update({
      where: { id },
      data:  { status: newStatus as any },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: dto.valid ? 'STAFF_VALIDATE_PRODUCT_OK' : 'STAFF_VALIDATE_PRODUCT_FAIL',
      entity: 'product', entityId: id,
      before: { status: 'pending_review' },
      after:  { status: newStatus, notes: dto.notes ?? null },
    });

    return updated;
  }

  async staffForwardProductToState(id: string, user: AuthUser) {
    const product = await this.findOrFail(id);

    if (product.status !== 'staff_validated') {
      throw new BadRequestException(
        'O produto deve estar em staff_validated para ser encaminhado ao STATE. Execute validate-technical primeiro.',
      );
    }

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'STAFF_FORWARD_PRODUCT_TO_STATE',
      entity: 'product', entityId: id,
      after:  { status: 'staff_validated', forwardedBy: user.id, note: 'STAFF encaminhou produto ao STATE para aprovação de publicação' },
    });

    return { ...product, message: 'Produto encaminhado ao STATE para aprovação de publicação.' };
  }

  async approvePublication(id: string, user: AuthUser) {
    const product = await this.findOrFail(id);

    if (!['pending_review', 'staff_validated'].includes(product.status)) {
      throw new BadRequestException(
        `Apenas produtos em pending_review ou staff_validated podem ser publicados (estado actual: ${product.status})`,
      );
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data:  { status: 'published_official', publishedAt: new Date() },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'APPROVE_PUBLICATION',
      entity: 'product', entityId: id,
      before: { status: product.status },
      after:  { status: 'published_official' },
    });

    return updated;
  }

  async rejectPublication(id: string, dto: RejectProductDto, user: AuthUser) {
    const product = await this.findOrFail(id);

    if (!['pending_review', 'staff_validated'].includes(product.status)) {
      throw new BadRequestException(
        `Apenas produtos em pending_review ou staff_validated podem ser rejeitados (estado actual: ${product.status})`,
      );
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data:  { status: 'rejected', rejectionReason: dto.reason },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'REJECT_PUBLICATION',
      entity: 'product', entityId: id,
      before: { status: product.status },
      after:  { status: 'rejected', reason: dto.reason },
    });

    return updated;
  }

  async suspend(id: string, user: AuthUser) {
    const product = await this.findOrFail(id);

    if (product.status !== 'published_official') {
      throw new BadRequestException('Apenas produtos publicados podem ser suspensos');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data:  { status: 'suspended' },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'SUSPEND_PRODUCT',
      entity: 'product', entityId: id,
      before: { status: 'published_official' },
      after:  { status: 'suspended' },
    });

    return updated;
  }

  private async findOrFail(id: string) {
    const product = await this.prisma.product.findUnique({
      where:   { id },
      include: { producer: { select: { id: true, fullName: true } }, company: { select: { id: true, name: true } } },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }
}
