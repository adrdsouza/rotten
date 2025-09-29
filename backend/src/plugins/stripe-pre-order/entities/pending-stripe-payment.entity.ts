import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Entity to track PaymentIntents that are linked to orders but not yet settled
 * Enhanced with error handling and retry tracking
 */
@Entity()
export class PendingStripePayment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    paymentIntentId: string;

    @Column()
    orderId: string;

    @Column()
    orderCode: string;

    @Column()
    amount: number;

    @Column({ nullable: true })
    currency?: string;

    @Column()
    customerEmail: string;

    @Column({ default: 'pending' })
    status: 'pending' | 'settled' | 'failed';

    @Column()
    createdAt: Date;

    @Column({ nullable: true })
    settledAt?: Date;

    @Column({ nullable: true })
    failedAt?: Date;

    @Column({ nullable: true })
    failureReason?: string;

    @Column({ nullable: true })
    failureType?: 'stripe_error' | 'validation_error' | 'system_error' | 'user_error';

    @Column({ nullable: true })
    isRetryable?: boolean;

    @Column({ default: 0 })
    retryCount: number;

    @Column({ default: false })
    manualSettlement: boolean;

    @Column({ nullable: true })
    settledBy?: string;

    @Column({ nullable: true })
    canceledBy?: string;
}