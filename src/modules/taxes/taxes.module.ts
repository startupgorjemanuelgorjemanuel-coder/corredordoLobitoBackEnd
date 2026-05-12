import { Module } from '@nestjs/common';
import { TaxesController } from './taxes.controller';
import { TaxesService } from './taxes.service';
import { TaxEngineService } from '../../common/services/tax-engine.service';

@Module({
  controllers: [TaxesController],
  providers:   [TaxesService, TaxEngineService],
  exports:     [TaxEngineService],
})
export class TaxesModule {}
