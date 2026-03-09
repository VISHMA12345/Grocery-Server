import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { ObjectId } from "mongodb";

@Entity("categories")
export class Category {

    @ObjectIdColumn()
    id: ObjectId;

    @Column()
    name: string;

    @Column({ nullable: true })
    description?: string;

   @Column()
    icon: string;

    @Column({ default: 1 })
    isActive: number;

    @Column({ default: 0 })
    isDelete: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}