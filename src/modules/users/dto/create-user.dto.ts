import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'novo@lobito.gov' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Lobito@Dev2024!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Nome Completo' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ enum: Role, example: Role.STAFF })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({ description: 'UUID da empresa — obrigatório para roles empresariais' })
  @IsUUID()
  @IsOptional()
  companyId?: string;
}
