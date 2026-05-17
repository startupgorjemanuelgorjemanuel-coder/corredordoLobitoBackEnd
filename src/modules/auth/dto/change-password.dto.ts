import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'SenhaAntiga123!' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'SenhaNova456!', minLength: 12 })
  @IsString()
  @MinLength(12, { message: 'A nova senha deve ter pelo menos 12 caracteres.' })
  newPassword: string;
}
