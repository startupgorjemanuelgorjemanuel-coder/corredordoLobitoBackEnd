import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');

export interface LicenseData {
  companyName:    string;
  companyCd:      string;
  companyCountry: string;
  companyType?:   string | null;
  contactEmail:   string;
  licenseNumber:  string;
  issuedAt:       Date;
  expiresAt:      Date;
  approvedByName: string;
  verifyUrl:      string;
}

export interface InvoiceData {
  orderCd:       string;
  transactionCd: string;
  issuedAt:      Date;
  seller: { companyName: string; licenseNumber?: string | null; country: string; address?: string | null };
  buyer:  { companyName: string; licenseNumber?: string | null; country: string };
  lines:  { productName: string; category: string; qty: number; unitPrice: number; taxRate: number; taxAmount: number; lineTotal: number }[];
  netAmount:   number;
  taxAmount:   number;
  totalAmount: number;
  currency:    string;
  verifyUrl:   string;
}

export interface ReceiptData {
  transactionCd: string;
  orderCd:       string;
  amount:        number;
  currency:      string;
  paidAt:        Date;
  method:        string;
  verifyUrl:     string;
}

export interface DispatchData {
  dispatchCd:     string;
  shipmentCd:     string;
  orderCd?:       string;
  approvedAt:     Date;
  approvedByName: string;
  origin:         string;
  destination:    string;
  verifyUrl:      string;
}

const COUNTRY_LABEL: Record<string, string> = {
  angola: 'Angola', zambia: 'Zâmbia', drc: 'RDC',
  tanzania: 'Tanzânia', zimbabwe: 'Zimbabwe', mozambique: 'Moçambique',
};

