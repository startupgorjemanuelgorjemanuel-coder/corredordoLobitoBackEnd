import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VerifyService } from './verify.service';

@ApiTags('Verify')
@Controller('verify')
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) {}

  @Get('license/:companyId')
  @ApiOperation({ summary: 'Verificar autenticidade de Licença Comercial — público, sem autenticação' })
  verifyLicense(@Param('companyId') companyId: string) {
    return this.verifyService.verifyLicense(companyId);
  }

  @Get('invoice/:orderId')
  @ApiOperation({ summary: 'Verificar autenticidade de Fatura Comercial — público' })
  verifyInvoice(@Param('orderId') orderId: string) {
    return this.verifyService.verifyInvoice(orderId);
  }

  @Get('receipt/:transactionId')
  @ApiOperation({ summary: 'Verificar autenticidade de Recibo de Pagamento — público' })
  verifyReceipt(@Param('transactionId') transactionId: string) {
    return this.verifyService.verifyReceipt(transactionId);
  }

  @Get('dispatch/:shipmentId')
  @ApiOperation({ summary: 'Verificar autenticidade de Despacho Aduaneiro — público' })
  verifyDispatch(@Param('shipmentId') shipmentId: string) {
    return this.verifyService.verifyDispatch(shipmentId);
  }
}
