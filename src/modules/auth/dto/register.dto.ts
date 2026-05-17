import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export enum RegisterRole {
  BUYER    = 'buyer',
  PRODUCER = 'producer',
  OPERATOR = 'operator',
}

export class RegisterDto {
  @ApiProperty({ example: 'joao.silva@empresa.ao' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Senha@Segura123!', minLength: 12 })
  @IsString()
  @MinLength(12, { message: 'A senha deve ter pelo menos 12 caracteres.' })
  password: string;

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiPropertyOptional({ example: '+244 923 000 001' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    enum: RegisterRole,
    example: RegisterRole.BUYER,
    description: 'buyer = comprador  |  producer = produtor de produtos  |  operator = logística',
  })
  @IsEnum(RegisterRole)
  role: RegisterRole;
}
