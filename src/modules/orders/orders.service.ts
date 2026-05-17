import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TaxEngineService } from '../../common/services/tax-engine.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { TransactionsService } from '../transactions/transactions.service';
import { StorageService } from '../../common/services/storage.service';
import { PdfGeneratorService } from '../../common/services/pdf-generator.service';
import { ConfigService } from '@nestjs/config';
import { ComplianceAlertsService } from '../compliance-alerts/compliance-alerts.service';
import { paginate, PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { BlockOrderDto } from './dto/block-order.dto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidOrCd(value: string): { id: string } | { cd: string } {
  return UUID_REGEX.test(value) ? { id: value } : { cd: value };
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma:        PrismaService,
    private audit:         AuditService,
    private codeGen:       CodeGeneratorService,
    private taxEngine:     TaxEngineService,
    private transactions:  TransactionsService,
    private storage:       StorageService,
    private pdfGen:        PdfGeneratorService,
    private config:        ConfigService,
    private compliance:    ComplianceAlertsService,
  ) {}

  async create(dto: CreateOrderDto, user: AuthUser) {
    // companyId vem do JWT — o BUYER não o informa
    const companyId = user.companyId;
    if (!companyId) {
      throw new BadRequestException('A sua conta não está associada a nenhuma empresa');
    }

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Empresa não encontrada');
    if (company.licenseStatus !== 'active') {
      throw new BadRequestException(
        `A empresa "${company.name}" não tem licença activa (estado: ${company.licenseStatus})`,
      );
    }

    // Resolver cada linha: validar produto + encontrar price proposal aprovada e vigente
    const today = new Date();
    const resolvedLines: { productId: string; priceProposalId: string; qty: number; unitPrice: number }[] = [];

    for (const line of dto.lines) {
      // 1. Produto existe e está publicado oficialmente
      const product = await this.prisma.product.findUnique({ where: { id: line.productId } });
      if (!product) {
        throw new NotFoundException(`Produto com ID "${line.productId}" não encontrado`);
      }
      if (product.status !== 'published_official') {
        throw new BadRequestException(
          `O produto "${product.name}" não está disponível para pedidos (estado: ${product.status})`,
        );
      }

      // 2. Encontrar a price proposal aprovada e vigente mais recente para este produto
      const proposal = await this.prisma.priceProposal.findFirst({
        where: {
          productId: line.productId,
          status:    'approved',
          AND: [
            { OR: [{ validFrom: null }, { validFrom: { lte: today } }] },
            { OR: [{ validTo: null },   { validTo:   { gte: today } }] },
          ],
        },
        orderBy: { approvedAt: 'desc' },
      });

      if (!proposal || !proposal.snapshot) {
        throw new BadRequestException(
          `O produto "${product.name}" não tem proposta de preço aprovada e vigente. ` +
          `Contacte o SPECIALIST responsável.`,
        );
      }

      const snapshot = proposal.snapshot as Record<string, any>;
      resolvedLines.push({
        productId:       line.productId,
        priceProposalId: proposal.id,
        qty:             line.qty,
        unitPrice:       snapshot['approvedPriceUsd'] as number,
      });
    }

    // Criar o pedido com tudo resolvido
    const cd = await this.codeGen.generate('orders');
    const linesCd = await Promise.all(resolvedLines.map(() => this.codeGen.generate('order_lines')));

    const order = await this.prisma.order.create({
      data: {
        cd,
        buyerId:   user.id,
        companyId,
        status:    'draft',
        lines: {
          create: resolvedLines.map((l, i) => ({
            cd:              linesCd[i],
            productId:       l.productId,
            priceProposalId: l.priceProposalId,
            qty:             l.qty,
            unitPrice:       l.unitPrice,
          })),
        },
      },
      include: {
        lines: {
          include: { product: { select: { id: true, name: true, category: true } } },
        },
      },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'CREATE_ORDER',
      entity: 'order', entityId: order.id,
      after:  { status: 'draft', companyId, lines: resolvedLines.length },
    });

    return order;
  }

  async update(orderId: string, dto: UpdateOrderDto, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { lines: true },
    });

    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.buyerId !== user.id) throw new ForbiddenException('Acesso negado — este pedido não lhe pertence');
    if (order.status !== 'draft') throw new BadRequestException('Apenas pedidos em draft podem ser editados');

    const companyId = user.companyId;
    if (!companyId) throw new BadRequestException('A sua conta não está associada a nenhuma empresa');

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company || company.licenseStatus !== 'active') {
      throw new BadRequestException(`A empresa não tem licença activa`);
    }

    // Resolver novas linhas (mesma lógica do create)
    const today = new Date();
    const resolvedLines: { productId: string; priceProposalId: string; qty: number; unitPrice: number }[] = [];

    for (const line of dto.lines) {
      const product = await this.prisma.product.findUnique({ where: { id: line.productId } });
      if (!product) throw new NotFoundException(`Produto com ID "${line.productId}" não encontrado`);
      if (product.status !== 'published_official') {
        throw new BadRequestException(`O produto "${product.name}" não está disponível (estado: ${product.status})`);
      }

      const proposal = await this.prisma.priceProposal.findFirst({
        where: {
          productId: line.productId,
          status:    'approved',
          AND: [
            { OR: [{ validFrom: null }, { validFrom: { lte: today } }] },
            { OR: [{ validTo: null },   { validTo:   { gte: today } }] },
          ],
        },
        orderBy: { approvedAt: 'desc' },
      });

      if (!proposal?.snapshot) {
        throw new BadRequestException(`O produto "${product.name}" não tem proposta de preço aprovada e vigente`);
      }

      const snapshot = proposal.snapshot as Record<string, any>;
      resolvedLines.push({
        productId:       line.productId,
        priceProposalId: proposal.id,
        qty:             line.qty,
        unitPrice:       snapshot['approvedPriceUsd'] as number,
      });
    }

    // Apagar linhas antigas e criar novas numa transacção
    const linesCd = await Promise.all(resolvedLines.map(() => this.codeGen.generate('order_lines')));

    await this.prisma.$transaction([
      this.prisma.orderLine.deleteMany({ where: { orderId } }),
      this.prisma.orderLine.createMany({
        data: resolvedLines.map((l, i) => ({
          cd:              linesCd[i],
          orderId,
          productId:       l.productId,
          priceProposalId: l.priceProposalId,
          qty:             l.qty,
          unitPrice:       l.unitPrice,
        })),
      }),
    ]);

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'UPDATE_ORDER',
      entity: 'order', entityId: orderId,
      before: { lines: order.lines.length },
      after:  { lines: resolvedLines.length },
    });

    return this.prisma.order.findUnique({
      where:   { id: orderId },
      include: {
        lines: { include: { product: { select: { id: true, name: true, category: true } } } },
      },
    });
  }

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<any>> {
    const page  = pagination.page  ?? 1;
    const limit = pagination.limit ?? 20;
    const skip  = (page - 1) * limit;

    const include = { buyer: { select: { id: true, fullName: true } }, company: { select: { id: true, name: true } }, lines: true };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({ skip, take: limit, include, orderBy: { createdAt: 'desc' } }),
      this.prisma.order.count(),
    ]);

    return paginate(data, total, page, limit);
  }

  async findMyOrders(user: AuthUser, pagination: PaginationDto): Promise<PaginatedResult<any>> {
    const page  = pagination.page  ?? 1;
    const limit = pagination.limit ?? 20;
    const skip  = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({ where: { buyerId: user.id }, skip, take: limit, include: { lines: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.order.count({ where: { buyerId: user.id } }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string, user?: AuthUser) {
    const where = isUuidOrCd(id);
    const order = await this.prisma.order.findFirst({
      where,
      include: {
        buyer:   { select: { id: true, fullName: true } },
        company: { select: { id: true, name: true, country: true } },
        lines:   { include: { product: true, priceProposal: true } },
      },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');

    // BUYER só pode ver os seus próprios pedidos
    if (user?.role === 'buyer' && order.buyerId !== user.id) {
      throw new ForbiddenException('Acesso negado — este pedido não lhe pertence');
    }

    return order;
  }

  async pay(orderId: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where:   { id: orderId },
      include: {
        lines:   { include: { priceProposal: true, product: true } },
        company: true,
      },
    });

    if (!order)                    throw new NotFoundException('Pedido não encontrado');
    if (order.buyerId !== user.id) throw new ForbiddenException('Acesso negado');
    if (order.status !== 'draft')  throw new BadRequestException('Pedido não está em draft');

    let netAmount = 0;
    let taxAmount = 0;

    for (const line of order.lines) {
      // O snapshot foi resolvido no create() — esta verificação é uma rede de segurança
      const snapshot = line.priceProposal?.snapshot as Record<string, any> | null;
      if (!snapshot) {
        throw new BadRequestException(
          `Linha do produto "${line.product.name}" não tem snapshot de preço. Pedido inválido — contacte o suporte.`,
        );
      }

      const unitPrice = Number(line.unitPrice);
      const taxRate   = await this.taxEngine.getRate(
        order.company.country,
        line.product.category,
      );

      const lineNet = unitPrice * line.qty;
      const lineTax = lineNet * taxRate;

      await this.prisma.orderLine.update({
        where: { id: line.id },
        data: {
          taxRate,
          taxAmount:   lineTax,
          lineTotal:   lineNet + lineTax,
          snapshotRef: snapshot,
        },
      });

      netAmount += lineNet;
      taxAmount += lineTax;
    }

    const totalAmount = netAmount + taxAmount;

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status:      'paid',
        totalAmount,
        taxAmount,
        netAmount,
        paidAt:      new Date(),
      },
    });

    const transaction = await this.transactions.create({
      orderId:  orderId,
      amount:   totalAmount,
      currency: order.currency,
    });

    // Gerar Fatura e Recibo PDF (best-effort)
    try {
      const railwayUrl = this.config.get<string>('RAILWAY_STATIC_URL');
      const appUrl = this.config.get<string>('APP_URL')
        ?? (railwayUrl ? `https://${railwayUrl}` : 'http://localhost:3000');

      const buyerCompany  = order.company;
      const producerLines = order.lines.map(l => ({
        productName: l.product.name,
        category:    l.product.category,
        qty:         l.qty,
        unitPrice:   Number(l.unitPrice),
        taxRate:     Number(l.taxRate ?? 0),
        taxAmount:   Number(l.taxAmount ?? 0),
        lineTotal:   Number(l.lineTotal ?? 0),
      }));

      const invoiceBuf = await this.pdfGen.generateInvoice({
        orderCd:       updated.cd,
        transactionCd: transaction.cd,
        issuedAt:      new Date(),
        seller: { companyName: 'Corredor do Lobito', licenseNumber: null, country: 'angola', address: null },
        buyer:  { companyName: buyerCompany.name, licenseNumber: buyerCompany.licenseNumber, country: buyerCompany.country },
        lines:  producerLines,
        netAmount,
        taxAmount,
        totalAmount,
        currency:    order.currency,
        verifyUrl:   `${appUrl}/verify/invoice/${orderId}`,
      });

      const receiptBuf = await this.pdfGen.generateReceipt({
        transactionCd: transaction.cd,
        orderCd:       updated.cd,
        amount:        totalAmount,
        currency:      order.currency,
        paidAt:        new Date(),
        method:        'bank_transfer',
        verifyUrl:     `${appUrl}/verify/receipt/${transaction.id}`,
      });

      const [inv, rec] = await Promise.all([
        this.storage.upload('emitted-docs', `invoices/${orderId}/fatura-${updated.cd}.pdf`, invoiceBuf, 'application/pdf'),
        this.storage.upload('emitted-docs', `receipts/${transaction.id}/recibo-${transaction.cd}.pdf`, receiptBuf, 'application/pdf'),
      ]);

      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data:  { invoiceUrl: inv.storageUrl, receiptUrl: rec.storageUrl },
      });
    } catch (_) {
      // PDF é best-effort — não bloqueia o pagamento
    }

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'PAY_ORDER',
      entity: 'order', entityId: orderId,
      after:  { status: 'paid', totalAmount, taxAmount, netAmount },
    });

    // Detecção automática de compliance (best-effort)
    Promise.allSettled([
      this.compliance.checkHighValueTransaction(orderId, totalAmount, order.companyId),
      this.compliance.checkRecentlyLicensedCompany(order.companyId, orderId, totalAmount),
      this.compliance.checkBlockedOrderHistory(user.id, orderId),
    ]).catch(() => {/* silencioso */});

    return updated;
  }

  async block(orderId: string, dto: BlockOrderDto, user: AuthUser) {
    const order = await this.findOrFail(orderId);

    if (['cancelled', 'blocked'].includes(order.status)) {
      throw new BadRequestException('Pedido já está bloqueado ou cancelado');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status:       'blocked',
        blockedReason: dto.reason,
        blockedById:   user.id,
        blockedAt:     new Date(),
      },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'BLOCK_ORDER',
      entity: 'order', entityId: orderId,
      before: { status: order.status },
      after:  { status: 'blocked', reason: dto.reason },
    });

    return updated;
  }

  async escalateToState(orderId: string, user: AuthUser) {
    const order = await this.findOrFail(orderId);

    if (['cancelled', 'blocked', 'paid'].includes(order.status)) {
      throw new BadRequestException(
        `Pedido em estado "${order.status}" não pode ser escalado ao STATE`,
      );
    }

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'ESCALATE_TO_STATE',
      entity: 'order', entityId: orderId,
      after:  { status: order.status, escalatedBy: user.id, note: 'STAFF escalou pedido ao STATE para decisão' },
    });

    return { ...order, message: 'Pedido escalado ao STATE para decisão. Audit log registado.' };
  }

  async cancel(orderId: string, user: AuthUser) {
    const order = await this.findOrFail(orderId);

    if (order.status === 'paid') {
      throw new BadRequestException('Pedidos pagos não podem ser cancelados — contactar STATE para reembolso');
    }
    if (order.status === 'cancelled') {
      throw new BadRequestException('Pedido já se encontra cancelado');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data:  { status: 'cancelled' },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'CANCEL_ORDER',
      entity: 'order', entityId: orderId,
      before: { status: order.status },
      after:  { status: 'cancelled' },
    });

    return updated;
  }

  async getInvoicePdf(orderId: string, user: AuthUser) {
    const order = await this.findOrFail(orderId);
    if (order.buyerId !== user.id && !['state','staff','compliance','specialist','analyst'].includes(user.role)) {
      throw new ForbiddenException('Acesso negado');
    }
    const trx = await this.prisma.transaction.findUnique({ where: { orderId } });
    if (!trx?.invoiceUrl) throw new NotFoundException('Fatura ainda não foi gerada. O pedido deve estar pago.');
    const path = trx.invoiceUrl.replace('https://paydpuwjjuezmjfzxmvi.supabase.co/storage/v1/object/public/', '');
    const [bucket, ...rest] = path.split('/');
    const signedUrl = await this.storage.getSignedUrl(bucket, rest.join('/'), 3600);
    return { signedUrl, fileName: `fatura-${order.cd}.pdf`, expiresIn: 3600 };
  }

  async getReceiptPdf(orderId: string, user: AuthUser) {
    const order = await this.findOrFail(orderId);
    if (order.buyerId !== user.id && !['state','staff','compliance','specialist','analyst'].includes(user.role)) {
      throw new ForbiddenException('Acesso negado');
    }
    const trx = await this.prisma.transaction.findUnique({ where: { orderId } });
    if (!trx?.receiptUrl) throw new NotFoundException('Recibo ainda não foi gerado. O pedido deve estar pago.');
    const path = trx.receiptUrl.replace('https://paydpuwjjuezmjfzxmvi.supabase.co/storage/v1/object/public/', '');
    const [bucket, ...rest] = path.split('/');
    const signedUrl = await this.storage.getSignedUrl(bucket, rest.join('/'), 3600);
    return { signedUrl, fileName: `recibo-${trx.cd}.pdf`, expiresIn: 3600 };
  }

  private async findOrFail(id: string) {
    const order = await this.prisma.order.findFirst({ where: isUuidOrCd(id) });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    return order;
  }
}
