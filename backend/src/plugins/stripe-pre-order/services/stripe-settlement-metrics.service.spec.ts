import { Test, TestingModule } from '@nestjs/testing';
import { StripeSettlementMetricsService } from './stripe-settlement-metrics.service';
import { TransactionalConnection } from '@vendure/core';
import { PendingStripePayment } from '../entities/pending-stripe-payment.entity';

describe('StripeSettlementMetricsService', () => {
    let service: StripeSettlementMetricsService;
    let mockConnection: jest.Mocked<TransactionalConnection>;
    let mockRepository: any;

    beforeEach(async () => {
        mockRepository = {
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getOne: jest.fn(),
            getCount: jest.fn(),
            getRawMany: jest.fn()
        };

        mockConnection = {
            getRepository: jest.fn().mockReturnValue(mockRepository)
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StripeSettlementMetricsService,
                { provide: TransactionalConnection, useValue: mockConnection }
            ],
        }).compile();

        service = module.get<StripeSettlementMetricsService>(StripeSettlementMetricsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('recordSettlementAttempt', () => {
        it('should record a settlement attempt and return attempt ID', () => {
            const paymentIntentId = 'pi_test123';
            const orderCode = 'ORDER-001';

            const attemptId = service.recordSettlementAttempt(paymentIntentId, orderCode);

            expect(attemptId).toContain(paymentIntentId);
            expect(attemptId).toContain('_');
        });
    });

    describe('recordSettlementSuccess', () => {
        it('should record a successful settlement', () => {
            const attemptId = 'pi_test123_1234567890';
            const paymentIntentId = 'pi_test123';
            const orderCode = 'ORDER-001';
            const durationMs = 1500;
            const paymentId = 'payment_123';

            service.recordSettlementSuccess(attemptId, paymentIntentId, orderCode, durationMs, paymentId);

            const metrics = service.getMetricsSummary();
            expect(metrics.settlementStats.successes).toBe(1);
            expect(metrics.settlementStats.consecutiveFailures).toBe(0);
        });
    });

    describe('recordSettlementFailure', () => {
        it('should record a settlement failure', () => {
            const attemptId = 'pi_test123_1234567890';
            const paymentIntentId = 'pi_test123';
            const orderCode = 'ORDER-001';
            const error = 'Payment failed';
            const durationMs = 1000;

            service.recordSettlementFailure(attemptId, paymentIntentId, orderCode, error, durationMs, 'api');

            const metrics = service.getMetricsSummary();
            expect(metrics.settlementStats.failures).toBe(1);
            expect(metrics.settlementStats.consecutiveFailures).toBe(1);
        });
    });

    describe('recordApiVerificationAttempt', () => {
        it('should record an API verification attempt', () => {
            const paymentIntentId = 'pi_test123';

            service.recordApiVerificationAttempt(paymentIntentId);

            const metrics = service.getMetricsSummary();
            expect(metrics.apiVerificationStats.attempts).toBe(1);
        });
    });

    describe('recordApiVerificationSuccess', () => {
        it('should record a successful API verification', () => {
            const paymentIntentId = 'pi_test123';
            const status = 'succeeded';
            const durationMs = 500;

            service.recordApiVerificationSuccess(paymentIntentId, status, durationMs);

            const metrics = service.getMetricsSummary();
            expect(metrics.apiVerificationStats.successes).toBe(1);
        });
    });

    describe('recordApiVerificationFailure', () => {
        it('should record a failed API verification', () => {
            const paymentIntentId = 'pi_test123';
            const error = 'Network error';
            const durationMs = 2000;

            service.recordApiVerificationFailure(paymentIntentId, error, durationMs);

            const metrics = service.getMetricsSummary();
            expect(metrics.apiVerificationStats.failures).toBe(1);
        });
    });

    describe('recordPaymentIntentLifecycle', () => {
        it('should record lifecycle events', () => {
            const paymentIntentId = 'pi_test123';
            const orderCode = 'ORDER-001';

            service.recordPaymentIntentLifecycle(paymentIntentId, 'created', orderCode);
            service.recordPaymentIntentLifecycle(paymentIntentId, 'linked', orderCode);
            service.recordPaymentIntentLifecycle(paymentIntentId, 'settled', orderCode);

            // Should not throw any errors
            expect(true).toBe(true);
        });
    });

    describe('getMetricsSummary', () => {
        it('should return comprehensive metrics summary', () => {
            // Record some test data
            const attemptId = service.recordSettlementAttempt('pi_test123', 'ORDER-001');
            service.recordSettlementSuccess(attemptId, 'pi_test123', 'ORDER-001', 1500, 'payment_123');
            service.recordApiVerificationAttempt('pi_test123');
            service.recordApiVerificationSuccess('pi_test123', 'succeeded', 500);

            const metrics = service.getMetricsSummary();

            expect(metrics.settlementStats.attempts).toBe(1);
            expect(metrics.settlementStats.successes).toBe(1);
            expect(metrics.settlementStats.failures).toBe(0);
            expect(metrics.settlementStats.successRate).toBe(1);
            expect(metrics.settlementStats.consecutiveFailures).toBe(0);
            expect(metrics.settlementStats.averageTimeMs).toBe(1500);

            expect(metrics.apiVerificationStats.attempts).toBe(1);
            expect(metrics.apiVerificationStats.successes).toBe(1);
            expect(metrics.apiVerificationStats.failures).toBe(0);
            expect(metrics.apiVerificationStats.successRate).toBe(1);

            expect(metrics.alerts.highErrorRate).toBe(false);
            expect(metrics.alerts.consecutiveFailures).toBe(false);
            expect(metrics.alerts.slowSettlement).toBe(false);
        });

        it('should detect alert conditions', () => {
            // Record multiple failures to trigger alerts
            for (let i = 0; i < 5; i++) {
                const attemptId = service.recordSettlementAttempt(`pi_test${i}`, `ORDER-00${i}`);
                service.recordSettlementFailure(attemptId, `pi_test${i}`, `ORDER-00${i}`, 'Test error', 15000, 'api');
            }

            const metrics = service.getMetricsSummary();

            expect(metrics.alerts.consecutiveFailures).toBe(true);
            expect(metrics.alerts.highErrorRate).toBe(true);
            expect(metrics.alerts.slowSettlement).toBe(true);
        });
    });

    describe('getDailyStats', () => {
        it('should return daily statistics', () => {
            const today = new Date().toISOString().split('T')[0];
            
            // Record some activity
            const attemptId = service.recordSettlementAttempt('pi_test123', 'ORDER-001');
            service.recordSettlementSuccess(attemptId, 'pi_test123', 'ORDER-001', 1500, 'payment_123');

            const stats = service.getDailyStats(today);

            expect(stats).not.toBeNull();
            expect(stats!.date).toBe(today);
            expect(stats!.attempts).toBe(1);
            expect(stats!.successes).toBe(1);
            expect(stats!.failures).toBe(0);
            expect(stats!.successRate).toBe(1);
            expect(stats!.averageTimeMs).toBe(1500);
        });

        it('should return null for dates with no data', () => {
            const stats = service.getDailyStats('2020-01-01');
            expect(stats).toBeNull();
        });
    });

    describe('getDatabaseStats', () => {
        it('should return database statistics', async () => {
            // Mock database responses
            mockRepository.count.mockResolvedValue(50);
            mockRepository.getRawMany.mockResolvedValue([
                { status: 'pending', count: '30' },
                { status: 'settled', count: '15' },
                { status: 'failed', count: '5' }
            ]);
            mockRepository.getOne.mockResolvedValue({
                createdAt: new Date('2023-01-01T00:00:00Z')
            });
            mockRepository.getCount.mockResolvedValue(25);

            const stats = await service.getDatabaseStats();

            expect(stats.totalPendingPayments).toBe(50);
            expect(stats.pendingByStatus).toEqual({
                pending: 30,
                settled: 15,
                failed: 5
            });
            expect(stats.oldestPendingPayment).toEqual(new Date('2023-01-01T00:00:00Z'));
            expect(stats.paymentsLast24Hours).toBe(25);
        });
    });

    describe('resetMetrics', () => {
        it('should reset all metrics to initial state', () => {
            // Record some data
            const attemptId = service.recordSettlementAttempt('pi_test123', 'ORDER-001');
            service.recordSettlementSuccess(attemptId, 'pi_test123', 'ORDER-001', 1500, 'payment_123');

            // Verify data exists
            let metrics = service.getMetricsSummary();
            expect(metrics.settlementStats.attempts).toBe(1);

            // Reset metrics
            service.resetMetrics();

            // Verify data is reset
            metrics = service.getMetricsSummary();
            expect(metrics.settlementStats.attempts).toBe(0);
            expect(metrics.settlementStats.successes).toBe(0);
            expect(metrics.settlementStats.failures).toBe(0);
            expect(metrics.settlementStats.consecutiveFailures).toBe(0);
        });
    });

    describe('generateHealthReport', () => {
        it('should generate healthy status report', async () => {
            // Mock healthy database state
            mockRepository.count.mockResolvedValue(10);
            mockRepository.getRawMany.mockResolvedValue([
                { status: 'pending', count: '5' },
                { status: 'settled', count: '5' }
            ]);
            mockRepository.getOne.mockResolvedValue({
                createdAt: new Date(Date.now() - 60000) // 1 minute ago
            });
            mockRepository.getCount.mockResolvedValue(5);

            // Record successful operations
            const attemptId = service.recordSettlementAttempt('pi_test123', 'ORDER-001');
            service.recordSettlementSuccess(attemptId, 'pi_test123', 'ORDER-001', 1500, 'payment_123');

            const report = await service.generateHealthReport();

            expect(report.status).toBe('healthy');
            expect(report.summary).toContain('operating normally');
            expect(report.recommendations).toContain('All metrics are within normal ranges.');
        });

        it('should generate critical status report for consecutive failures', async () => {
            // Mock database state
            mockRepository.count.mockResolvedValue(10);
            mockRepository.getRawMany.mockResolvedValue([]);
            mockRepository.getOne.mockResolvedValue(null);
            mockRepository.getCount.mockResolvedValue(5);

            // Record consecutive failures
            for (let i = 0; i < 5; i++) {
                const attemptId = service.recordSettlementAttempt(`pi_test${i}`, `ORDER-00${i}`);
                service.recordSettlementFailure(attemptId, `pi_test${i}`, `ORDER-00${i}`, 'Test error', 1000, 'api');
            }

            const report = await service.generateHealthReport();

            expect(report.status).toBe('critical');
            expect(report.summary).toContain('critical issues');
            expect(report.recommendations.length).toBeGreaterThan(0);
            expect(report.recommendations[0]).toContain('consecutive settlement failures');
        });

        it('should generate warning status for high error rate', async () => {
            // Mock database state
            mockRepository.count.mockResolvedValue(10);
            mockRepository.getRawMany.mockResolvedValue([]);
            mockRepository.getOne.mockResolvedValue(null);
            mockRepository.getCount.mockResolvedValue(5);

            // Record mixed success/failure to create high error rate
            for (let i = 0; i < 15; i++) {
                const attemptId = service.recordSettlementAttempt(`pi_test${i}`, `ORDER-00${i}`);
                if (i < 5) {
                    service.recordSettlementSuccess(attemptId, `pi_test${i}`, `ORDER-00${i}`, 1500, 'payment_123');
                } else {
                    service.recordSettlementFailure(attemptId, `pi_test${i}`, `ORDER-00${i}`, 'Test error', 1000, 'api');
                }
            }

            const report = await service.generateHealthReport();

            expect(report.status).toBe('warning');
            expect(report.summary).toContain('some issues');
            expect(report.recommendations.some(rec => rec.includes('error rate'))).toBe(true);
        });
    });
});