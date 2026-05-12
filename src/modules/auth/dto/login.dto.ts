import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'state@lobito.gov' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Lobito@Dev2024!' })
  @IsString()
  @MinLength(6)
  password: string;
}
