import { Entity, Column, Index } from 'typeorm';
import { VendureEntity } from '@vendure/core';

export enum SyncStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  ERROR = 'error',
  RETRYING = 'retrying',
}

@Entity('veracore_order_sync')
@Index(['vendureOrderId'], { unique: true })
@Index(['vendureOrderCode'])
@Index(['syncStatus'])
export class VeraCoreOrderSyncEntity extends VendureEntity {
  constructor(input?: Partial<VeraCoreOrderSyncEntity>) {
    super(input);
  }

  @Column({ type: 'varchar', length: 255 })
  @Index()
  vendureOrderId: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  vendureOrderCode: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  veracoreOrderId?: string;

  @Column({
    type: 'enum',
    enum: SyncStatus,
    default: SyncStatus.PENDING,
  })
  syncStatus: SyncStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAttempt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastSuccessfulSync?: Date;

  @Column({ type: 'json', nullable: true })
  syncMetadata?: {
    veracoreResponse?: any;
    requestPayload?: any;
    trackingInfo?: {
      trackingNumber?: string;
      carrier?: string;
      shipDate?: string;
      status?: string;
    };
  };
}
