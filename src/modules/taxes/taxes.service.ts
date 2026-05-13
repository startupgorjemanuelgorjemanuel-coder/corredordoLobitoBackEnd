import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { paginate, PaginationDto } from '../../common/dto/pagination.dto';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';

@Injectable()
export class TaxesService {
  constructor(
    private prisma:  PrismaService,
    private codeGen: CodeGeneratorService,
  ) {}

  async findAll(pagination?: PaginationDto) {
    const page  = pagination?.page  ?? 1;
    const limit = pagination?.limit ?? 100;
    const skip  = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.tax.findMany({ skip, take: limit, orderBy: { effectiveFrom: 'desc' } }),
      this.prisma.tax.count(),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const tax = await this.prisma.tax.findUnique({ where: { id } });
    if (!tax) throw new NotFoundException('Regra fiscal não encontrada');
    return tax;
  }

  async findByCountry(country: string, pagination?: PaginationDto) {
    const page  = pagination?.page  ?? 1;
    const limit = pagination?.limit ?? 100;
    const skip  = (page - 1) * limit;

    const where = { country, isActive: true };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.tax.findMany({ where, skip, take: limit, orderBy: { effectiveFrom: 'desc' } }),
      this.prisma.tax.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async create(dto: CreateTaxDto, user: AuthUser) {
    const cd = await this.codeGen.generate('taxes');
    return this.prisma.tax.create({
      data: {
        cd,
        name:          dto.name,
        category:      dto.category,
        country:       dto.country,
        rate:          dto.rate,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo:   dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        isActive:      dto.isActive ?? true,
        createdById:   user.id,
      },
    });
  }

  async update(id: string, dto: UpdateTaxDto) {
    await this.findOne(id);
    return this.prisma.tax.update({
      where: { id },
      data: {
        ...(dto.name          !== undefined ? { name: dto.name }                         : {}),
        ...(dto.category      !== undefined ? { category: dto.category }                 : {}),
        ...(dto.country       !== undefined ? { country: dto.country }                   : {}),
        ...(dto.rate          !== undefined ? { rate: dto.rate }                         : {}),
        ...(dto.effectiveFrom !== undefined ? { effectiveFrom: new Date(dto.effectiveFrom) } : {}),
        ...(dto.effectiveTo   !== undefined ? { effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null } : {}),
        ...(dto.isActive      !== undefined ? { isActive: dto.isActive }                 : {}),
      },
    });
  }
}