const METHOD_LABEL: Record<string, string> = {
  bank_transfer: 'Transferência Bancária', cash: 'Numerário',
  credit_card: 'Cartão de Crédito', letter_of_credit: 'Carta de Crédito', other: 'Outro',
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtMoney(v: number, cur = 'USD'): string {
  return `${v.toFixed(2)} ${cur}`;
}

const BRAND   = '#1a3a6b';
const SUCCESS = '#1a6b2b';

@Injectable()
export class PdfGeneratorService {

  private newDoc(opts: { size?: string; margins?: number } = {}): any {
    return new PDFDocument({
      size:    opts.size ?? 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info:    { Creator: 'Corredor do Lobito — Sistema Oficial' },
    });
  }

  private toBuffer(doc: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data',  (c: Buffer) => chunks.push(c));
      doc.on('end',   () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }

  private header(doc: any, title: string, code: string) {
    doc.rect(0, 0, doc.page.width, 70).fill(BRAND);
    doc.fillColor('white')
       .fontSize(16).font('Helvetica-Bold')
       .text('CORREDOR DO LOBITO', 50, 18, { align: 'left' });
    doc.fontSize(8).font('Helvetica')
       .text('Plataforma Oficial de Comércio Transfronteiriço', 50, 38);
    doc.fontSize(13).font('Helvetica-Bold')
       .text(title, 0, 18, { align: 'right', width: doc.page.width - 50 });
    doc.fontSize(9).font('Helvetica')
       .text(code, 0, 38, { align: 'right', width: doc.page.width - 50 });
    doc.fillColor('black').moveDown(4);
  }

  private footer(doc: any, verifyUrl: string) {
    const y = doc.page.height - 45;
    doc.rect(0, y, doc.page.width, 45).fill('#f5f5f5');
    doc.fillColor('#888888').fontSize(8).font('Helvetica')
       .text(`Verificar autenticidade em: ${verifyUrl}`, 50, y + 10)
       .text('Documento oficial — Corredor do Lobito', 50, y + 22);
    doc.fillColor('black');
  }

  private watermark(doc: any, text: string) {
    doc.save();
    doc.opacity(0.07);
    doc.fontSize(60).font('Helvetica-Bold').fillColor(BRAND)
       .rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] })
       .text(text, 0, doc.page.height / 2 - 30, { align: 'center', width: doc.page.width });
    doc.restore();
    doc.opacity(1).fillColor('black').fontSize(10).font('Helvetica');
  }

  private async qrBuffer(url: string): Promise<Buffer> {
    const dataUrl = await QRCode.toDataURL(url, { width: 120, margin: 1 });
    const base64  = dataUrl.replace(/^data:image\/png;base64,/, '');
    return Buffer.from(base64, 'base64');
  }

  private row(doc: any, label: string, value: string, y?: number) {
    const yPos = y ?? doc.y;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#555555')
       .text(label, 50, yPos);
    doc.fontSize(10).font('Helvetica').fillColor('black')
       .text(value, 50, doc.y);
    doc.moveDown(0.4);
  }

  // ── A1: Licença Comercial ────────────────────────────────────────────────

  async generateLicense(data: LicenseData): Promise<Buffer> {
    const doc  = this.newDoc();
    const qr   = await this.qrBuffer(data.verifyUrl);

    this.header(doc, 'LICENÇA COMERCIAL', data.licenseNumber);
    this.watermark(doc, 'DOCUMENTO OFICIAL');

    // Caixa empresa
    doc.rect(50, doc.y, doc.page.width - 100, 60).fill('#f0f4ff').stroke(BRAND);
    doc.fillColor(BRAND).fontSize(8).font('Helvetica-Bold')
       .text('EMPRESA LICENCIADA', 65, doc.y - 55);
    doc.fillColor(BRAND).fontSize(16).font('Helvetica-Bold')
       .text(data.companyName, 65, doc.y - 40);
    doc.fillColor('#555').fontSize(9).font('Helvetica')
       .text(`Código: ${data.companyCd}`, 65, doc.y - 22);
    doc.fillColor('black').moveDown(3.5);

    // Duas colunas
    const colLeft  = 50;
    const colRight = doc.page.width / 2 + 10;
    const startY   = doc.y;

    // Coluna esquerda — dados da licença
    doc.fontSize(11).font('Helvetica-Bold').fillColor(BRAND)
       .text('DADOS DA LICENÇA', colLeft, startY);
    doc.moveDown(0.4);
    this.row(doc, 'Número de Licença', data.licenseNumber);
    this.row(doc, 'Data de Emissão', fmtDate(data.issuedAt));
    this.row(doc, 'Válida até', fmtDate(data.expiresAt));
    this.row(doc, 'País de Operação', COUNTRY_LABEL[data.companyCountry] ?? data.companyCountry);
    if (data.companyType) this.row(doc, 'Tipo de Empresa', data.companyType);
    this.row(doc, 'Email de Contacto', data.contactEmail);

    // Coluna direita — QR Code
    doc.image(qr, colRight, startY, { width: 120 });
    doc.fontSize(8).fillColor('#888')
       .text('Escanear para verificar', colRight, startY + 124, { width: 120, align: 'center' });

    doc.fillColor('black').moveDown(1);

    // Linha separadora
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke('#cccccc');
    doc.moveDown(0.8);

    // Declaração
    doc.fontSize(10).font('Helvetica-Bold').fillColor(BRAND).text('DECLARAÇÃO OFICIAL');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#333')
       .text(`A presente licença certifica que a empresa ${data.companyName} está devidamente registada e autorizada a realizar operações comerciais transfronteiriças no âmbito do Corredor do Lobito, nos termos da legislação aplicável.`);
    doc.moveDown(1.5);

    // Assinatura
    doc.moveTo(50, doc.y).lineTo(230, doc.y).stroke('#333');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica-Bold').text(data.approvedByName, 50, doc.y);
    doc.fontSize(9).font('Helvetica').fillColor('#555')
       .text('Autoridade Governamental — STATE', 50, doc.y);
    doc.text(fmtDate(data.issuedAt), 50, doc.y);
    doc.fillColor(SUCCESS).fontSize(13).font('Helvetica-Bold')
       .text('✓ LICENÇA ACTIVA', doc.page.width / 2, doc.y - 30, { align: 'right' });

    this.footer(doc, data.verifyUrl);
    return this.toBuffer(doc);
  }

  // ── A2: Fatura Comercial ─────────────────────────────────────────────────

  async generateInvoice(data: InvoiceData): Promise<Buffer> {
    const doc = this.newDoc();
    const qr  = await this.qrBuffer(data.verifyUrl);

    this.header(doc, 'FATURA COMERCIAL', `FAT-${data.orderCd}`);
    this.watermark(doc, 'DOCUMENTO OFICIAL');

    const startY = doc.y;
    const w3     = (doc.page.width - 100) / 3;

    // 3 colunas: vendedor | comprador | referências
    const cols = [50, 50 + w3 + 10, 50 + w3 * 2 + 20];

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#555');
    doc.text('VENDEDOR', cols[0], startY);
    doc.text('COMPRADOR', cols[1], startY);
    doc.text('FATURA', cols[2], startY);

    doc.fontSize(10).font('Helvetica-Bold').fillColor('black');
    doc.text(data.seller.companyName, cols[0], doc.y);
    doc.fontSize(8).font('Helvetica').fillColor('#555')
       .text(`Licença: ${data.seller.licenseNumber ?? 'N/A'}`, cols[0], doc.y)
       .text(COUNTRY_LABEL[data.seller.country] ?? data.seller.country, cols[0], doc.y);

    // Reposicionar para coluna 2
    doc.fillColor('black').fontSize(10).font('Helvetica-Bold')
       .text(data.buyer.companyName, cols[1], startY + 10);
    doc.fontSize(8).font('Helvetica').fillColor('#555')
       .text(`Licença: ${data.buyer.licenseNumber ?? 'N/A'}`, cols[1], doc.y)
       .text(COUNTRY_LABEL[data.buyer.country] ?? data.buyer.country, cols[1], doc.y);

    // Coluna 3 — referências
    doc.fillColor(BRAND).fontSize(11).font('Helvetica-Bold')
       .text(`FAT-${data.orderCd}`, cols[2], startY + 10);
    doc.fontSize(8).font('Helvetica').fillColor('#555')
       .text(`Pedido: ${data.orderCd}`, cols[2], doc.y)
       .text(`TRX: ${data.transactionCd}`, cols[2], doc.y)
       .text(`Data: ${fmtDate(data.issuedAt)}`, cols[2], doc.y);

    doc.fillColor('black').moveDown(2);

    // Tabela de itens
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke(BRAND);
    const tableY = doc.y + 4;

    // Header tabela
    doc.rect(50, tableY, doc.page.width - 100, 18).fill(BRAND);
    doc.fillColor('white').fontSize(8).font('Helvetica-Bold');
    const th = [50, 200, 265, 310, 370, 420, 480];
    doc.text('Produto',       th[0], tableY + 5);
    doc.text('Categoria',     th[1], tableY + 5);
    doc.text('Qty',           th[2], tableY + 5);
    doc.text('Unit.',         th[3], tableY + 5);
    doc.text('Taxa',          th[4], tableY + 5);
    doc.text('Imposto',       th[5], tableY + 5);
    doc.text('Total',         th[6], tableY + 5);

    doc.fillColor('black');
    let rowY = tableY + 22;

    for (const [i, line] of data.lines.entries()) {
      if (i % 2 === 0) doc.rect(50, rowY - 2, doc.page.width - 100, 16).fill('#f9f9f9');
      doc.fillColor('black').fontSize(8).font('Helvetica');
      doc.text(line.productName.substring(0, 22), th[0], rowY);
      doc.text(line.category,                     th[1], rowY);
      doc.text(String(line.qty),                  th[2], rowY);
      doc.text(line.unitPrice.toFixed(2),          th[3], rowY);
      doc.text(`${(line.taxRate * 100).toFixed(1)}%`, th[4], rowY);
      doc.text(line.taxAmount.toFixed(2),          th[5], rowY);
      doc.font('Helvetica-Bold').text(line.lineTotal.toFixed(2), th[6], rowY);
      doc.font('Helvetica');
      rowY += 18;
    }

    doc.moveTo(50, rowY).lineTo(doc.page.width - 50, rowY).stroke('#cccccc');
    rowY += 10;

    // Totais (lado direito) + QR (lado esquerdo)
    doc.image(qr, 50, rowY, { width: 90 });
    doc.fontSize(7).fillColor('#888').text('Verificar', 50, rowY + 93, { width: 90, align: 'center' });

    const totX = doc.page.width - 220;
    doc.fontSize(9).font('Helvetica').fillColor('#555')
       .text('Subtotal Líquido:', totX, rowY)
       .text(fmtMoney(data.netAmount, data.currency), totX + 130, rowY, { align: 'right', width: 50 });
    rowY += 16;
    doc.text('Impostos:', totX, rowY)
       .text(fmtMoney(data.taxAmount, data.currency), totX + 130, rowY, { align: 'right', width: 50 });
    rowY += 4;
    doc.moveTo(totX, rowY).lineTo(doc.page.width - 50, rowY).stroke('#333');
    rowY += 6;
    doc.fontSize(12).font('Helvetica-Bold').fillColor('black')
       .text('TOTAL:', totX, rowY)
       .text(fmtMoney(data.totalAmount, data.currency), totX + 130, rowY, { align: 'right', width: 50 });

    this.footer(doc, data.verifyUrl);
    return this.toBuffer(doc);
  }

  // ── A3: Recibo de Pagamento ──────────────────────────────────────────────

  async generateReceipt(data: ReceiptData): Promise<Buffer> {
    const doc = this.newDoc({ size: 'A5' });
    const qr  = await this.qrBuffer(data.verifyUrl);

    this.header(doc, 'RECIBO DE PAGAMENTO', data.transactionCd);
    this.watermark(doc, 'PAGO');

    // Caixa verde de confirmação
    doc.rect(50, doc.y, doc.page.width - 100, 70).fill('#f0fff4').stroke(SUCCESS);
    doc.fillColor(SUCCESS).fontSize(14).font('Helvetica-Bold')
       .text('✓ PAGAMENTO CONFIRMADO', 50, doc.y - 65, { align: 'center', width: doc.page.width - 100 });
    doc.fillColor(BRAND).fontSize(22).font('Helvetica-Bold')
       .text(fmtMoney(data.amount, data.currency), 50, doc.y - 45, { align: 'center', width: doc.page.width - 100 });
    doc.fillColor('black').moveDown(4.5);

    // Dados + QR
    const colL = 50, colR = doc.page.width / 2 + 10;
    const sy   = doc.y;

    doc.fontSize(11).font('Helvetica-Bold').fillColor(BRAND).text('DETALHES', colL, sy);
    doc.moveDown(0.4);
    this.row(doc, 'Referência Transação', data.transactionCd);
    this.row(doc, 'Pedido', data.orderCd);
    this.row(doc, 'Método de Pagamento', METHOD_LABEL[data.method] ?? data.method);
    this.row(doc, 'Data e Hora', `${fmtDate(data.paidAt)} ${data.paidAt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`);

    doc.image(qr, colR, sy, { width: 100 });
    doc.fontSize(7).fillColor('#888')
       .text('Verificar autenticidade', colR, sy + 103, { width: 100, align: 'center' });

    this.footer(doc, data.verifyUrl);
    return this.toBuffer(doc);
  }

  // ── A5: Despacho Aduaneiro ───────────────────────────────────────────────

  async generateDispatch(data: DispatchData): Promise<Buffer> {
    const doc = this.newDoc();
    const qr  = await this.qrBuffer(data.verifyUrl);

    this.header(doc, 'DESPACHO ADUANEIRO', data.dispatchCd);
    this.watermark(doc, 'DOCUMENTO OFICIAL');

    // Caixa de aprovação
    doc.rect(50, doc.y, doc.page.width - 100, 60).fill('#f0fff4').stroke(SUCCESS);
    doc.fillColor(SUCCESS).fontSize(14).font('Helvetica-Bold')
       .text('✓ APROVADO PELA ALFÂNDEGA', 50, doc.y - 55, { align: 'center', width: doc.page.width - 100 });
    doc.fillColor('#333').fontSize(10).font('Helvetica')
       .text(`Embarque autorizado a prosseguir para ${data.destination}`, 50, doc.y - 35, { align: 'center', width: doc.page.width - 100 });
    doc.fillColor('black').moveDown(4);

    const colL = 50, colR = doc.page.width / 2 + 10, sy = doc.y;

    doc.fontSize(11).font('Helvetica-Bold').fillColor(BRAND)
       .text('DADOS DO EMBARQUE', colL, sy);
    doc.moveDown(0.4);
    this.row(doc, 'Referência Embarque', data.shipmentCd);
    if (data.orderCd) this.row(doc, 'Pedido Associado', data.orderCd);
    this.row(doc, 'Origem', data.origin);
    this.row(doc, 'Destino', data.destination);
    this.row(doc, 'Data de Aprovação', `${fmtDate(data.approvedAt)} ${data.approvedAt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`);
    this.row(doc, 'Despacho Nº', data.dispatchCd);

    doc.image(qr, colR, sy, { width: 120 });
    doc.fontSize(8).fillColor('#888')
       .text('Escanear para verificar', colR, sy + 123, { width: 120, align: 'center' });

    doc.fillColor('black').moveDown(2);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke('#cccccc');
    doc.moveDown(0.8);

    // Assinatura
    doc.moveTo(50, doc.y).lineTo(230, doc.y).stroke('#333');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('black').text(data.approvedByName, 50, doc.y);
    doc.fontSize(9).font('Helvetica').fillColor('#555')
       .text('Agente Aduaneiro — CUSTOMS', 50, doc.y)
       .text(`Despacho: ${data.dispatchCd}`, 50, doc.y);

    this.footer(doc, data.verifyUrl);
    return this.toBuffer(doc);
  }
}
