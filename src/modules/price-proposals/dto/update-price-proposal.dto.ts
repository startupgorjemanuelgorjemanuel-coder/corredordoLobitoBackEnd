import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePriceProposalDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  proposedPrice?: number;

  @IsString()
  @IsOptional()
  justification?: string;

  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  validTo?: string;
}
