import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional } from 'class-validator';
import { DocumentEntityType, DocumentType } from '@prisma/client';

export class UploadDocumentDto {
  @ApiProperty({ enum: DocumentEntityType, example: 'company' })
  @IsEnum(DocumentEntityType)
  entityType: DocumentEntityType;

  @ApiProperty({ example: 'uuid-da-entidade' })
  @IsString()
  entityId: string;

  @ApiProperty({ enum: DocumentType, example: 'certidao_comercial' })
  @IsEnum(DocumentType)
  type: DocumentType;

  @ApiProperty({ example: 'Certidão Comercial da Empresa XYZ 2026' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Notas adicionais sobre o documento' })
  @IsString()
  @IsOptional()
  notes?: string;
}
