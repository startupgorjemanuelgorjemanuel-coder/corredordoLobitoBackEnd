import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class BlockUserDto {
  @ApiProperty({ example: 'Utilizador envolvido em actividade suspeita', minLength: 10 })
  @IsString()
  @MinLength(10)
  reason: string;
}
