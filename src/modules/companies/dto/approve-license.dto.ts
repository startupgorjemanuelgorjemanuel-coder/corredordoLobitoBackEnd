import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

export class ApproveLicenseDto {
  @ApiProperty({ example: 'LIC-2026-001' })
  @IsString()
  licenseNumber: string;

  @ApiProperty({ example: '2028-12-31T23:59:59.000Z' })
  @IsDateString()
  licenseExpiresAt: string;
}
