import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectProposalDto {
  @ApiProperty({ example: 'Preço acima do tecto regulatório definido pelo Estado.' })
  @IsString()
  @MinLength(5)
  reason: string;
}
