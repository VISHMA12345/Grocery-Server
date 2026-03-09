import {
    IsNotEmpty,
    IsNumber,
    IsString,
    ValidateNested,
    IsArray
} from "class-validator";
import { Type } from "class-transformer";

class GroceryItemDto {

    @IsString()
    @IsNotEmpty()
    productId: string;

    @IsNumber()
    @Type(() => Number)
    quantity: number;

    @IsString()
    unit: string;

    @IsString()
    assignedTo: string;
}

export class AddItemToBucketDto {

    @IsString()
    @IsNotEmpty()
    listName: string;

    @IsString()
    @IsNotEmpty()
    storeName: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GroceryItemDto)
    items: GroceryItemDto[];
}