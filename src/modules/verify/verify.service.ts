import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VerifyService {
  constructor(private prisma: PrismaService) {}

  async verifyLicense(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true, cd: true, name: true, country: true, companyType: true,
        licenseStatus: true, licenseNumber: true, licenseExpiresAt: true,
        verifiedByState: true, licenseDocumentUrl: true,
      },
    });

    if (!company) throw new NotFoundException('Licença não encontrada.');

    const now = new Date();
    const isExpired = company.licenseExpiresAt ? company.licenseExpiresAt < now : false;
    const isValid   = company.licenseStatus === 'active' && !isExpired;

    return {
      valid:           isValid,
      type:            'license',
      documentCode:    company.licenseNumber ?? 'N/A',
      entity:          company.name,
      entityCode:      company.cd,
      country:         company.country,
      status:          company.licenseStatus.toUpperCase(),
      licenseNumber:   company.licenseNumber,
      expiresAt:       company.licenseExpiresAt,
      isExpired,
      verifiedByState: company.verifiedByState,
      hasDocument:     !!company.licenseDocumentUrl,
      verifiedAt:      new Date().toISOString(),
      message:         isValid
        ? '✅ Licença válida e activa no Corredor do Lobito.'
        : `❌ Licença inválida — estado: ${company.licenseStatus}${isExpired ? ' (expirada)' : ''}.`,
    };
  }

  async verifyInvoice(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where:   { id: orderId },
      select:  {
        id: true, cd: true, status: true, totalAmount: true,
        taxAmount: true, netAmount: true, currency: true, paidAt: true,
        company: { select: { name: true, country: true, licenseNumber: true } },
        transaction: { select: { cd: true, status: true, invoiceUrl: true } },
      },
    });

    if (!order) throw new NotFoundException('Fatura não encontrada.');

    const isValid = order.status === 'paid' && order.transaction?.status === 'completed';

    return {
      valid:           isValid,
      type:            'invoice',
      documentCode:    `FAT-${order.cd}`,
      orderCode:       order.cd,
      transactionCode: order.transaction?.cd ?? 'N/A',
      buyerCompany:    order.company.name,
      buyerCountry:    order.company.country,
      orderStatus:     order.status,
      totalAmount:     order.totalAmount,
      taxAmount:       order.taxAmount,
      netAmount:       order.netAmount,
      currency:        order.currency,
      paidAt:          order.paidAt,
      hasDocument:     !!order.transaction?.invoiceUrl,
      verifiedAt:      new Date().toISOString(),
      message:         isValid
        ? '✅ Fatura válida — pagamento confirmado no Corredor do Lobito.'
        : `❌ Fatura inválida — pedido em estado: ${order.status}.`,
    };
  }

  async verifyReceipt(transactionId: string) {
    const trx = await this.prisma.transaction.findUnique({
      where:  { id: transactionId },
      select: {
        id: true, cd: true, status: true, amount: true, currency: true,
        method: true, paidAt: true, receiptUrl: true,
        order: { select: { cd: true, status: true } },
      },
    });

    if (!trx) throw new NotFoundException('Recibo não encontrado.');

    const isValid = trx.status === 'completed';

    return {
      valid:           isValid,
      type:            'receipt',
      documentCode:    trx.cd,
      transactionCode: trx.cd,
      orderCode:       trx.order.cd,
      amount:          trx.amount,
      currency:        trx.currency,
      method:          trx.method,
      transactionStatus: trx.status,
      paidAt:          trx.paidAt,
      hasDocument:     !!trx.receiptUrl,
      verifiedAt:      new Date().toISOString(),
      message:         isValid
        ? '✅ Recibo válido — pagamento completado no Corredor do Lobito.'
        : `❌ Recibo inválido — transação em estado: ${trx.status}.`,
    };
  }

  async verifyDispatch(shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where:  { id: shipmentId },
      select: {
        id: true, cd: true, status: true, origin: true, destination: true, eta: true,
        order: { select: { cd: true } },
        customsDispatch: {
          select: { cd: true, status: true, validatedAt: true, dispatchDocumentUrl: true },
        },
      },
    });

    if (!shipment) throw new NotFoundException('Despacho não encontrado.');

    const dispatch  = shipment.customsDispatch;
    const isValid   = dispatch?.status === 'approved' && shipment.status === 'customs_approved';

    return {
      valid:          isValid,
      type:           'dispatch',
      documentCode:   dispatch?.cd ?? 'N/A',
      shipmentCode:   shipment.cd,
      orderCode:      shipment.order?.cd,
      origin:         shipment.origin,
      destination:    shipment.destination,
      eta:            shipment.eta,
      shipmentStatus: shipment.status,
      dispatchStatus: dispatch?.status ?? 'N/A',
      approvedAt:     dispatch?.validatedAt,
      hasDocument:    !!dispatch?.dispatchDocumentUrl,
      verifiedAt:     new Date().toISOString(),
      message:        isValid
        ? '✅ Despacho válido — embarque aprovado pela alfândega do Corredor do Lobito.'
        : `❌ Despacho inválido — estado do embarque: ${shipment.status}.`,
    };
  }
}
