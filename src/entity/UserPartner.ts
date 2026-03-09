import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { ObjectId } from "mongodb";

@Entity("userpartners")
export class UserPartner {

    @ObjectIdColumn()
    id: ObjectId;

    @Column()
    userId: ObjectId;

    @Column()
    partnerId: ObjectId;

    @Column()
    status: string;

    @Column({ default: 1 })
    isActive: number;

    @Column({ default: 0 })
    isDelete: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}