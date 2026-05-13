import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function nextCd(prisma: PrismaClient, entity: string, prefix: string): Promise<string> {
  const result = await prisma.$queryRaw<[{ cd: string }]>`
    SELECT next_cd(${entity}::VARCHAR, ${prefix}::VARCHAR) AS cd
  `;
  return result[0].cd;
}

const prisma = new PrismaClient();
const PASSWORD = 'Lobito@Dev2024!';

async function main() {

  // ════════════════════════════════════════════════════════════
  // 1. UTILIZADORES (7 roles)
  // ════════════════════════════════════════════════════════════
  const hash = await bcrypt.hash(PASSWORD, 10);

  const usersData = [
    { email: 'admin@lobito.gov',       role: 'admin',      fullName: 'System Administrator'  },
    { email: 'state@lobito.gov',       role: 'state',      fullName: 'State Authority'       },
    { email: 'staff@lobito.gov',       role: 'staff',      fullName: 'Staff Officer'         },
    { email: 'specialist@lobito.gov',  role: 'specialist', fullName: 'Price Specialist'      },
    { email: 'analyst@lobito.gov',     role: 'analyst',    fullName: 'Data Analyst'          },
    { email: 'compliance@lobito.gov',  role: 'compliance', fullName: 'Compliance Officer'    },
    { email: 'producer@lobito.biz',    role: 'producer',   fullName: 'Product Producer'      },
    { email: 'buyer@lobito.biz',       role: 'buyer',      fullName: 'Buyer Corp'            },
    { email: 'operator@lobito.biz',    role: 'operator',   fullName: 'Logistics Operator'    },
    { email: 'customs@lobito.gov',     role: 'customs',    fullName: 'Customs Officer'       },
  ] as const;

  for (const u of usersData) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      const cd = await nextCd(prisma, 'users', 'USR-');
      await prisma.user.create({ data: { ...u, cd, passwordHash: hash, status: 'active' } });
    }
  }

  const state    = await prisma.user.findUnique({ where: { email: 'state@lobito.gov' } });
  const producer = await prisma.user.findUnique({ where: { email: 'producer@lobito.biz' } });
  const buyer    = await prisma.user.findUnique({ where: { email: 'buyer@lobito.biz' } });
  const specialist = await prisma.user.findUnique({ where: { email: 'specialist@lobito.gov' } });
  const operator = await prisma.user.findUnique({ where: { email: 'operator@lobito.biz' } });
  const customs  = await prisma.user.findUnique({ where: { email: 'customs@lobito.gov' } });

  if (!state || !producer || !buyer || !specialist || !operator || !customs) {
    throw new Error('Utilizadores base não encontrados');
  }

  // ════════════════════════════════════════════════════════════
  // 2. REGRAS FISCAIS (7 países)
  // ════════════════════════════════════════════════════════════
  const taxRules = [
    { name: 'IVA Angola',     country: 'angola',     category: 'general', rate: 0.14 },
    { name: 'IVA Zâmbia',     country: 'zambia',     category: 'general', rate: 0.16 },
    { name: 'IVA RDC',        country: 'drc',        category: 'general', rate: 0.16 },
    { name: 'IVA Tanzânia',   country: 'tanzania',   category: 'general', rate: 0.18 },
    { name: 'IVA Zimbabwe',   country: 'zimbabwe',   category: 'general', rate: 0.15 },
    { name: 'IVA Moçambique', country: 'mozambique', category: 'general', rate: 0.17 },
    { name: 'IVA Global',     country: 'all',        category: 'general', rate: 0.15 },
  ];

  for (const t of taxRules) {
    const exists = await prisma.tax.findFirst({
      where: { country: t.country, category: t.category, name: t.name },
    });
    if (!exists) {
      const cd = await nextCd(prisma, 'taxes', 'TAX-');
      await prisma.tax.create({
        data: { ...t, cd, effectiveFrom: new Date('2024-01-01'), isActive: true, createdById: state.id },
      });
    }
  }

  // ════════════════════════════════════════════════════════════
  // 3. EMPRESAS (3 empresas activas)
  // ════════════════════════════════════════════════════════════
  const companiesData = [
    {
      name: 'Lobito Trade Lda',
      country: 'angola' as const,
      contactEmail: 'geral@lobitotrade.ao',
      contactPhone: '+244 923 100 001',
      address: 'Rua da Indústria, 42, Lobito, Angola',
    },
    {
      name: 'Zamco International',
      country: 'zambia' as const,
      contactEmail: 'info@zamco.zm',
      contactPhone: '+260 977 200 002',
      address: 'Cairo Road, 18, Lusaka, Zâmbia',
    },
    {
      name: 'Congo Minerals SARL',
      country: 'drc' as const,
      contactEmail: 'contact@congominerals.cd',
      contactPhone: '+243 810 300 003',
      address: 'Avenue Kasai, 7, Lubumbashi, RDC',
    },
  ];

  const companies: any[] = [];
  for (const c of companiesData) {
    let company = await prisma.company.findFirst({ where: { contactEmail: c.contactEmail } });
    if (!company) {
      const cd = await nextCd(prisma, 'companies', 'EMP-');
      company = await prisma.company.create({
        data: {
          ...c,
          cd,
          licenseStatus:     'active',
          licenseNumber:     `LIC-2026-00${companies.length + 1}`,
          licenseExpiresAt:  new Date('2028-12-31'),
          approvedByStateId: state.id,
          validatedByStaffId: state.id,
        },
      });

      const cdLog1 = await nextCd(prisma, 'audit_logs', 'LOG-');
      await prisma.auditLog.create({
        data: {
          cd: cdLog1,
          userId: state.id, role: 'state',
          action: 'APPROVE_LICENSE', entity: 'company', entityId: company.id,
          afterJson: JSON.stringify({ licenseStatus: 'active' }),
        },
      });
    }
    companies.push(company);
  }

  // Ligar producer e buyer à primeira empresa
  await prisma.user.update({ where: { id: producer.id }, data: { companyId: companies[0].id } });
  await prisma.user.update({ where: { id: buyer.id    }, data: { companyId: companies[0].id } });

  // ════════════════════════════════════════════════════════════
  // 4. PRODUTOS (3 produtos publicados)
  // ════════════════════════════════════════════════════════════
  const productsData = [
    { name: 'Cimento Portland 50kg',     description: 'Cimento para construção civil de alta resistência', category: 'general' },
    { name: 'Ferro Corrugado 12mm',      description: 'Varão de ferro corrugado para betão armado',        category: 'general' },
    { name: 'Tijolo Cerâmico Furado',    description: 'Tijolo furado para alvenaria de vedação',           category: 'general' },
  ];

  const products: any[] = [];
  for (const p of productsData) {
    let product = await prisma.product.findFirst({
      where: { name: p.name, producerId: producer.id },
    });
    if (!product) {
      const cd = await nextCd(prisma, 'products', 'PRD-');
      product = await prisma.product.create({
        data: {
          ...p,
          cd,
          producerId:  producer.id,
          companyId:   companies[0].id,
          status:      'published_official',
          publishedAt: new Date('2026-01-15'),
        },
      });

      const cdLog2 = await nextCd(prisma, 'audit_logs', 'LOG-');
      await prisma.auditLog.create({
        data: {
          cd: cdLog2,
          userId: state.id, role: 'state',
          action: 'APPROVE_PUBLICATION', entity: 'product', entityId: product.id,
          afterJson: JSON.stringify({ status: 'published_official' }),
        },
      });
    }
    products.push(product);
  }

  // ════════════════════════════════════════════════════════════
  // 5. PRICE PROPOSALS (3 aprovadas com snapshot)
  // ════════════════════════════════════════════════════════════
  const pricesData = [
    { proposedPrice: 45.00,  productIdx: 0 },
    { proposedPrice: 120.00, productIdx: 1 },
    { proposedPrice: 8.50,   productIdx: 2 },
  ];

  const proposals: any[] = [];
  for (const pp of pricesData) {
    const product = products[pp.productIdx];
    let proposal = await prisma.priceProposal.findFirst({
      where: { productId: product.id, createdById: specialist.id, status: 'approved' },
    });
    if (!proposal) {
      const cd = await nextCd(prisma, 'price_proposals', 'PP-');
      const snapshot = {
        snapshotVersion:  '1.0',
        generatedAt:      new Date('2026-02-01').toISOString(),
        proposalId:       '',
        productId:        product.id,
        productName:      product.name,
        productCategory:  product.category,
        approvedPriceUsd: pp.proposedPrice,
        currency:         'USD',
        validFrom:        '2026-01-01T00:00:00.000Z',
        validTo:          '2026-12-31T23:59:59.000Z',
        immutable:        true,
      };

      proposal = await prisma.priceProposal.create({
        data: {
          cd,
          productId:     product.id,
          createdById:   specialist.id,
          approvedById:  state.id,
          status:        'approved',
          proposedPrice: pp.proposedPrice,
          currency:      'USD',
          justification: `Preço baseado na análise de mercado regional para ${product.name}`,
          snapshot,
          submittedAt:   new Date('2026-01-28'),
          approvedAt:    new Date('2026-02-01'),
          validFrom:     new Date('2026-01-01'),
          validTo:       new Date('2026-12-31'),
        },
      });

      // Actualizar snapshot com o id real da proposta
      await prisma.priceProposal.update({
        where: { id: proposal.id },
        data:  { snapshot: { ...snapshot, proposalId: proposal.id } },
      });

      const cdLog3 = await nextCd(prisma, 'audit_logs', 'LOG-');
      await prisma.auditLog.create({
        data: {
          cd: cdLog3,
          userId: state.id, role: 'state',
          action: 'APPROVE_PRICE_PROPOSAL', entity: 'price_proposal', entityId: proposal.id,
          afterJson: JSON.stringify({ status: 'approved', approvedPriceUsd: pp.proposedPrice }),
        },
      });
    }
    proposals.push(proposal);
  }

  // ════════════════════════════════════════════════════════════
  // 6. PEDIDOS (2 pedidos: 1 pago, 1 rascunho)
  // ════════════════════════════════════════════════════════════

  // Pedido 1 — PAGO (com cálculo de imposto Angola 14%)
  let order1 = await prisma.order.findFirst({
    where: { buyerId: buyer.id, status: 'paid' },
  });

  if (!order1) {
    const cdOrd1 = await nextCd(prisma, 'orders', 'ORD-');
    const cdLine1 = await nextCd(prisma, 'order_lines', 'OL-');
    order1 = await prisma.order.create({
      data: {
        cd:          cdOrd1,
        buyerId:     buyer.id,
        companyId:   companies[0].id,
        status:      'paid',
        netAmount:   450.00,
        taxAmount:   63.00,
        totalAmount: 513.00,
        currency:    'USD',
        paidAt:      new Date('2026-03-10'),
        lines: {
          create: {
            cd:              cdLine1,
            productId:       products[0].id,
            priceProposalId: proposals[0].id,
            qty:             10,
            unitPrice:       45.00,
            taxRate:         0.14,
            taxAmount:       63.00,
            lineTotal:       513.00,
            snapshotRef:     proposals[0].snapshot as any,
          },
        },
      },
    });

    const cdLog4 = await nextCd(prisma, 'audit_logs', 'LOG-');
    await prisma.auditLog.create({
      data: {
        cd: cdLog4,
        userId: buyer.id, role: 'buyer',
        action: 'PAY_ORDER', entity: 'order', entityId: order1.id,
        afterJson: JSON.stringify({ status: 'paid', totalAmount: 513.00, taxAmount: 63.00 }),
      },
    });
  }

  // Pedido 2 — RASCUNHO
  let order2 = await prisma.order.findFirst({
    where: { buyerId: buyer.id, status: 'draft' },
  });

  if (!order2) {
    const cdOrd2  = await nextCd(prisma, 'orders', 'ORD-');
    const cdLine2 = await nextCd(prisma, 'order_lines', 'OL-');
    const cdLine3 = await nextCd(prisma, 'order_lines', 'OL-');
    order2 = await prisma.order.create({
      data: {
        cd:        cdOrd2,
        buyerId:   buyer.id,
        companyId: companies[0].id,
        status:    'draft',
        currency:  'USD',
        lines: {
          create: [
            { cd: cdLine2, productId: products[1].id, priceProposalId: proposals[1].id, qty: 5,   unitPrice: 0 },
            { cd: cdLine3, productId: products[2].id, priceProposalId: proposals[2].id, qty: 100, unitPrice: 0 },
          ],
        },
      },
    });

    const cdLog5 = await nextCd(prisma, 'audit_logs', 'LOG-');
    await prisma.auditLog.create({
      data: {
        cd: cdLog5,
        userId: buyer.id, role: 'buyer',
        action: 'CREATE_ORDER', entity: 'order', entityId: order2.id,
        afterJson: JSON.stringify({ status: 'draft' }),
      },
    });
  }

  // ════════════════════════════════════════════════════════════
  // 6b. TRANSACÇÃO (criada automaticamente quando order é paga)
  // ════════════════════════════════════════════════════════════
  const existingTrx = await prisma.transaction.findUnique({ where: { orderId: order1.id } });
  if (!existingTrx) {
    const cdTrx = await nextCd(prisma, 'transactions', 'TRX-');
    await prisma.transaction.create({
      data: {
        cd:       cdTrx,
        orderId:  order1.id,
        amount:   513.00,
        currency: 'USD',
        method:   'bank_transfer',
        status:   'completed',
        paidAt:   new Date('2026-03-10'),
      },
    });
  }

  // ════════════════════════════════════════════════════════════
  // 7. EMBARQUES (1 aprovado pela alfândega)
  // ════════════════════════════════════════════════════════════
  let shipment = await prisma.shipment.findFirst({
    where: { orderId: order1.id },
  });

  if (!shipment) {
    const cdShip = await nextCd(prisma, 'shipments', 'SHP-');
    shipment = await prisma.shipment.create({
      data: {
        cd:          cdShip,
        orderId:     order1.id,
        operatorId:  operator.id,
        status:      'customs_approved',
        origin:      'Porto do Lobito, Angola',
        destination: 'Lusaka, Zâmbia',
        eta:         new Date('2026-03-20'),
        lastLocation: 'Lusaka, Zâmbia',
        trackingEvents: [
          { timestamp: new Date('2026-03-10T10:00:00Z').toISOString(), location: 'Porto do Lobito, Angola', status: 'created',          updatedBy: operator.id, notes: 'Embarque criado e documentação preparada' },
          { timestamp: new Date('2026-03-11T08:00:00Z').toISOString(), location: 'Estrada Nacional 100, km 45', status: 'in_transit',  updatedBy: operator.id, notes: 'Partida do porto' },
          { timestamp: new Date('2026-03-14T14:30:00Z').toISOString(), location: 'Fronteira Luau, Angola/RDC',  status: 'at_border',   updatedBy: operator.id, notes: 'Aguarda despacho aduaneiro' },
          { timestamp: new Date('2026-03-15T09:00:00Z').toISOString(), location: 'Fronteira Luau',              status: 'customs_approved', updatedBy: customs.id, notes: 'Aprovado pela alfândega' },
          { timestamp: new Date('2026-03-19T16:00:00Z').toISOString(), location: 'Lusaka, Zâmbia',              status: 'delivered',   updatedBy: operator.id, notes: 'Entregue no destino' },
        ],
      },
    });

    const cdDisp = await nextCd(prisma, 'customs_dispatches', 'DSP-');
    await prisma.customsDispatch.create({
      data: {
        cd:           cdDisp,
        shipmentId:   shipment.id,
        dispatcherId: customs.id,
        status:       'approved',
        notes:        'Documentação completa e conforme. Mercadoria aprovada.',
        validatedAt:  new Date('2026-03-15'),
      },
    });

    const cdLog6 = await nextCd(prisma, 'audit_logs', 'LOG-');
    await prisma.auditLog.create({
      data: {
        cd: cdLog6,
        userId: customs.id, role: 'customs',
        action: 'CUSTOMS_APPROVE', entity: 'shipment', entityId: shipment.id,
        afterJson: JSON.stringify({ status: 'customs_approved' }),
      },
    });
  }

  // ════════════════════════════════════════════════════════════
  // RESUMO
  // ════════════════════════════════════════════════════════════
  const counts = {
    users:             await prisma.user.count(),
    companies:         await prisma.company.count(),
    products:          await prisma.product.count(),
    priceProposals:    await prisma.priceProposal.count(),
    taxes:             await prisma.tax.count(),
    orders:            await prisma.order.count(),
    orderLines:        await prisma.orderLine.count(),
    transactions:      await prisma.transaction.count(),
    shipments:         await prisma.shipment.count(),
    customsDispatches: await prisma.customsDispatch.count(),
    reports:           await prisma.report.count(),
    auditLogs:         await prisma.auditLog.count(),
  };

  console.log('');
  console.log('✅ Seed completo — todas as tabelas populadas:');
  console.log('');
  console.log(`   USR  users              → ${counts.users} registos`);
  console.log(`   EMP  companies          → ${counts.companies} registos`);
  console.log(`   PRD  products           → ${counts.products} registos`);
  console.log(`   PP   price_proposals    → ${counts.priceProposals} registos`);
  console.log(`   TAX  taxes              → ${counts.taxes} registos`);
  console.log(`   ORD  orders             → ${counts.orders} registos`);
  console.log(`   OL   order_lines        → ${counts.orderLines} registos`);
  console.log(`   TRX  transactions       → ${counts.transactions} registos`);
  console.log(`   SHP  shipments          → ${counts.shipments} registos`);
  console.log(`   DSP  customs_dispatches → ${counts.customsDispatches} registos`);
  console.log(`   RPT  reports            → ${counts.reports} registos`);
  console.log(`   LOG  audit_logs         → ${counts.auditLogs} registos`);
  console.log('');
  console.log(`   Password: ${PASSWORD}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
