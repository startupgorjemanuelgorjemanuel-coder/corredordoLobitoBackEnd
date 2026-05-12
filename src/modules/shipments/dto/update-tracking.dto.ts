import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

enum TrackingStatus {
  created          = 'created',
  in_transit       = 'in_transit',
  at_border        = 'at_border',
  customs_approved = 'customs_approved',
  customs_rejected = 'customs_rejected',
  held             = 'held',
  delivered        = 'delivered',
}

export class UpdateTrackingDto {
  @ApiProperty({ example: 'Fronteira Malanje km 142' })
  @IsString()
  location: string;

  @ApiProperty({ enum: TrackingStatus, example: 'in_transit' })
  @IsEnum(TrackingStatus)
  status: TrackingStatus;

  @ApiPropertyOptional({ example: 'Sem incidentes. Trânsito normal.' })
  @IsString()
  @IsOptional()
  notes?: string;
}
