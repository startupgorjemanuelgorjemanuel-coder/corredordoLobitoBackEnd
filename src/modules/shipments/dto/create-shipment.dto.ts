import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateShipmentDto {
  @ApiProperty({ example: 'uuid-do-pedido-pago' })
  @IsString()
  orderId: string;

  @ApiProperty({ example: 'Porto do Lobito, Angola' })
  @IsString()
  origin: string;

  @ApiProperty({ example: 'Lusaka, Zâmbia' })
  @IsString()
  destination: string;

  @ApiPropertyOptional({ example: '2026-06-15T08:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  eta?: string;
}
