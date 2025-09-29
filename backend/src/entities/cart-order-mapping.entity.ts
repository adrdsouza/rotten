import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn } from 'typeorm';
import { VendureEntity } from '@vendure/core';

@Entity()
export class CartOrderMapping extends VendureEntity {
    constructor(input?: Partial<CartOrderMapping>) {
        super(input);
    }

    @Index({ unique: true })
    @Column({ length: 36 })
    cartUuid: string;

    @Index()
    @Column()
    orderId: string;

    @Index()
    @Column()
    orderCode: string;

    @Index()
    @Column({ nullable: true })
    paymentIntentId?: string;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ nullable: true })
    completedAt?: Date;
}