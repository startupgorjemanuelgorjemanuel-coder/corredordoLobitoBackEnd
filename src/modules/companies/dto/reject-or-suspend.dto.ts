import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectOrSuspendDto {
  @ApiProperty({ example: 'Documentação insuficiente. Falta certidão comercial actualizada.', minLength: 10 })
  @IsString()
  @MinLength(10)
  reason: string;
}
