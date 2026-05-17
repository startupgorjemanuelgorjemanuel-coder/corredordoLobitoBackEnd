import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'novo@lobito.gov' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Lobito@Dev2024!', minLength: 8 })
  @IsString()
  @MinLength(12, { message: 'A senha deve ter pelo menos 12 caracteres.' })
  password: string;

  @ApiProperty({ example: 'Nome Completo' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiPropertyOptional({ example: '+244 923 000 001' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ enum: Role, example: Role.STAFF })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({ description: 'UUID da empresa — obrigatório para roles empresariais' })
  @IsUUID()
  @IsOptional()
  companyId?: string;
}
