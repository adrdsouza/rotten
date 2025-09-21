import { Injectable, Logger } from '@nestjs/common';
import { RequestContext, TransactionalConnection, OrderService, PaymentService, Order, Payment } from '@vendure/core';
import Stripe from 'stripe';
import { StripeApiService } from './stripe-api.service';
import { StripePaymentMetricsService } from './stripe-payment-metrics.service';
import { StripeErrorHandlingService } from './error-handling.service';

/**
 * Admin service for manual payment resolution and troubleshooting
 * Provides tools for support staff to investigate and resolve payment issues
 */
@Injectable()
export class StripeAdminResolutionService {
    private readonly logger = new Logger('StripeAdminResolutionService');

    constructor(
        private readonly stripe: Stripe,
        private readonly stripeApiService: StripeApiService,
        private readonly connection: TransactionalConnection,
        private readonly orderService: OrderService,
        private readonly paymentService: PaymentService,
        private readonly metricsService: StripePaymentMetricsService,
        private readonly errorHandlingService: StripeErrorHandlingService
    ) {}

    /**
     * Get comprehensive payment investigation report
     */
    async investigatePayment(
        paymentIntentId: string,
        ctx: RequestContext
    ): Promise<PaymentInvestigationReport> {
        this.logger.log(`[ADMIN] Starting payment investigation for PaymentIntent ${paymentIntentId}`);

        try {
            // Retrieve PaymentIntent from Stripe
            const paymentIntent = await this.stripeApiService.retrievePaymentIntentWithRetry(paymentIntentId);
            
            // Get order information from metadata
            const orderCode = paymentIntent.metadata?.vendure_order_code;
            const orderId = paymentIntent.metadata?.vendure_order_id;
            
            let vendureOrder: Order | null = null;
            let vendurePayments: Payment[] = [];
            
            if (orderId) {
                try {
                    vendureOrder = await this.orderService.findOne(ctx, orderId);
                    if (vendureOrder) {
                        vendurePayments = vendureOrder.payments || [];
                    }
                } catch (error) {
                    this.logger.warn(`[ADMIN] Could not retrieve Vendure order ${orderId}: ${error}`);
                }
            }

            // Analyze payment status
            const statusInfo = this.stripeApiService.getPaymentIntentStatusInfo(paymentIntent.status);
            
            // Check for existing Vendure payment records
            const existingPayment = vendurePayments.find(payment =>
                payment.transactionId === paymentIntentId ||
                payment.metadata?.paymentIntentId === paymentIntentId
            );

            // Determine resolution recommendations
            const recommendations = this.generateResolutionRecommendations(
                paymentIntent,
                vendureOrder,
                existingPayment,
                statusInfo
            );

            const report: PaymentInvestigationReport = {
                paymentIntentId,
                investigationTimestamp: new Date().toISOString(),
                stripePaymentIntent: {
                    id: paymentIntent.id,
                    status: paymentIntent.status,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                    created: new Date(paymentIntent.created * 1000).toISOString(),
                    metadata: paymentIntent.metadata,
                    lastPaymentError: paymentIntent.last_payment_error,
                    charges: paymentIntent.charges?.data || []
                },
                vendureOrder: vendureOrder ? {
                    id: vendureOrder.id,
                    code: vendureOrder.code,
                    state: vendureOrder.state,
                    totalWithTax: vendureOrder.totalWithTax,
                    customerEmail: vendureOrder.customer?.emailAddress,
                    createdAt: vendureOrder.createdAt.toISOString(),
                    updatedAt: vendureOrder.updatedAt.toISOString()
                } : null,
                vendurePayments: vendurePayments.map(payment => ({
                    id: payment.id,
                    method: payment.method,
                    amount: payment.amount,
                    state: payment.state,
                    transactionId: payment.transactionId,
                    metadata: payment.metadata,
                    createdAt: payment.createdAt.toISOString()
                })),
                statusAnalysis: {
                    canSettle: statusInfo.canSettle,
                    isTerminal: statusInfo.isTerminal,
                    requiresUserAction: statusInfo.requiresUserAction,
                    isFailure: statusInfo.isFailure,
                    description: statusInfo.description,
                    userMessage: statusInfo.userMessage
                },
                inconsistencies: this.detectInconsistencies(paymentIntent, vendureOrder, existingPayment),
                recommendations,
                availableActions: this.getAvailableActions(paymentIntent, vendureOrder, existingPayment, statusInfo)
            };

            this.logger.log(`[ADMIN] Investigation completed for PaymentIntent ${paymentIntentId}`);
            return report;

        } catch (error) {
            this.logger.error(`[ADMIN] Investigation failed for PaymentIntent ${paymentIntentId}: ${error}`);
            throw this.errorHandlingService.createErrorResponse(error, paymentIntentId, 'ADMIN_INVESTIGATION');
        }
    }

