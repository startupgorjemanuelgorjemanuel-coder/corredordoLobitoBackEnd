import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports:    [ConfigModule],
      useFactory: (config: ConfigService) => {
        const secret    = config.get<string>('JWT_SECRET')!;
        const expiresIn = config.get('JWT_EXPIRES_IN', '8h');
        return { secret, signOptions: { expiresIn } };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers:   [AuthService, JwtStrategy],
  exports:     [JwtModule],
})
export class AuthModule {}
