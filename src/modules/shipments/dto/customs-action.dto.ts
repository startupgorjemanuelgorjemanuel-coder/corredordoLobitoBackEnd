import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CustomsActionDto {
  @ApiPropertyOptional({ example: 'Documentação conforme. Aprovado sem reservas.' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CustomsRejectDto {
  @ApiProperty({ example: 'Mercadoria não corresponde à declaração aduaneira.' })
  @IsString()
  @MinLength(5)
  reason: string;
}

export class HoldShipmentDto {
  @ApiProperty({ example: 'Aguarda laudo de inspecção fitossanitária.' })
  @IsString()
  @MinLength(5)
  reason: string;
}
