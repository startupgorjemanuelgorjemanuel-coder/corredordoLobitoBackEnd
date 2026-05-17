import {
  Injectable, UnauthorizedException, ForbiddenException,
  ConflictException, BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { LoginRateLimiterService } from '../../common/services/login-rate-limiter.service';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyTotpDto } from './dto/verify-totp.dto';
import { Validate2faDto } from './dto/validate-2fa.dto';
import type { AuthUser } from '../../common/types/auth-user.type';

const ROLES_REQUIRING_2FA = ['state', 'staff', 'specialist', 'compliance'] as const;
const APP_NAME = 'Corredor do Lobito';

@Injectable()
export class AuthService {
  constructor(
    private prisma:      PrismaService,
    private jwt:         JwtService,
    private config:      ConfigService,
    private audit:       AuditService,
    private codeGen:     CodeGeneratorService,
    private rateLimiter: LoginRateLimiterService,
  ) {}

  // ─── LOGIN ────────────────────────────────────────────────────────────────

  async login(email: string, password: string, ip: string) {
    this.rateLimiter.checkBlocked(email, ip);

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      this.rateLimiter.recordFailedAttempt(email, ip);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (user.status !== 'active') {
      throw new ForbiddenException('Utilizador bloqueado. Contacte o STATE para desbloquear a conta.');
    }

    this.rateLimiter.resetOnSuccess(email, ip);

    await this.prisma.user.update({
      where: { id: user.id },
      data:  { lastLoginAt: new Date() },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'LOGIN', entity: 'user', entityId: user.id,
      after:  { email: user.email, ip },
    });

    const requires2fa = ROLES_REQUIRING_2FA.includes(user.role as any);

    // Role exige 2FA e já tem 2FA activado → emitir token temporário
    if (requires2fa && user.twoFactorEnabled) {
      const tempToken = this.jwt.sign(
        { sub: user.id, twoFactorPending: true },
        { expiresIn: '5m' },
      );
      return {
        requires2fa:   true,
        twoFactorSetup: false,
        tempToken,
        message: 'Introduza o código do autenticador para concluir o login.',
      };
    }

    const token = this.jwt.sign({ sub: user.id, role: user.role });

    return {
      access_token:    token,
      requires2fa:     requires2fa,
      twoFactorSetup:  requires2fa && !user.twoFactorEnabled,
      user: {
        id:        user.id,
        email:     user.email,
        role:      user.role,
        fullName:  user.fullName,
        phone:     user.phone,
        companyId: user.companyId,
      },
    };
  }

  // ─── LOGOUT ───────────────────────────────────────────────────────────────

  logout(token: string): { message: string } {
    return { message: 'Sessão terminada com sucesso.' };
  }

  // ─── ME ───────────────────────────────────────────────────────────────────

  async me(user: AuthUser) {
    return this.prisma.user.findUnique({
      where:  { id: user.id },
      select: {
        id: true, cd: true, email: true, fullName: true,
        phone: true, role: true, status: true,
        companyId: true, lastLoginAt: true, createdAt: true,
        twoFactorEnabled: true,
        company: { select: { id: true, name: true, licenseStatus: true } },
      },
    });
  }

  // ─── REGISTER ─────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email já registado');