    /**
     * Manually settle a payment with admin override
     */
    async manuallySettlePayment(
        paymentIntentId: string,
        ctx: RequestContext,
        adminUserId: string,
        reason: string,
        forceSettle: boolean = false
    ): Promise<ManualSettlementResult> {
        this.logger.log(`[ADMIN] Manual settlement requested by admin ${adminUserId} for PaymentIntent ${paymentIntentId}`);
        this.logger.log(`[ADMIN] Reason: ${reason}, Force: ${forceSettle}`);

        try {
            // First, investigate the payment to understand current state
            const investigation = await this.investigatePayment(paymentIntentId, ctx);
            
            // Check if manual settlement is appropriate
            if (!forceSettle && !investigation.statusAnalysis.canSettle) {
                return {
                    success: false,
                    error: `Payment cannot be settled. Status: ${investigation.stripePaymentIntent.status}`,
                    investigation
                };
            }

            // Check if payment is already settled
            if (investigation.vendurePayments.length > 0) {
                const existingPayment = investigation.vendurePayments.find(p => 
                    p.transactionId === paymentIntentId || p.metadata?.paymentIntentId === paymentIntentId
                );
                
                if (existingPayment && !forceSettle) {
                    return {
                        success: true,
                        message: 'Payment already settled',
                        paymentId: existingPayment.id,
                        investigation
                    };
                }
            }

            // Perform manual settlement
            const paymentIntent = await this.stripeApiService.retrievePaymentIntentWithRetry(paymentIntentId);
            
            if (!investigation.vendureOrder) {
                return {
                    success: false,
                    error: 'Cannot settle payment: Vendure order not found',
                    investigation
                };
            }

            // Create payment record with admin metadata
            const settlementResult = await this.connection.transaction(async (transactionalEntityManager) => {
                const paymentMetadata = {
                    paymentIntentId: paymentIntent.id,
                    stripePaymentMethodId: paymentIntent.payment_method as string,
                    customerEmail: investigation.vendureOrder!.customerEmail || 'guest',
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                    settlementTimestamp: new Date().toISOString(),
                    source: 'admin_manual_settlement',
                    adminUserId,
                    adminReason: reason,
                    forceSettle: forceSettle.toString(),
                    orderCode: investigation.vendureOrder!.code,
                    orderId: investigation.vendureOrder!.id,
                    stripeChargeId: paymentIntent.latest_charge as string || null,
                    paymentIntentStatus: paymentIntent.status,
                    idempotencyKey: `admin_${paymentIntent.id}_${investigation.vendureOrder!.id}_${Date.now()}`
                };

                const paymentResult = await this.paymentService.addPaymentToOrder(ctx, investigation.vendureOrder!.id, {
                    method: 'stripe',
                    metadata: paymentMetadata
                });

                if (!paymentResult || typeof paymentResult !== 'object') {
                    throw new Error('Payment creation returned invalid result');
                }

                return paymentResult;
            });

            // Log the manual settlement
            this.metricsService.logManualSettlement(
                paymentIntentId,
                investigation.vendureOrder.id,
                settlementResult.id,
                adminUserId,
                reason,
                forceSettle
            );

            this.logger.log(`[ADMIN] Manual settlement completed successfully. Payment ID: ${settlementResult.id}`);

            return {
                success: true,
                message: 'Payment manually settled successfully',
                paymentId: settlementResult.id,
                investigation
            };

        } catch (error) {
            this.logger.error(`[ADMIN] Manual settlement failed for PaymentIntent ${paymentIntentId}: ${error}`);
            
            this.metricsService.logManualSettlementFailure(
                paymentIntentId,
                adminUserId,
                reason,
                error instanceof Error ? error : new Error(String(error))
            );

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                investigation: await this.investigatePayment(paymentIntentId, ctx).catch(() => undefined)
            };
        }
    }

    /**
     * Cancel a stuck payment and update order state
     */
    async cancelStuckPayment(
        paymentIntentId: string,
        ctx: RequestContext,
        adminUserId: string,
        reason: string
    ): Promise<PaymentCancellationResult> {
        this.logger.log(`[ADMIN] Payment cancellation requested by admin ${adminUserId} for PaymentIntent ${paymentIntentId}`);

        try {
            const investigation = await this.investigatePayment(paymentIntentId, ctx);
            
            // Cancel PaymentIntent in Stripe if possible
            let stripeCancellationResult: any = null;
            try {
                if (investigation.stripePaymentIntent.status === 'requires_payment_method' ||
                    investigation.stripePaymentIntent.status === 'requires_confirmation' ||
                    investigation.stripePaymentIntent.status === 'requires_action') {
                    
                    stripeCancellationResult = await this.stripe.paymentIntents.cancel(paymentIntentId);
                    this.logger.log(`[ADMIN] PaymentIntent ${paymentIntentId} cancelled in Stripe`);
                }
            } catch (stripeError) {
                this.logger.warn(`[ADMIN] Could not cancel PaymentIntent in Stripe: ${stripeError}`);
            }

            // Update Vendure order state if needed
            let orderUpdateResult: any = null;
            if (investigation.vendureOrder && investigation.vendureOrder.state === 'ArrangingPayment') {
                try {
                    // Transition order to PaymentDeclined state
                    orderUpdateResult = await this.orderService.transitionToState(
                        ctx,
                        investigation.vendureOrder.id,
                        'PaymentDeclined'
                    );
                    this.logger.log(`[ADMIN] Order ${investigation.vendureOrder.code} transitioned to PaymentDeclined`);
                } catch (transitionError) {
                    this.logger.warn(`[ADMIN] Could not transition order state: ${transitionError}`);
                }
            }

            // Log the cancellation
            this.metricsService.logPaymentCancellation(
                paymentIntentId,
                investigation.vendureOrder?.id,
                adminUserId,
                reason,
                stripeCancellationResult?.status,
                orderUpdateResult?.state
            );

            return {
                success: true,
                message: 'Payment cancelled successfully',
                stripeCancelled: !!stripeCancellationResult,
                orderUpdated: !!orderUpdateResult,
                investigation
            };

        } catch (error) {
            this.logger.error(`[ADMIN] Payment cancellation failed for PaymentIntent ${paymentIntentId}: ${error}`);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    // Private helper methods

    private detectInconsistencies(
        paymentIntent: Stripe.PaymentIntent,
        vendureOrder: Order | null,
        existingPayment: Payment | null
    ): string[] {
        const inconsistencies: string[] = [];

        // Check if PaymentIntent is succeeded but no Vendure payment exists
        if (paymentIntent.status === 'succeeded' && !existingPayment) {
            inconsistencies.push('PaymentIntent succeeded in Stripe but no corresponding Vendure payment found');
        }

        // Check if Vendure payment exists but PaymentIntent is not succeeded
        if (existingPayment && paymentIntent.status !== 'succeeded') {
            inconsistencies.push(`Vendure payment exists but PaymentIntent status is '${paymentIntent.status}'`);
        }

        // Check amount mismatches
        if (vendureOrder && existingPayment && paymentIntent.amount !== existingPayment.amount) {
            inconsistencies.push(`Amount mismatch: Stripe ${paymentIntent.amount}, Vendure ${existingPayment.amount}`);
        }

        // Check if order is in wrong state
        if (vendureOrder && existingPayment && vendureOrder.state !== 'PaymentSettled') {
            inconsistencies.push(`Order state is '${vendureOrder.state}' but payment exists`);
        }

        return inconsistencies;
    }

    private generateResolutionRecommendations(
        paymentIntent: Stripe.PaymentIntent,
        vendureOrder: Order | null,
        existingPayment: Payment | null,
        statusInfo: any
    ): string[] {
        const recommendations: string[] = [];

        if (paymentIntent.status === 'succeeded' && !existingPayment) {
            recommendations.push('Manually settle the payment to create Vendure payment record');
        }

        if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_confirmation') {
            recommendations.push('Contact customer to complete payment authentication');
        }

        if (paymentIntent.status === 'canceled' && vendureOrder?.state === 'ArrangingPayment') {
            recommendations.push('Transition order to PaymentDeclined state');
        }

        if (paymentIntent.status === 'processing') {
            recommendations.push('Wait for payment to complete processing, then check again');
        }

        if (existingPayment && paymentIntent.status !== 'succeeded') {
            recommendations.push('Investigate potential duplicate payment or refund if necessary');
        }

        return recommendations;
    }

    private getAvailableActions(
        paymentIntent: Stripe.PaymentIntent,
        vendureOrder: Order | null,
        existingPayment: Payment | null,
        statusInfo: any
    ): AdminAction[] {
        const actions: AdminAction[] = [];

        if (paymentIntent.status === 'succeeded' && !existingPayment) {
            actions.push({
                action: 'MANUAL_SETTLE',
                label: 'Manually Settle Payment',
                description: 'Create Vendure payment record for this succeeded PaymentIntent',
                requiresReason: true
            });
        }

        if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_confirmation') {
            actions.push({
                action: 'CANCEL_PAYMENT',
                label: 'Cancel Stuck Payment',
                description: 'Cancel the PaymentIntent and update order state',
                requiresReason: true
            });
        }

        if (vendureOrder && vendureOrder.state === 'ArrangingPayment') {
            actions.push({
                action: 'UPDATE_ORDER_STATE',
                label: 'Update Order State',
                description: 'Manually transition order to appropriate state',
                requiresReason: true
            });
        }

        actions.push({
            action: 'FORCE_SETTLE',
            label: 'Force Settle (Admin Override)',
            description: 'Force settlement regardless of PaymentIntent status - use with caution',
            requiresReason: true,
            isDestructive: true
        });

        return actions;
    }
}

