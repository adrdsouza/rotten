import { Logger } from '@vendure/core';
import * as sendpulse from 'sendpulse-api';
import * as Joi from 'joi';

export interface NewsletterSubscriptionInput {
    email: string;
    name?: string;
    source?: string;
}

export interface NewsletterSubscriptionResult {
    success: boolean;
    message: string;
    errorCode?: string;
    data?: any;
}

export class SendPulseService {
    private readonly logger = new Logger();
    private initialized = false;
    private readonly emailSchema = Joi.string().email().required();
    private readonly nameSchema = Joi.string().min(1).max(100).optional();

    constructor() {
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            const apiUserId = process.env.SENDPULSE_API_USER_ID;
            const apiSecret = process.env.SENDPULSE_API_SECRET;
            const tokenStorage = process.env.SENDPULSE_TOKEN_STORAGE || '/tmp/sendpulse/';

            if (!apiUserId || !apiSecret) {
                this.logger.warn('SendPulse API credentials not configured. Newsletter functionality will be disabled.');
                return;
            }

            return new Promise((resolve, reject) => {
                sendpulse.init(
                    apiUserId,
                    apiSecret,
                    tokenStorage,
                    (token: any) => {
                        if (token && token.is_error) {
                            this.logger.error(`Failed to initialize SendPulse: ${token.message}`);
                            reject(new Error(`SendPulse initialization failed: ${token.message}`));
                        } else {
                            this.initialized = true;
                            this.logger.log('SendPulse service initialized successfully');
                            resolve(undefined);
                        }
                    }
                );
            });
        } catch (error) {
            this.logger.error(`Error during SendPulse initialization: ${error}`);
            throw error;
        }
    }

    async subscribeToNewsletter(input: NewsletterSubscriptionInput): Promise<NewsletterSubscriptionResult> {
        if (!this.initialized) {
            return {
                success: false,
                message: 'Newsletter service is not available',
                errorCode: 'SERVICE_UNAVAILABLE'
            };
        }

        // Validate input
        const { error: emailError } = this.emailSchema.validate(input.email);
        if (emailError) {
            return {
                success: false,
                message: 'Invalid email address format',
                errorCode: 'INVALID_EMAIL'
            };
        }

        if (input.name) {
            const { error: nameError } = this.nameSchema.validate(input.name);
            if (nameError) {
                return {
                    success: false,
                    message: 'Name must be between 1 and 100 characters',
                    errorCode: 'INVALID_NAME'
                };
            }
        }

        const addressBookId = process.env.SENDPULSE_NEWSLETTER_BOOK_ID;
        if (!addressBookId) {
            return {
                success: false,
                message: 'Newsletter configuration error',
                errorCode: 'CONFIG_ERROR'
            };
        }

        try {
            return new Promise((resolve) => {
                const emailData = [{
                    email: input.email.toLowerCase().trim(),
                    variables: {
                        ...(input.name && { name: input.name.trim() }),
                        ...(input.source && { source: input.source }),
                        subscribed_at: new Date().toISOString(),
                        ip_address: 'web_form'
                    }
                }];

                sendpulse.addEmails(
                    (response: any) => {
                        if (response && response.is_error) {
                            this.logger.error('SendPulse subscription error:', response);
                            
                            // Handle specific SendPulse errors
                            let message = 'Failed to subscribe to newsletter';
                            let errorCode = 'SUBSCRIPTION_FAILED';
                            
                            if (response.error_code === 19) {
                                message = 'This email address is already subscribed to our newsletter';
                                errorCode = 'ALREADY_SUBSCRIBED';
                            } else if (response.error_code === 20 || response.error_code === 97) {
                                message = 'Free email services are not allowed for this newsletter';
                                errorCode = 'EMAIL_REJECTED';
                            } else if (response.message) {
                                message = response.message;
                            }

                            resolve({
                                success: false,
                                message,
                                errorCode
                            });
                        } else {
                            this.logger.log(`Successfully subscribed email: ${input.email}`);
                            resolve({
                                success: true,
                                message: 'Successfully subscribed to newsletter!',
                                data: {
                                    subscriberId: response?.result?.id
                                }
                            });
                        }
                    },
                    addressBookId,
                    emailData
                );
            });
        } catch (error) {
            this.logger.error(`Unexpected error during newsletter subscription: ${error}`);
            return {
                success: false,
                message: 'An unexpected error occurred. Please try again later.',
                errorCode: 'INTERNAL_ERROR'
            };
        }
    }

    async unsubscribeFromNewsletter(email: string): Promise<NewsletterSubscriptionResult> {
        if (!this.initialized) {
            return {
                success: false,
                message: 'Newsletter service is not available',
                errorCode: 'SERVICE_UNAVAILABLE'
            };
        }

        // Validate email
        const { error } = this.emailSchema.validate(email);
        if (error) {
            return {
                success: false,
                message: 'Invalid email address format',
                errorCode: 'INVALID_EMAIL'
            };
        }

        const addressBookId = process.env.SENDPULSE_NEWSLETTER_BOOK_ID;
        if (!addressBookId) {
            return {
                success: false,
                message: 'Newsletter configuration error',
                errorCode: 'CONFIG_ERROR'
            };
        }

        try {
            return new Promise((resolve) => {
                sendpulse.removeEmails(
                    (response: any) => {
                        if (response && response.is_error) {
                            this.logger.error('SendPulse unsubscribe error:', response);
                            
                            let message = 'Failed to unsubscribe from newsletter';
                            let errorCode = 'UNSUBSCRIBE_FAILED';
                            
                            if (response.error_code === 502) {
                                message = 'Email address not found in our newsletter list';
                                errorCode = 'EMAIL_NOT_FOUND';
                            } else if (response.message) {
                                message = response.message;
                            }

                            resolve({
                                success: false,
                                message,
                                errorCode
                            });
                        } else {
                            this.logger.log(`Successfully unsubscribed email: ${email}`);
                            resolve({
                                success: true,
                                message: 'Successfully unsubscribed from newsletter'
                            });
                        }
                    },
                    addressBookId,
                    [email.toLowerCase().trim()]
                );
            });
        } catch (error) {
            this.logger.error(`Unexpected error during newsletter unsubscription: ${error}`);
            return {
                success: false,
                message: 'An unexpected error occurred. Please try again later.',
                errorCode: 'INTERNAL_ERROR'
            };
        }
    }

    async getSubscriberInfo(email: string): Promise<any> {
        if (!this.initialized) {
            throw new Error('SendPulse service is not initialized');
        }

        const addressBookId = process.env.SENDPULSE_NEWSLETTER_BOOK_ID;
        if (!addressBookId) {
            throw new Error('Newsletter address book ID not configured');
        }

        return new Promise((resolve, reject) => {
            sendpulse.getEmailInfo(
                (response: any) => {
                    if (response && response.is_error) {
                        reject(new Error(response.message || 'Failed to get subscriber info'));
                    } else {
                        resolve(response);
                    }
                },
                addressBookId,
                email.toLowerCase().trim()
            );
        });
    }

    async getNewsletterStats(): Promise<any> {
        if (!this.initialized) {
            return {
                totalSubscribers: 0,
                activeSubscribers: 0,
                subscribersThisMonth: 0,
                unsubscribersThisMonth: 0,
            };
        }

        const addressBookId = process.env.SENDPULSE_NEWSLETTER_BOOK_ID;
        if (!addressBookId) {
            return {
                totalSubscribers: 0,
                activeSubscribers: 0,
                subscribersThisMonth: 0,
                unsubscribersThisMonth: 0,
            };
        }

        try {
            return new Promise((resolve) => {
                sendpulse.getBookInfo(
                    (response: any) => {
                        if (response && response.is_error) {
                            this.logger.error('Failed to get newsletter stats:', response);
                            // Return default stats on error instead of rejecting
                            resolve({
                                totalSubscribers: 0,
                                activeSubscribers: 0,
                                subscribersThisMonth: 0,
                                unsubscribersThisMonth: 0,
                            });
                        } else {
                            // Transform SendPulse response to our expected format
                            const stats = {
                                totalSubscribers: response.all_email_qty || 0,
                                activeSubscribers: response.active_email_qty || 0,
                                subscribersThisMonth: response.new_emails || 0,
                                unsubscribersThisMonth: response.unsubscribed || 0,
                            };
                            resolve(stats);
                        }
                    },
                    addressBookId
                );
            });
        } catch (error) {
            this.logger.error(`Unexpected error getting newsletter stats: ${error}`);
            // Return default stats on error
            return {
                totalSubscribers: 0,
                activeSubscribers: 0,
                subscribersThisMonth: 0,
                unsubscribersThisMonth: 0,
            };
        }
    }

    async getSubscribers(limit: number = 50, offset: number = 0): Promise<any[]> {
        if (!this.initialized) {
            return [];
        }

        const addressBookId = process.env.SENDPULSE_NEWSLETTER_BOOK_ID;
        if (!addressBookId) {
            return [];
        }

        try {
            // Note: SendPulse API doesn't provide a direct way to list all subscribers
            // This is a placeholder implementation that returns empty array
            // In a real implementation, you might need to use different API endpoints
            // or contact SendPulse support for proper subscriber listing capabilities
            return [];
        } catch (error) {
            this.logger.error(`Unexpected error getting subscribers: ${error}`);
            return [];
        }
    }

    isInitialized(): boolean {
        return this.initialized;
    }
}
