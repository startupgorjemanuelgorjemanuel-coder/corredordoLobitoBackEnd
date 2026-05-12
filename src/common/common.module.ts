import { Global, Module } from '@nestjs/common';
import { CodeGeneratorService } from './services/code-generator.service';

@Global()
@Module({
  providers: [CodeGeneratorService],
  exports:   [CodeGeneratorService],
})
export class CommonModule {}
