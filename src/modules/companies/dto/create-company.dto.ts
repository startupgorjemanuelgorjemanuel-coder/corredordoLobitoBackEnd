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

export class CreateCompanyDto {
  @ApiProperty({ example: 'Lobito Trade Lda' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ enum: CompanyCountry, example: 'angola' })
  @IsEnum(CompanyCountry)
  country: CompanyCountry;

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