    const cd           = await this.codeGen.generate('users');
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        cd, email: dto.email, passwordHash,
        fullName: dto.fullName, phone: dto.phone ?? null,
        role: dto.role as any, status: 'active', companyId: null,
      },
      select: { id: true, cd: true, email: true, role: true, fullName: true, phone: true, companyId: true },
    });

    const token = this.jwt.sign({ sub: user.id, role: user.role });

    return {
      access_token: token,
      user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName, phone: user.phone, companyId: null },
    };
  }

  // ─── CHANGE PASSWORD ──────────────────────────────────────────────────────

  async changePassword(dto: ChangePasswordDto, user: AuthUser) {
    const full = await this.prisma.user.findUnique({ where: { id: user.id } });

    if (!(await bcrypt.compare(dto.currentPassword, full!.passwordHash))) {
      throw new BadRequestException('Password actual incorrecta.');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('A nova password não pode ser igual à actual.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data:  { passwordHash: await bcrypt.hash(dto.newPassword, 10), passwordChangedAt: new Date() },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'CHANGE_PASSWORD', entity: 'user', entityId: user.id,
      after:  { changedAt: new Date().toISOString() },
    });

    return { message: 'Password alterada com sucesso.' };
  }

  // ─── 2FA SETUP ────────────────────────────────────────────────────────────

  async setup2fa(user: AuthUser) {
    const full = await this.prisma.user.findUnique({ where: { id: user.id } });

    if (!ROLES_REQUIRING_2FA.includes(user.role as any)) {
      throw new ForbiddenException(`O role "${user.role}" não requer 2FA.`);
    }
    if (full!.twoFactorEnabled) {
      throw new BadRequestException('O 2FA já está activado nesta conta.');
    }

    const secret = speakeasy.generateSecret({
      name:   `${APP_NAME} (${user.email})`,
      length: 20,
    });

    // Guardar segredo temporariamente (não activado ainda)
    await this.prisma.user.update({
      where: { id: user.id },
      data:  { twoFactorSecret: secret.base32 },
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret:  secret.base32,
      qrCode:  qrCodeUrl,
      message: 'Escaneia o QR code com o Google Authenticator ou Authy. Depois chama POST /auth/2fa/verify com o código gerado.',
    };
  }

  // ─── 2FA VERIFY (activar) ────────────────────────────────────────────────

  async verify2fa(dto: VerifyTotpDto, user: AuthUser) {
    const full = await this.prisma.user.findUnique({ where: { id: user.id } });

    if (!full!.twoFactorSecret) {
      throw new BadRequestException('Segredo 2FA não encontrado. Chame POST /auth/2fa/setup primeiro.');
    }
    if (full!.twoFactorEnabled) {
      throw new BadRequestException('O 2FA já está activado.');
    }

    const valid = speakeasy.totp.verify({
      secret:   full!.twoFactorSecret,
      encoding: 'base32',
      token:    dto.code,
      window:   1,
    });

    if (!valid) {
      throw new UnauthorizedException('Código inválido. Verifique o relógio do dispositivo e tente novamente.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data:  { twoFactorEnabled: true, twoFactorVerifiedAt: new Date() },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'ENABLE_2FA', entity: 'user', entityId: user.id,
      after:  { enabledAt: new Date().toISOString() },
    });

    return { message: '2FA activado com sucesso. Todos os logins futuros exigirão o código do autenticador.' };
  }

  // ─── 2FA VALIDATE (no login) ─────────────────────────────────────────────

  async validate2fa(dto: Validate2faDto) {
    let payload: any;
    try {
      payload = this.jwt.verify(dto.tempToken);
    } catch {
      throw new UnauthorizedException('Token temporário inválido ou expirado.');
    }

    if (!payload.twoFactorPending) {
      throw new UnauthorizedException('Token não é um token de 2FA pendente.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || !user.twoFactorSecret || !user.twoFactorEnabled) {
      throw new UnauthorizedException('Estado 2FA inválido.');
    }

    const valid = speakeasy.totp.verify({
      secret:   user.twoFactorSecret,
      encoding: 'base32',
      token:    dto.code,
      window:   1,
    });

    if (!valid) {
      await this.audit.log({
        userId: user.id, role: user.role,
        action: 'LOGIN_2FA_FAIL', entity: 'user', entityId: user.id,
        after:  { reason: 'invalid_totp' },
      });
      throw new UnauthorizedException('Código inválido.');
    }

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'LOGIN_2FA_OK', entity: 'user', entityId: user.id,
      after:  { verifiedAt: new Date().toISOString() },
    });

    const token = this.jwt.sign({ sub: user.id, role: user.role });

    return {
      access_token: token,
      user: {
        id:        user.id,
        email:     user.email,
        role:      user.role,
        fullName:  user.fullName,
        phone:     user.phone,
        companyId: user.companyId,
      },
    };
  }

  // ─── 2FA DISABLE ─────────────────────────────────────────────────────────

  async disable2fa(dto: VerifyTotpDto, user: AuthUser) {
    const full = await this.prisma.user.findUnique({ where: { id: user.id } });

    if (!full!.twoFactorEnabled) {
      throw new BadRequestException('O 2FA não está activado nesta conta.');
    }

    const valid = speakeasy.totp.verify({
      secret:   full!.twoFactorSecret!,
      encoding: 'base32',
      token:    dto.code,
      window:   1,
    });

    if (!valid) {
      throw new UnauthorizedException('Código inválido. Confirme com o autenticador antes de desactivar.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data:  { twoFactorEnabled: false, twoFactorSecret: null, twoFactorVerifiedAt: null },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'DISABLE_2FA', entity: 'user', entityId: user.id,
      after:  { disabledAt: new Date().toISOString() },
    });

    return { message: '2FA desactivado. O login voltará a exigir apenas email e password.' };
  }
}