// Type definitions for admin resolution

export interface PaymentInvestigationReport {
    paymentIntentId: string;
    investigationTimestamp: string;
    stripePaymentIntent: {
        id: string;
        status: string;
        amount: number;
        currency: string;
        created: string;
        metadata: Record<string, string>;
        lastPaymentError?: any;
        charges: any[];
    };
    vendureOrder: {
        id: string;
        code: string;
        state: string;
        totalWithTax: number;
        customerEmail?: string;
        createdAt: string;
        updatedAt: string;
    } | null;
    vendurePayments: Array<{
        id: string;
        method: string;
        amount: number;
        state: string;
        transactionId?: string;
        metadata?: any;
        createdAt: string;
    }>;
    statusAnalysis: {
        canSettle: boolean;
        isTerminal: boolean;
        requiresUserAction?: boolean;
        isFailure?: boolean;
        description: string;
        userMessage: string;
    };
    inconsistencies: string[];
    recommendations: string[];
    availableActions: AdminAction[];
}

export interface ManualSettlementResult {
    success: boolean;
    message?: string;
    error?: string;
    paymentId?: string;
    investigation?: PaymentInvestigationReport;
}

export interface PaymentCancellationResult {
    success: boolean;
    message?: string;
    error?: string;
    stripeCancelled?: boolean;
    orderUpdated?: boolean;
    investigation?: PaymentInvestigationReport;
}

export interface AdminAction {
    action: string;
    label: string;
    description: string;
    requiresReason: boolean;
    isDestructive?: boolean;
}