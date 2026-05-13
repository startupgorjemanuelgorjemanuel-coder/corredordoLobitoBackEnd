import {
  Injectable, UnauthorizedException, ForbiddenException,
  ConflictException, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma:   PrismaService,
    private jwt:      JwtService,
    private codeGen:  CodeGeneratorService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    if (user.status !== 'active') {
      throw new ForbiddenException('Utilizador bloqueado');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data:  { lastLoginAt: new Date() },
    });

    const token = this.jwt.sign({ sub: user.id, role: user.role });

    return {
      access_token: token,
      user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
    };
  }

  async register(dto: RegisterDto) {
    // Verificar se email já existe
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email já registado');

    let companyId = dto.companyId ?? null;

    if (companyId) {
      // Empresa já existente — verificar se existe
      const company = await this.prisma.company.findUnique({ where: { id: companyId } });
      if (!company) throw new NotFoundException('Empresa não encontrada. Verifique o companyId.');
    } else {
      // Criar nova empresa
      if (!dto.companyName || !dto.companyCountry || !dto.companyEmail) {
        throw new BadRequestException(
          'Para registar numa nova empresa é obrigatório fornecer: companyName, companyCountry e companyEmail.',
        );
      }

      const emailExistente = await this.prisma.company.findFirst({
        where: { contactEmail: dto.companyEmail },
      });
      if (emailExistente) {
        throw new ConflictException(
          'Já existe uma empresa registada com esse email. Use o companyId da empresa existente.',
        );
      }

      const companyCd = await this.codeGen.generate('companies');
      const company = await this.prisma.company.create({
        data: {
          cd:           companyCd,
          name:         dto.companyName,
          country:      dto.companyCountry as any,
          contactEmail: dto.companyEmail,
          contactPhone: dto.companyPhone  ?? null,
          address:      dto.companyAddress ?? null,
          licenseStatus: 'pending',
        },
      });
      companyId = company.id;
    }

    // Criar utilizador ligado à empresa
    const userCd       = await this.codeGen.generate('users');
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        cd:           userCd,
        email:        dto.email,
        passwordHash,
        fullName:     dto.fullName,
        role:         dto.role as any,
        status:       'active',
        companyId,
      },
      select: { id: true, cd: true, email: true, role: true, fullName: true, companyId: true },
    });

    const company = await this.prisma.company.findUnique({ where: { id: companyId! } });

    const token = this.jwt.sign({ sub: user.id, role: user.role });

    return {
      access_token: token,
      user: {
        id:        user.id,
        email:     user.email,
        role:      user.role,
        fullName:  user.fullName,
        companyId: user.companyId,
      },
      company: {
        id:            company!.id,
        cd:            company!.cd,
        name:          company!.name,
        country:       company!.country,
        licenseStatus: company!.licenseStatus,
        message:       company!.licenseStatus === 'pending'
          ? 'Empresa registada. Aguarda validação do STAFF e aprovação do STATE para operar.'
          : 'Conta criada. Empresa já tem licença activa.',
      },
    };
  }
}
