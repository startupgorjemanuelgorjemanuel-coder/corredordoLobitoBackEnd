import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type StatusRow = { status: string; count: bigint };

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // ── GET /dashboard ────────────────────────────────────────────────────────
  async getOverview() {
    const [
      companies,
      products,
      orders,
      transactions,
      shipments,
      reports,
      auditLogs,
      revenue,
    ] = await Promise.all([
      this.prisma.$queryRaw<StatusRow[]>`
        SELECT "licenseStatus"::text AS status, COUNT(*)::bigint AS count
        FROM companies GROUP BY "licenseStatus"`,
      this.prisma.$queryRaw<StatusRow[]>`
        SELECT status::text, COUNT(*)::bigint AS count
        FROM products GROUP BY status`,
      this.prisma.$queryRaw<StatusRow[]>`
        SELECT status::text, COUNT(*)::bigint AS count
        FROM orders GROUP BY status`,
      this.prisma.$queryRaw<StatusRow[]>`
        SELECT status::text, COUNT(*)::bigint AS count
        FROM transactions GROUP BY status`,
      this.prisma.$queryRaw<StatusRow[]>`
        SELECT status::text, COUNT(*)::bigint AS count
        FROM shipments GROUP BY status`,
      this.prisma.$queryRaw<StatusRow[]>`
        SELECT status::text, COUNT(*)::bigint AS count
        FROM reports GROUP BY status`,
      this.prisma.auditLog.count(),
      this.prisma.transaction.aggregate({
        where: { status: 'completed' },
        _sum:  { amount: true },
        _count: true,
      }),
    ]);

    return {
      companies:    this.toMap(companies),
      products:     this.toMap(products),
      orders:       this.toMap(orders),
      transactions: this.toMap(transactions),
      shipments:    this.toMap(shipments),
      reports:      this.toMap(reports),
      auditLogs:    { total: auditLogs },
      revenue: {
        totalCompleted: Number(revenue._sum.amount ?? 0),
        completedCount: revenue._count,
        currency:       'USD',
      },
    };
  }

  // ── GET /dashboard/metrics ────────────────────────────────────────────────
  async getMetrics() {
    const now = new Date();
    const d30 = new Date(now); d30.setDate(now.getDate() - 30);
    const d7  = new Date(now); d7.setDate(now.getDate() - 7);

    const [
      totalCompanies, activeCompanies, pendingCompanies,
      totalProducts, publishedProducts,
      totalOrders, paidOrders, blockedOrders,
      totalTransactions, blockedTransactions,
      totalShipments, approvedShipments, heldShipments,
      recentAuditLogs, recentOrders, recentTransactions,
      revenueAll, revenueMonth,
    ] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.company.count({ where: { licenseStatus: 'active' } }),
      this.prisma.company.count({ where: { licenseStatus: 'pending' } }),
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: 'published_official' } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'paid' } }),
      this.prisma.order.count({ where: { status: 'blocked' } }),
      this.prisma.transaction.count(),
      this.prisma.transaction.count({ where: { status: 'blocked' } }),
      this.prisma.shipment.count(),
      this.prisma.shipment.count({ where: { status: 'customs_approved' } }),
      this.prisma.shipment.count({ where: { status: 'held' } }),
      this.prisma.auditLog.count({ where: { createdAt: { gte: d7 } } }),
      this.prisma.order.count({ where: { createdAt: { gte: d30 } } }),
      this.prisma.transaction.count({ where: { createdAt: { gte: d30 } } }),
      this.prisma.transaction.aggregate({
        where: { status: 'completed' },
        _sum: { amount: true }, _avg: { amount: true },
        _max: { amount: true }, _min: { amount: true }, _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { status: 'completed', createdAt: { gte: d30 } },
        _sum: { amount: true }, _count: true,
      }),
    ]);

    return {
      generatedAt: now.toISOString(),
      periods:     { last7Days: d7.toISOString(), last30Days: d30.toISOString() },
      companies: {
        total: totalCompanies, active: activeCompanies, pending: pendingCompanies,
        approvalRate: this.pct(activeCompanies, totalCompanies),
      },
      products: {
        total: totalProducts, published: publishedProducts,
        publishRate: this.pct(publishedProducts, totalProducts),
      },
      orders: {
        total: totalOrders, paid: paidOrders, blocked: blockedOrders,
        last30Days: recentOrders,
      },
      transactions: {
        total: totalTransactions, blocked: blockedTransactions,
        last30Days: recentTransactions,
      },
      shipments: {
        total: totalShipments, approved: approvedShipments, held: heldShipments,
        approvalRate: this.pct(approvedShipments, totalShipments),
      },
      revenue: {
        allTime: {
          total:   Number(revenueAll._sum.amount   ?? 0),
          average: Number(revenueAll._avg.amount   ?? 0),
          max:     Number(revenueAll._max.amount   ?? 0),
          min:     Number(revenueAll._min.amount   ?? 0),
          count:   revenueAll._count,
        },
        last30Days: {
          total: Number(revenueMonth._sum.amount ?? 0),
          count: revenueMonth._count,
        },
        currency: 'USD',
      },
      auditActivity: { last7Days: recentAuditLogs },
    };
  }

  // ── GET /analytics/revenue ────────────────────────────────────────────────
  async getRevenueAnalytics() {
    const d90 = new Date(); d90.setDate(d90.getDate() - 90);

    const [allTime, byCountry, topProducts, monthly] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { status: 'completed' },
        _sum: { amount: true }, _count: true,
      }),

      this.prisma.$queryRaw<{ country: string; total: number; count: bigint }[]>`
        SELECT c.country::text,
               COALESCE(SUM(t.amount), 0)::float AS total,
               COUNT(t.id)::bigint               AS count
        FROM transactions t
        JOIN orders    o ON o.id = t."orderId"
        JOIN companies c ON c.id = o."companyId"
        WHERE t.status = 'completed'
        GROUP BY c.country
        ORDER BY total DESC`,

      this.prisma.$queryRaw<{ name: string; category: string; total: number; units: bigint }[]>`
        SELECT p.name::text, p.category::text,
               COALESCE(SUM(ol."lineTotal"), 0)::float AS total,
               SUM(ol.qty)::bigint                     AS units
        FROM order_lines ol
        JOIN products p ON p.id = ol."productId"
        JOIN orders   o ON o.id = ol."orderId"
        WHERE o.status = 'paid'
        GROUP BY p.id, p.name, p.category
        ORDER BY total DESC
        LIMIT 5`,

      this.prisma.$queryRaw<{ month: string; total: number; count: bigint }[]>`
        SELECT TO_CHAR(t."createdAt", 'YYYY-MM')  AS month,
               COALESCE(SUM(t.amount), 0)::float  AS total,
               COUNT(t.id)::bigint                AS count
        FROM transactions t
        WHERE t.status = 'completed' AND t."createdAt" >= ${d90}
        GROUP BY TO_CHAR(t."createdAt", 'YYYY-MM')
        ORDER BY month ASC`,
    ]);

    return {
      currency: 'USD',
      allTime:  { total: Number(allTime._sum.amount ?? 0), count: allTime._count },
      byCountry:   byCountry.map(r   => ({ country: r.country,   total: Number(r.total), count: Number(r.count) })),
      topProducts: topProducts.map(r => ({ name: r.name, category: r.category, total: Number(r.total), units: Number(r.units) })),
      monthly:     monthly.map(r     => ({ month: r.month,        total: Number(r.total), count: Number(r.count) })),
    };
  }

  // ── GET /analytics/logistics-performance ──────────────────────────────────
  async getLogisticsPerformance() {
    const [shipmentsByStatus, topRoutes, customsApproved, customsRejected, customsHeld, customsPending] =
      await Promise.all([
        this.prisma.$queryRaw<StatusRow[]>`
          SELECT status::text, COUNT(*)::bigint AS count FROM shipments GROUP BY status`,

        this.prisma.$queryRaw<{ route: string; count: bigint }[]>`
          SELECT (origin || ' → ' || destination)::text AS route, COUNT(id)::bigint AS count
          FROM shipments
          GROUP BY origin, destination
          ORDER BY count DESC
          LIMIT 5`,

        this.prisma.customsDispatch.count({ where: { status: 'approved' } }),
        this.prisma.customsDispatch.count({ where: { status: 'rejected' } }),
        this.prisma.customsDispatch.count({ where: { status: 'held' } }),
        this.prisma.customsDispatch.count({ where: { status: 'pending' } }),
      ]);

    const totalShipments    = shipmentsByStatus.reduce((s, r) => s + Number(r.count), 0);
    const totalDispatches   = customsApproved + customsRejected + customsHeld + customsPending;
    const approvedShipments = Number(shipmentsByStatus.find(r => r.status === 'customs_approved')?.count ?? 0);

    return {
      shipments: {
        total:        totalShipments,
        byStatus:     this.toMap(shipmentsByStatus),
        approvalRate: this.pct(approvedShipments, totalShipments),
      },
      customs: {
        total:        totalDispatches,
        approved:     customsApproved,
        rejected:     customsRejected,
        held:         customsHeld,
        pending:      customsPending,
        approvalRate: this.pct(customsApproved, totalDispatches),
      },
      topRoutes: topRoutes.map(r => ({ route: r.route, count: Number(r.count) })),
    };
  }

  // ── GET /analytics/compliance-score ───────────────────────────────────────
  async getComplianceScore() {
    const d30 = new Date(); d30.setDate(d30.getDate() - 30);

    const [
      totalCompanies, activeCompanies, suspendedCompanies,
      totalOrders, blockedOrders, cancelledOrders,
      totalTransactions, blockedTransactions,
      totalShipments, heldShipments, rejectedShipments,
      recentLogs, blockedLogs,
    ] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.company.count({ where: { licenseStatus: 'active' } }),
      this.prisma.company.count({ where: { licenseStatus: 'suspended' } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'blocked' } }),
      this.prisma.order.count({ where: { status: 'cancelled' } }),
      this.prisma.transaction.count(),
      this.prisma.transaction.count({ where: { status: 'blocked' } }),
      this.prisma.shipment.count(),
      this.prisma.shipment.count({ where: { status: 'held' } }),
      this.prisma.shipment.count({ where: { status: 'customs_rejected' } }),
      this.prisma.auditLog.count({ where: { createdAt: { gte: d30 } } }),
      this.prisma.auditLog.count({
        where: {
          createdAt: { gte: d30 },
          action: { in: ['BLOCK_ORDER', 'BLOCK_TRANSACTION', 'SUSPEND_COMPANY', 'HOLD_SHIPMENT', 'CUSTOMS_REJECT'] },
        },
      }),
    ]);

    const companyScore     = this.score(activeCompanies, totalCompanies);
    const orderScore       = this.score(totalOrders - blockedOrders - cancelledOrders, totalOrders);
    const transactionScore = this.score(totalTransactions - blockedTransactions, totalTransactions);
    const shipmentScore    = this.score(totalShipments - heldShipments - rejectedShipments, totalShipments);
    const overallScore     = Math.round((companyScore + orderScore + transactionScore + shipmentScore) / 4);

    return {
      generatedAt:  new Date().toISOString(),
      overallScore,
      riskLevel:    overallScore >= 90 ? 'LOW' : overallScore >= 75 ? 'MEDIUM' : overallScore >= 60 ? 'HIGH' : 'CRITICAL',
      scores: {
        companies:    { score: companyScore,     suspended: suspendedCompanies, total: totalCompanies },
        orders:       { score: orderScore,        blocked: blockedOrders,        cancelled: cancelledOrders, total: totalOrders },
        transactions: { score: transactionScore,  blocked: blockedTransactions,  total: totalTransactions },
        shipments:    { score: shipmentScore,     held: heldShipments,           rejected: rejectedShipments, total: totalShipments },
      },
      auditActivity: {
        last30Days:        recentLogs,
        blockedActions30d: blockedLogs,
        alertRate:         recentLogs > 0 ? Math.round((blockedLogs / recentLogs) * 100) + '%' : '0%',
      },
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private toMap(rows: { status: string; count: bigint }[]): Record<string, number> {
    return rows.reduce((acc, r) => { acc[r.status] = Number(r.count); return acc; }, {} as Record<string, number>);
  }

  private pct(part: number, total: number): string {
    return total > 0 ? Math.round((part / total) * 100) + '%' : '0%';
  }

  private score(ok: number, total: number): number {
    return total > 0 ? Math.round((Math.max(ok, 0) / total) * 100) : 100;
  }
}
