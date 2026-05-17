import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyTotpDto {
  @ApiProperty({ example: '123456', description: 'Código de 6 dígitos do Google Authenticator / Authy' })
  @IsString()
  @Length(6, 6, { message: 'O código deve ter exactamente 6 dígitos.' })
  code: string;
}
