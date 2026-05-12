import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderLineDto {
  @ApiProperty({ example: 'uuid-do-produto' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 10, minimum: 1 })
  @IsInt()
  @Min(1)
  qty: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderLineDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1, { message: 'O pedido deve ter pelo menos uma linha de produto' })
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines: OrderLineDto[];
}
