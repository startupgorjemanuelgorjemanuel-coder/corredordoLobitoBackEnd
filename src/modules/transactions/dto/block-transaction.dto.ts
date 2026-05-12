import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class BlockTransactionDto {
  @ApiProperty({ example: 'Suspeita de transacção fraudulenta — padrão de valor anómalo detectado' })
  @IsString()
  @MinLength(10)
  reason: string;
}
