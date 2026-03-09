import {
    IsNotEmpty,
    IsString,
    IsNumber,
    IsOptional,
    IsArray,
    ValidateNested,
    IsEnum
} from "class-validator";
import { Type } from "class-transformer";
// import { UnitEnum } from "../entity/Product";

class ImageDTO {
    @IsOptional()
    @IsString()
    fileName?: string;

    @IsOptional()
    @IsString()
    path?: string;

    @IsOptional()
    @IsString()
    originalName?: string;
}

export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    @IsNotEmpty()
    categoryId: string;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    price: number;

    @IsOptional()
    @Type(() => Number)
    isActive?: number;

    @IsOptional()
    @Type(() => Number)
    qty?: number;

    @IsString()
    @IsNotEmpty()
    unit: string;
}



export class UpdateProductDto {
    @IsString()
    @IsNotEmpty()
    unit: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    categoryId?: string;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    price?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    mrp?: number;

    @IsOptional()
    @Type(() => Number)
    isActive?: number;
    @IsOptional()
    @Type(() => Number)
    qty?: number;   
}