import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type EntitySequence =
  | 'users'
  | 'companies'
  | 'products'
  | 'price_proposals'
  | 'taxes'
  | 'orders'
  | 'order_lines'
  | 'transactions'
  | 'shipments'
  | 'customs_dispatches'
  | 'reports'
  | 'audit_logs'
  | 'support_tickets'
  | 'compliance_alerts';

const CD_PREFIX: Record<EntitySequence, string> = {
  users:              'USR-',
  companies:          'EMP-',
  products:           'PRD-',
  price_proposals:    'PP-',
  taxes:              'TAX-',
  orders:             'ORD-',
  order_lines:        'OL-',
  transactions:       'TRX-',
  shipments:          'SHP-',
  customs_dispatches: 'DSP-',
  reports:            'RPT-',
  audit_logs:         'LOG-',
  support_tickets:    'TKT-',
  compliance_alerts:  'ALT-',
};

@Injectable()
export class CodeGeneratorService {
  constructor(private prisma: PrismaService) {}

  async generate(entity: EntitySequence): Promise<string> {
    const prefix = CD_PREFIX[entity];
    const result = await this.prisma.$queryRaw<[{ cd: string }]>`
      SELECT next_cd(${entity}::VARCHAR, ${prefix}::VARCHAR) AS cd
    `;
    return result[0].cd;
  }
}
