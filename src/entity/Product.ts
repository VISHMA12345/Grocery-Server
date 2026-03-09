import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { ObjectId } from "mongodb";
// src/enums/unit.enum.ts
// export enum UnitEnum {
//     PIECES = "Pieces",
//     KILOGRAM = "Kilogram",
//     GRAM = "Gram",
//     LITER = "Liter",
//     MILLILITER = "Milliliter",
//     DOZEN = "Dozen",
//     PACK = "Pack"
// }
@Entity("products")
export class Product {

    @ObjectIdColumn()
    id: ObjectId;

    @Column()
    name: string;

    @Column({ nullable: true })
    description?: string;

    @Column()
    unit: string;

    @Column()
    categoryId: ObjectId; // Reference to Category

    @Column("double")
    price: number;

    @Column({ default: 1 })
    isActive: number;

    @Column({ default: 0 })
    isDelete: number;

    @Column({ default: 0 })
    qty: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}