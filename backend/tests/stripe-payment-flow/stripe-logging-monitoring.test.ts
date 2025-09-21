import { Test, TestingModule } from '@nestjs/testing';
import { StripePaymentMetricsService } from '../../src/plugins/stripe-pre-order/stripe-payment-metrics.service';
import { StripeMonitoringService } from '../../src/plugins/stripe-pre-order/stripe-monitoring.service';
import { PaymentLogger } from '../../src/utils/payment-logger';

describe('Stripe Payment Logging and Monitoring', () => {
    let metricsService: StripePaymentMetricsService;
    let monitoringService: StripeMonitoringService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StripePaymentMetricsService,
                StripeMonitoringService
            ],
        }).compile();

        metricsService = module.get<StripePaymentMetricsService>(StripePaymentMetricsService);
        monitoringService = module.get<StripeMonitoringService>(StripeMonitoringService);
    });

    afterEach(() => {
        // Reset metrics after each test
        metricsService.resetMetrics();
        monitoringService.clearAlertCooldowns();
    });

    describe('PaymentIntent Lifecycle Logging', () => {
        it('should log PaymentIntent creation', () => {
            const paymentIntentId = 'pi_test_creation_123';
            const estimatedTotal = 2500;
            const currency = 'usd';

            // Log creation
            metricsService.logPaymentIntentCreated(paymentIntentId, estimatedTotal, currency);

            // Verify metrics
            const summary = metricsService.getMetricsSummary();
            expect(summary.paymentIntents.created).toBe(1);
        });

        it('should log PaymentIntent linking', () => {
            const paymentIntentId = 'pi_test_linking_123';
            const orderId = 'order_123';
            const orderCode = 'ORDER-001';
            const finalTotal = 2750;
            const customerEmail = 'test@example.com';

            // Log linking
            metricsService.logPaymentIntentLinked(
                paymentIntentId,
                orderId,
                orderCode,
                finalTotal,
                customerEmail
            );

            // Verify metrics
            const summary = metricsService.getMetricsSummary();
            expect(summary.paymentIntents.linked).toBe(1);
        });

        it('should track complete PaymentIntent lifecycle', () => {
            const paymentIntentId = 'pi_test_lifecycle_123';
            const orderId = 'order_123';
            const orderCode = 'ORDER-001';
            const estimatedTotal = 2500;
            const finalTotal = 2750;
            const currency = 'usd';
            const customerEmail = 'test@example.com';

            // 1. Creation
            metricsService.logPaymentIntentCreated(paymentIntentId, estimatedTotal, currency);

            // 2. Linking
            metricsService.logPaymentIntentLinked(
                paymentIntentId,
                orderId,
                orderCode,
                finalTotal,
                customerEmail
            );

            // 3. Settlement attempt
            const startTime = metricsService.logSettlementAttemptStart(paymentIntentId, orderId);

            // 4. Successful settlement
            metricsService.logSettlementSuccess(
                paymentIntentId,
                orderId,
                'payment_123',
                finalTotal,
                currency,
                startTime
            );

            // Verify complete lifecycle
            const summary = metricsService.getMetricsSummary();
            expect(summary.paymentIntents.created).toBe(1);
            expect(summary.paymentIntents.linked).toBe(1);
            expect(summary.paymentIntents.settled).toBe(1);
            expect(summary.settlement.attempts).toBe(1);
            expect(summary.settlement.successes).toBe(1);
            expect(summary.settlement.successRate).toBe(100);
        });
    });

    describe('Settlement Metrics Logging', () => {
        it('should log successful settlement with timing', () => {
            const paymentIntentId = 'pi_test_success_123';
            const orderId = 'order_123';
            const paymentId = 'payment_123';
            const amount = 2500;
            const currency = 'usd';

            const startTime = metricsService.logSettlementAttemptStart(paymentIntentId, orderId);
            
            // Simulate some processing time
            const processingDelay = 150;
            const settlementStartTime = startTime - processingDelay;

            metricsService.logSettlementSuccess(
                paymentIntentId,
                orderId,
                paymentId,
                amount,
                currency,
                settlementStartTime
            );

            const summary = metricsService.getMetricsSummary();
            expect(summary.settlement.successes).toBe(1);
            expect(summary.settlement.successRate).toBe(100);
            expect(summary.timing.averageSettlementTime).toBeGreaterThan(processingDelay);
        });

        it('should log settlement failures with error details', () => {
            const paymentIntentId = 'pi_test_failure_123';
            const error = new Error('Payment declined by issuer');
            const errorCode = 'PAYMENT_DECLINED';
            const orderId = 'order_123';

            const startTime = metricsService.logSettlementAttemptStart(paymentIntentId, orderId);

            metricsService.logSettlementFailure(
                paymentIntentId,
                error,
                errorCode,
                orderId,
                startTime
            );

            const summary = metricsService.getMetricsSummary();
            expect(summary.settlement.failures).toBe(1);
            expect(summary.settlement.successRate).toBe(0);
            expect(summary.errors.byType['PAYMENT_DECLINED']).toBe(1);
        });

        it('should handle duplicate settlement attempts (idempotency)', () => {
            const paymentIntentId = 'pi_test_duplicate_123';
            const existingPaymentId = 'payment_existing_123';
            const orderId = 'order_123';

            metricsService.logDuplicateSettlement(paymentIntentId, existingPaymentId, orderId);

            const summary = metricsService.getMetricsSummary();
            expect(summary.settlement.duplicates).toBe(1);
        });
    });

    describe('Stripe API Metrics Logging', () => {
        it('should log successful API calls with timing', () => {
            const paymentIntentId = 'pi_test_api_success_123';
            const operation = 'retrieve';
            const startTime = Date.now() - 200; // Simulate 200ms API call

            metricsService.logStripeApiCall(operation, paymentIntentId, startTime, true);

            const summary = metricsService.getMetricsSummary();
            expect(summary.api.calls).toBe(1);
            expect(summary.api.failures).toBe(0);
            expect(summary.api.failureRate).toBe(0);
            expect(summary.timing.averageApiTime).toBeGreaterThan(150);
        });

        it('should log API failures and retries', () => {
            const paymentIntentId = 'pi_test_api_failure_123';
            const operation = 'retrieve';
            const startTime = Date.now() - 100;

            // First attempt fails
            metricsService.logStripeApiCall(operation, paymentIntentId, startTime, false, 1);
            
            // Second attempt succeeds (retry)
            metricsService.logStripeApiCall(operation, paymentIntentId, startTime, true, 2);

            const summary = metricsService.getMetricsSummary();
            expect(summary.api.calls).toBe(2);
            expect(summary.api.failures).toBe(1);
            expect(summary.api.retries).toBe(1);
            expect(summary.api.failureRate).toBe(50);
            expect(summary.api.retryRate).toBe(50);
        });
    });

    describe('Error Pattern Tracking', () => {
        it('should track error types and frequencies', () => {
            const paymentIntentId = 'pi_test_errors_123';

            // Log multiple errors of different types
            metricsService.logSettlementFailure(
                paymentIntentId + '_1',
                new Error('Payment declined'),
                'PAYMENT_DECLINED'
            );

            metricsService.logSettlementFailure(
                paymentIntentId + '_2',
                new Error('Payment declined'),
                'PAYMENT_DECLINED'
            );

            metricsService.logSettlementFailure(
                paymentIntentId + '_3',
                new Error('Network timeout'),
                'NETWORK_ERROR'
            );

            const summary = metricsService.getMetricsSummary();
            expect(summary.errors.byType['PAYMENT_DECLINED']).toBe(2);
            expect(summary.errors.byType['NETWORK_ERROR']).toBe(1);
            expect(summary.errors.topErrorType).toBe('PAYMENT_DECLINED');
        });

        it('should track PaymentIntent status distribution', () => {
            const paymentIntentId = 'pi_test_status_123';

            // Log status validations
            metricsService.logPaymentIntentStatusValidation(paymentIntentId + '_1', 'succeeded', true, 50);
            metricsService.logPaymentIntentStatusValidation(paymentIntentId + '_2', 'requires_action', false, 30);
            metricsService.logPaymentIntentStatusValidation(paymentIntentId + '_3', 'requires_action', false, 25);

            const summary = metricsService.getMetricsSummary();
            expect(summary.errors.byStatus['succeeded']).toBe(1);
            expect(summary.errors.byStatus['requires_action']).toBe(2);
            expect(summary.errors.topStatus).toBe('requires_action');
        });
    });

    describe('Monitoring Service', () => {
        it('should provide monitoring status', () => {
            const status = monitoringService.getMonitoringStatus();
            
            expect(status).toHaveProperty('metricsLogging');
            expect(status).toHaveProperty('healthChecks');
            expect(status).toHaveProperty('alerting');
            expect(status).toHaveProperty('config');
            expect(status).toHaveProperty('lastAlerts');
        });

        it('should force metrics report', () => {
            // Add some test data
            metricsService.logPaymentIntentCreated('pi_test_123', 2500, 'usd');
            
            // Force metrics report (should not throw)
            expect(() => monitoringService.forceMetricsReport()).not.toThrow();
        });

        it('should enable/disable alerting', () => {
            monitoringService.setAlertingEnabled(false);
            let status = monitoringService.getMonitoringStatus();
            expect(status.alerting).toBe(false);

            monitoringService.setAlertingEnabled(true);
            status = monitoringService.getMonitoringStatus();
            expect(status.alerting).toBe(true);
        });

        it('should clear alert cooldowns', () => {
            monitoringService.clearAlertCooldowns();
            const status = monitoringService.getMonitoringStatus();
            expect(Object.keys(status.lastAlerts)).toHaveLength(0);
        });
    });

    describe('Comprehensive Metrics Summary', () => {
        it('should provide complete metrics summary', () => {
            // Create comprehensive test scenario
            const paymentIntentId = 'pi_comprehensive_test_123';
            const orderId = 'order_123';
            const orderCode = 'ORDER-001';

            // 1. PaymentIntent creation
            metricsService.logPaymentIntentCreated(paymentIntentId, 2500, 'usd');

            // 2. PaymentIntent linking
            metricsService.logPaymentIntentLinked(
                paymentIntentId,
                orderId,
                orderCode,
                2750,
                'test@example.com'
            );

            // 3. API calls
            const apiStartTime = Date.now() - 150;
            metricsService.logStripeApiCall('retrieve', paymentIntentId, apiStartTime, true);

            // 4. Status validation
            metricsService.logPaymentIntentStatusValidation(paymentIntentId, 'succeeded', true, 25);

            // 5. Successful settlement
            const settlementStartTime = metricsService.logSettlementAttemptStart(paymentIntentId, orderId);
            metricsService.logSettlementSuccess(
                paymentIntentId,
                orderId,
                'payment_123',
                2750,
                'usd',
                settlementStartTime - 200
            );

            const summary = metricsService.getMetricsSummary();

            // Verify all aspects are tracked
            expect(summary.paymentIntents.created).toBe(1);
            expect(summary.paymentIntents.linked).toBe(1);
            expect(summary.paymentIntents.settled).toBe(1);
            expect(summary.settlement.attempts).toBe(1);
            expect(summary.settlement.successes).toBe(1);
            expect(summary.settlement.successRate).toBe(100);
            expect(summary.api.calls).toBe(1);
            expect(summary.api.failureRate).toBe(0);
            expect(summary.timing.averageSettlementTime).toBeGreaterThan(0);
            expect(summary.timing.averageApiTime).toBeGreaterThan(0);
            expect(summary.uptime.hours).toBeGreaterThan(0);
        });
    });

    describe('PaymentLogger Integration', () => {
        it('should use PaymentLogger for audit trails', () => {
            // Mock PaymentLogger to verify it's being called
            const logPaymentEventSpy = jest.spyOn(PaymentLogger, 'logPaymentEvent');
            
            const paymentIntentId = 'pi_audit_test_123';
            const orderId = 'order_123';
            
            // Log a settlement success
            const startTime = metricsService.logSettlementAttemptStart(paymentIntentId, orderId);
            metricsService.logSettlementSuccess(
                paymentIntentId,
                orderId,
                'payment_123',
                2500,
                'usd',
                startTime
            );

            // Verify PaymentLogger was called
            expect(logPaymentEventSpy).toHaveBeenCalledWith(
                'settle',
                expect.objectContaining({
                    transactionId: paymentIntentId,
                    orderId: orderId,
                    status: 'settled'
                })
            );

            logPaymentEventSpy.mockRestore();
        });
    });
});