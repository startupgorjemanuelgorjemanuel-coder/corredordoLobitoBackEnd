import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PassportModule,
    AuditModule,
    JwtModule.registerAsync({
      imports:    [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret:      config.get<string>('JWT_SECRET')!,
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '8h') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers:   [AuthService, JwtStrategy, ConfigService],
  exports:     [JwtModule, AuthService],
})
export class AuthModule {}
