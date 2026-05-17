import { Controller, Post, Get, Body, Req, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyTotpDto } from './dto/verify-totp.dto';
import { Validate2faDto } from './dto/validate-2fa.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ─── Sessão ───────────────────────────────────────────────────────────────

  @Post('login')
  @ApiOperation({
    summary: 'Login',
    description:
      'Roles sem 2FA → devolve `access_token` imediatamente.\n' +
      'Roles com 2FA (state, staff, specialist, compliance):\n' +
      '- Se 2FA activo → devolve `tempToken` + `requires2fa: true` → chamar POST /auth/2fa/validate\n' +
      '- Se 2FA não configurado → devolve `access_token` + `twoFactorSetup: true` → chamar POST /auth/2fa/setup',
  })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
            ?? req.socket.remoteAddress ?? 'unknown';
    return this.authService.login(dto.email, dto.password, ip);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Logout' })
  logout(@Req() req: Request) {
    const token = (req.headers['authorization'] ?? '').replace('Bearer ', '');
    return this.authService.logout(token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Perfil do utilizador autenticado' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user);
  }

  @Post('register')
  @ApiOperation({ summary: 'Registo externo — buyer, producer ou operator' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Alterar password com sessão activa' })
  changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: AuthUser) {
    return this.authService.changePassword(dto, user);
  }

  // ─── 2FA ─────────────────────────────────────────────────────────────────

  @Post('2fa/setup')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Gerar QR Code para activar 2FA',
    description: 'Apenas para roles: state, staff, specialist, compliance. Devolve QR code (base64) e segredo. Após escanear, chamar POST /auth/2fa/verify.',
  })
  @ApiResponse({ status: 200, description: 'QR code e segredo gerados' })
  @ApiResponse({ status: 403, description: 'Role não requer 2FA' })
  @ApiResponse({ status: 400, description: '2FA já está activo' })
  setup2fa(@CurrentUser() user: AuthUser) {
    return this.authService.setup2fa(user);
  }

  @Post('2fa/verify')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Activar 2FA — verificar primeiro código TOTP',
    description: 'Confirma que o utilizador escaneou correctamente o QR code. Activa o 2FA permanentemente na conta.',
  })
  @ApiResponse({ status: 200, description: '2FA activado com sucesso' })
  @ApiResponse({ status: 401, description: 'Código inválido' })
  verify2fa(@Body() dto: VerifyTotpDto, @CurrentUser() user: AuthUser) {
    return this.authService.verify2fa(dto, user);
  }

  @Post('2fa/validate')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Validar código TOTP no login (segundo factor)',
    description: 'Usar o `tempToken` recebido no login + código do autenticador. Devolve o `access_token` completo.',
  })
  @ApiResponse({ status: 200, description: 'Login completo — access_token emitido' })
  @ApiResponse({ status: 401, description: 'Código inválido ou tempToken expirado' })
  validate2fa(@Body() dto: Validate2faDto) {
    return this.authService.validate2fa(dto);
  }

  @Post('2fa/disable')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Desactivar 2FA (requer confirmação com código TOTP)',
    description: 'Exige o código do autenticador antes de desactivar. Auditado.',
  })
  @ApiResponse({ status: 200, description: '2FA desactivado' })
  @ApiResponse({ status: 401, description: 'Código inválido' })
  disable2fa(@Body() dto: VerifyTotpDto, @CurrentUser() user: AuthUser) {
    return this.authService.disable2fa(dto, user);
  }
}
