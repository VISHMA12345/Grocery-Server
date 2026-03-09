import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { ObjectId } from "mongodb";

@Entity("grocerylists")
export class GroceryBucket {

    @ObjectIdColumn()
    id: ObjectId;

    @Column()
    userId: ObjectId;

    @Column({ default: null })
    partnerId: ObjectId;

    @Column()
    listName: string;

    @Column()
    storeName: string;

    @Column("simple-json")
    items: {
        productId: ObjectId;
        quantity: number;
        unit: string;
        assignedTo: string;
        isCompleted: number;
    }[];

    @Column({ default: false })
    converted_to_basket: Boolean;

    @Column({ default: 1 })
    isActive: number;

    @Column({ default: 0 })
    isDelete: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}