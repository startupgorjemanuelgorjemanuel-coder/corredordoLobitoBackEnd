import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

enum CompanyCountry {
  angola     = 'angola',
  zambia     = 'zambia',
  drc        = 'drc',
  tanzania   = 'tanzania',
  zimbabwe   = 'zimbabwe',
  mozambique = 'mozambique',
}

export enum CompanyType {
  importer  = 'importer',
  exporter  = 'exporter',
  mixed     = 'mixed',
  producer  = 'producer',
  logistics = 'logistics',
}

export class CreateCompanyDto {
  @ApiProperty({ example: 'Lobito Trade Lda' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ enum: CompanyCountry, example: 'angola' })
  @IsEnum(CompanyCountry)
  country: CompanyCountry;

  @ApiPropertyOptional({
    enum: CompanyType,
    example: 'importer',
    description: 'Tipo de empresa: importador, exportador, misto, produtor ou logística',
  })
  @IsEnum(CompanyType)
  @IsOptional()
  companyType?: CompanyType;

  @ApiProperty({ example: 'geral@lobitotrade.ao' })
  @IsEmail()
  contactEmail: string;

  @ApiPropertyOptional({ example: '+244 923 000 001' })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'Rua da Indústria, 42, Lobito' })
  @IsString()
  @IsOptional()
  address?: string;
}
