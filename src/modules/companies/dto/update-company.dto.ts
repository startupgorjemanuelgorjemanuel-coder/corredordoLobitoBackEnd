import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { CompanyType } from './create-company.dto';

export class UpdateCompanyDto {
  @ApiPropertyOptional({ example: 'Empresa Actualizada Lda' })
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: CompanyType, example: 'exporter' })
  @IsEnum(CompanyType)
  @IsOptional()
  companyType?: CompanyType;

  @ApiPropertyOptional({ example: 'novo@empresa.co.ao' })
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+244 923 000 002' })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'Av. da Independência, 100, Luanda' })
  @IsString()
  @IsOptional()
  address?: string;
}
