import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength,
} from 'class-validator';

export enum RegisterRole {
  BUYER    = 'buyer',
  PRODUCER = 'producer',
  OPERATOR = 'operator',
}

export enum RegisterCountry {
  ANGOLA     = 'angola',
  ZAMBIA     = 'zambia',
  DRC        = 'drc',
  TANZANIA   = 'tanzania',
  ZIMBABWE   = 'zimbabwe',
  MOZAMBIQUE = 'mozambique',
}

export class RegisterDto {
  // ─── Dados do utilizador ────────────────────────────────────────
  @ApiProperty({ example: 'joao.silva@empresa.ao' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Senha@Segura123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({
    enum: RegisterRole,
    example: RegisterRole.BUYER,
    description: 'buyer = comprador  |  producer = produtor de produtos  |  operator = logística',
  })
  @IsEnum(RegisterRole)
  role: RegisterRole;

  // ─── Empresa — obrigatório se não tiver companyId ────────────────
  @ApiPropertyOptional({
    description: 'UUID de empresa já existente. Se fornecido, não é necessário preencher os campos da empresa.',
    example: 'uuid-da-empresa-existente',
  })
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({ example: 'Nova Empresa Lda', description: 'Obrigatório se não fornecer companyId' })
  @IsString()
  @MinLength(2)
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ enum: RegisterCountry, example: RegisterCountry.ANGOLA })
  @IsEnum(RegisterCountry)
  @IsOptional()
  companyCountry?: RegisterCountry;

  @ApiPropertyOptional({ example: 'geral@nova-empresa.ao' })
  @IsEmail()
  @IsOptional()
  companyEmail?: string;

  @ApiPropertyOptional({ example: '+244 923 000 001' })
  @IsString()
  @IsOptional()
  companyPhone?: string;

  @ApiPropertyOptional({ example: 'Rua da Samba, 100, Luanda' })
  @IsString()
  @IsOptional()
  companyAddress?: string;
}
