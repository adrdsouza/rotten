import { Entity, Column } from 'typeorm';
import { VendureEntity } from '@vendure/core';

@Entity('veracore_config')
export class VeraCoreConfigEntity extends VendureEntity {
  constructor(input?: Partial<VeraCoreConfigEntity>) {
    super(input);
  }

  @Column({ type: 'varchar', length: 255 })
  apiUrl: string;

  @Column({ type: 'varchar', length: 255 })
  clientId: string;

  @Column({ type: 'text' })
  clientSecret: string; // Should be encrypted in production

  @Column({ type: 'varchar', length: 255 })
  companyId: string;

  @Column({ type: 'text', nullable: true })
  accessToken?: string; // Should be encrypted in production

  @Column({ type: 'text', nullable: true })
  refreshToken?: string; // Should be encrypted in production

  @Column({ type: 'timestamp', nullable: true })
  tokenExpiresAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastInventorySync?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastTrackingSync?: Date;

  @Column({ type: 'boolean', default: true })
  syncEnabled: boolean;

  @Column({ type: 'int', default: 30 })
  inventorySyncIntervalMinutes: number;

  @Column({ type: 'int', default: 15 })
  trackingSyncIntervalMinutes: number;

  @Column({ type: 'json', nullable: true })
  orderSyncTriggerStates?: string[];

  @Column({ type: 'json', nullable: true })
  webhookConfig?: {
    enabled: boolean;
    secret?: string;
    endpoints?: {
      inventory?: string;
      orders?: string;
      tracking?: string;
    };
  };

  @Column({ type: 'json', nullable: true })
  syncStats?: {
    totalOrdersSynced: number;
    totalInventoryUpdates: number;
    totalTrackingUpdates: number;
    lastSyncErrors: string[];
  };
}
