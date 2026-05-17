import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { paginate, PaginationDto } from '../../common/dto/pagination.dto';
import type { AuthUser } from '../../common/types/auth-user.type';
import { AlertType, AlertSeverity } from '@prisma/client';

// ── Detector automático ──────────────────────────────────────────────────────

export interface AlertPayload {
  alertType:  AlertType;
  severity:   AlertSeverity;
  entityId:   string;
  entityType: string;
  metadata?:  Record<string, any>;
}

@Injectable()
export class ComplianceAlertsService {
  constructor(
    private prisma:   PrismaService,
    private codeGen:  CodeGeneratorService,
  ) {}

  // ── Criação interna (chamada por outros serviços) ─────────────────────────

  async createAlert(payload: AlertPayload): Promise<void> {
    // Evitar duplicados: não criar o mesmo tipo de alerta para a mesma entidade em 24h
    const recentDuplicate = await this.prisma.complianceAlert.findFirst({
      where: {
        alertType:  payload.alertType,
        entityId:   payload.entityId,
        entityType: payload.entityType,
        createdAt:  { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recentDuplicate) return;

    const cd = await this.codeGen.generate('compliance_alerts');
    await this.prisma.complianceAlert.create({
      data: {
        cd,
        alertType:  payload.alertType,
        severity:   payload.severity,
        entityId:   payload.entityId,
        entityType: payload.entityType,
        detectedBy: 'system',
        metadata:   payload.metadata ?? {},
      },
    });
  }

  // ── Detecção: Transação de alto valor (> $5.000) ──────────────────────────

  async checkHighValueTransaction(orderId: string, totalAmount: number, companyId: string): Promise<void> {
    if (totalAmount < 5000) return;

    const severity: AlertSeverity = totalAmount >= 50000 ? 'critical'
                                  : totalAmount >= 20000 ? 'high'
                                  : 'medium';

    await this.createAlert({
      alertType:  'high_value_transaction',
      severity,
      entityId:   orderId,
      entityType: 'order',
      metadata:   { totalAmount, companyId, threshold: 5000 },
    });
  }

  // ── Detecção: Empresa recentemente licenciada com transação alta ──────────

  async checkRecentlyLicensedCompany(companyId: string, orderId: string, totalAmount: number): Promise<void> {
    const company = await this.prisma.company.findUnique({
      where:  { id: companyId },
      select: { licenseExpiresAt: true, createdAt: true },
    });
    if (!company) return;

    const daysSinceLicense = Math.floor(
      (Date.now() - company.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceLicense <= 30 && totalAmount >= 2000) {
      await this.createAlert({
        alertType:  'recently_licensed_company',
        severity:   'medium',
        entityId:   companyId,
        entityType: 'company',
        metadata:   { daysSinceLicense, orderAmount: totalAmount, orderId },
      });
    }
  }

  // ── Detecção: Buyer com pedidos bloqueados anteriores ─────────────────────

  async checkBlockedOrderHistory(buyerId: string, orderId: string): Promise<void> {
    const blockedCount = await this.prisma.order.count({
      where: { buyerId, status: 'blocked' },
    });
    if (blockedCount === 0) return;

    await this.createAlert({
      alertType:  'blocked_user_activity',
      severity:   blockedCount >= 3 ? 'high' : 'medium',
      entityId:   buyerId,
      entityType: 'user',
      metadata:   { blockedOrdersCount: blockedCount, currentOrderId: orderId },
    });
  }

  // ── Detecção: Embarque retido com mercadoria de alto valor ────────────────

  async checkHeldShipment(shipmentId: string, orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where:  { id: orderId },
      select: { totalAmount: true },
    });
    if (!order) return;

    const amount = Number(order.totalAmount ?? 0);
    await this.createAlert({
      alertType:  'customs_evasion_attempt',
      severity:   amount >= 10000 ? 'high' : 'medium',
      entityId:   shipmentId,
      entityType: 'shipment',
      metadata:   { orderAmount: amount, orderId },
    });
  }

  // ── CRUD endpoints ────────────────────────────────────────────────────────

  async findAll(pagination: PaginationDto, filters: {
    severity?: string; alertType?: string; status?: string; entityType?: string;
  }) {
    const page  = pagination.page  ?? 1;
    const limit = pagination.limit ?? 20;
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (filters.severity)   where.severity   = filters.severity;
    if (filters.alertType)  where.alertType  = filters.alertType;
    if (filters.status)     where.status     = filters.status;
    if (filters.entityType) where.entityType = filters.entityType;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.complianceAlert.findMany({
        where, skip, take: limit,
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        include: {
          reviewer: { select: { id: true, fullName: true, role: true } },
          resolver: { select: { id: true, fullName: true, role: true } },
        },
      }),
      this.prisma.complianceAlert.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async summary() {
    const [bySeverity, byStatus, byType] = await this.prisma.$transaction([
      this.prisma.complianceAlert.groupBy({ by: ['severity'], _count: true, orderBy: { severity: 'asc' } }),
      this.prisma.complianceAlert.groupBy({ by: ['status'],   _count: true, orderBy: { status:   'asc' } }),
      this.prisma.complianceAlert.groupBy({ by: ['alertType'], _count: true, orderBy: { alertType: 'asc' }, take: 5 }),
    ]);

    const open     = await this.prisma.complianceAlert.count({ where: { status: 'open' } });
    const critical = await this.prisma.complianceAlert.count({ where: { status: 'open', severity: 'critical' } });

    return {
      open, critical,
      bySeverity: Object.fromEntries(bySeverity.map(r => [r.severity, r._count])),
      byStatus:   Object.fromEntries(byStatus.map(r => [r.status, r._count])),
      topTypes:   byType.map(r => ({ type: r.alertType, count: r._count })),
    };
  }

  async findOne(id: string) {
    return this.prisma.complianceAlert.findUniqueOrThrow({
      where:   { id },
      include: {
        reviewer: { select: { id: true, fullName: true, role: true } },
        resolver: { select: { id: true, fullName: true, role: true } },
      },
    });
  }

  async markUnderReview(id: string, user: AuthUser) {
    return this.prisma.complianceAlert.update({
      where: { id },
      data:  { status: 'under_review', reviewedBy: user.id },
    });
  }

  async resolve(id: string, notes: string, user: AuthUser) {
    return this.prisma.complianceAlert.update({
      where: { id },
      data:  { status: 'resolved', resolvedBy: user.id, resolvedAt: new Date(), notes },
    });
  }

  async dismiss(id: string, notes: string, user: AuthUser) {
    return this.prisma.complianceAlert.update({
      where: { id },
      data:  { status: 'dismissed', resolvedBy: user.id, resolvedAt: new Date(), notes },
    });
  }
}
