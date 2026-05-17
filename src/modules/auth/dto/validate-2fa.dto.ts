import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class Validate2faDto {
  @ApiProperty({ description: 'Token temporário recebido no login (válido 5 minutos)' })
  @IsString()
  tempToken: string;

  @ApiProperty({ example: '123456', description: 'Código de 6 dígitos do autenticador' })
  @IsString()
  @Length(6, 6, { message: 'O código deve ter exactamente 6 dígitos.' })
  code: string;
}
