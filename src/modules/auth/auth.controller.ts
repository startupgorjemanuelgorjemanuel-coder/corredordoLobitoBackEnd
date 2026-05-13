import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login — retorna JWT Bearer token' })
  @ApiResponse({ status: 201, description: 'JWT gerado' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('register')
  @ApiOperation({
    summary: 'Registo externo — buyer, producer ou operator',
    description:
      'Endpoint público para empresas e utilizadores externos se registarem. ' +
      'Cria o utilizador e a empresa (se não existir) num único passo. ' +
      'A empresa fica em status "pending" e precisa de validação do STAFF + aprovação do STATE antes de operar.',
  })
  @ApiResponse({ status: 201, description: 'Conta criada — JWT retornado imediatamente' })
  @ApiResponse({ status: 409, description: 'Email ou empresa já registada' })
  @ApiResponse({ status: 400, description: 'Dados em falta ou inválidos' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }
}
