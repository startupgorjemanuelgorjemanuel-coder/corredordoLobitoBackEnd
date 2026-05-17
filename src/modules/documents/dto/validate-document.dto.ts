import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectDocumentDto {
  @ApiProperty({ example: 'Documento ilegível. Submeta uma versão mais clara.' })
  @IsString()
  @MinLength(10)
  reason: string;
}
