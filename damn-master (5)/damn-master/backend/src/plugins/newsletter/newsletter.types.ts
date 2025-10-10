export interface NewsletterSubscriptionInput {
    email: string;
    name?: string;
    source?: string;
}

export interface NewsletterSubscriptionSuccess {
    success: boolean;
    message: string;
    subscriberId?: string;
}

export interface NewsletterSubscriptionError {
    errorCode: string;
    message: string;
    details?: string;
}

export interface NewsletterUnsubscribeSuccess {
    success: boolean;
    message: string;
}

export interface NewsletterUnsubscribeError {
    errorCode: string;
    message: string;
    details?: string;
}

export interface NewsletterStats {
    totalSubscribers: number;
    activeSubscribers: number;
    subscribersThisMonth: number;
    unsubscribersThisMonth: number;
}

export interface NewsletterSubscriber {
    email: string;
    name?: string;
    subscriptionDate: string;
    isActive: boolean;
    source?: string;
}

// Union types for GraphQL
export type NewsletterSubscriptionResult = NewsletterSubscriptionSuccess | NewsletterSubscriptionError;
export type NewsletterUnsubscribeResult = NewsletterUnsubscribeSuccess | NewsletterUnsubscribeError;

// Service interfaces
export interface SendPulseConfig {
    apiUserId: string;
    apiSecret: string;
    tokenStorage: string;
    defaultAddressBookId: string;
    senderName?: string;
    senderEmail?: string;
}

export interface NewsletterSubscriptionData {
    email: string;
    name?: string;
    source?: string;
    subscriptionDate?: Date;
    variables?: Record<string, any>;
}

export interface NewsletterServiceResponse {
    success: boolean;
    message: string;
    errorCode?: string;
    data?: any;
}
