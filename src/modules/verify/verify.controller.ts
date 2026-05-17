import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { VerifyService } from './verify.service';
import { buildHtml } from './verify.html';

@ApiTags('Verify')
@Controller('verify')
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) {}

  private isBrowser(req: Request): boolean {
    const accept = req.headers['accept'] ?? '';
    return accept.includes('text/html');
  }

  @Get('license/:companyId')
  @ApiOperation({ summary: 'Verificar Licença Comercial — público' })
  async verifyLicense(@Param('companyId') id: string, @Req() req: Request, @Res() res: Response) {
    const data = await this.verifyService.verifyLicense(id);
    if (this.isBrowser(req)) return res.type('html').send(buildHtml(data));
    return res.json(data);
  }

  @Get('invoice/:orderId')
  @ApiOperation({ summary: 'Verificar Fatura Comercial — público' })
  async verifyInvoice(@Param('orderId') id: string, @Req() req: Request, @Res() res: Response) {
    const data = await this.verifyService.verifyInvoice(id);
    if (this.isBrowser(req)) return res.type('html').send(buildHtml(data));
    return res.json(data);
  }

  @Get('receipt/:transactionId')
  @ApiOperation({ summary: 'Verificar Recibo de Pagamento — público' })
  async verifyReceipt(@Param('transactionId') id: string, @Req() req: Request, @Res() res: Response) {
    const data = await this.verifyService.verifyReceipt(id);
    if (this.isBrowser(req)) return res.type('html').send(buildHtml(data));
    return res.json(data);
  }

  @Get('dispatch/:shipmentId')
  @ApiOperation({ summary: 'Verificar Despacho Aduaneiro — público' })
  async verifyDispatch(@Param('shipmentId') id: string, @Req() req: Request, @Res() res: Response) {
    const data = await this.verifyService.verifyDispatch(id);
    if (this.isBrowser(req)) return res.type('html').send(buildHtml(data));
    return res.json(data);
  }
}
