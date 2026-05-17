import { Global, Module } from '@nestjs/common';
import { CodeGeneratorService } from './services/code-generator.service';
import { LoginRateLimiterService } from './services/login-rate-limiter.service';

@Global()
@Module({
  providers: [CodeGeneratorService, LoginRateLimiterService],
  exports:   [CodeGeneratorService, LoginRateLimiterService],
})
export class CommonModule {}
