import { Entity, ObjectIdColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { ObjectId } from "mongodb";
@Entity("users")
export class User {

    @ObjectIdColumn()
    id: ObjectId

    @Column()
    name: string

    @Column()
    email: string

    @Column("simple-json", { nullable: true })
    profileImage?: {
        fileName?: string;
        path?: string;
        originalName?: string;
    };
    @Column()
    phoneNumber: string

    @Column()
    password: string

    @Column({ default: 1 })
    isActive: number

    @Column({ default: 0 })
    isDelete: number

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date


}
