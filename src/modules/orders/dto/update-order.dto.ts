import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateOrderLineDto {
  @ApiProperty({ example: 'uuid-do-produto' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 5, minimum: 1 })
  @IsInt()
  @Min(1)
  qty: number;
}

export class UpdateOrderDto {
  @ApiProperty({ type: [UpdateOrderLineDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1, { message: 'O pedido deve ter pelo menos uma linha de produto' })
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderLineDto)
  lines: UpdateOrderLineDto[];
}
