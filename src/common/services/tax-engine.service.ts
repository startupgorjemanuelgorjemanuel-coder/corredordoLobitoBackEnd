import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TaxEngineService {
  constructor(private prisma: PrismaService) {}

  async getRate(country: string, category: string): Promise<number> {
    const today = new Date();
    const baseFilter = {
      isActive:      true,
      effectiveFrom: { lte: today },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
    };

    // 1. Regra específica por país e categoria
    let tax = await this.prisma.tax.findFirst({
      where:   { ...baseFilter, country, category },
      orderBy: { effectiveFrom: 'desc' },
    });

    // 2. Fallback: regra global (country = 'all')
    if (!tax) {
      tax = await this.prisma.tax.findFirst({
        where:   { ...baseFilter, country: 'all', category },
        orderBy: { effectiveFrom: 'desc' },
      });
    }

    return tax ? Number(tax.rate) : 0;
  }
}
