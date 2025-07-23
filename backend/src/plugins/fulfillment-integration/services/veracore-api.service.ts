import { Injectable, Logger } from '@nestjs/common';
import { RequestContext, TransactionalConnection } from '@vendure/core';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { VeraCoreConfigEntity } from '../entities/veracore-config.entity';
import { ErrorHandlerService } from './error-handler.service';

interface VeraCoreTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface VeraCoreOrderRequest {
  CompanyId: string;
  OrderNumber: string;
  Customer: {
    FirstName?: string;
    LastName?: string;
    Email?: string;
  };
  ShippingAddress: {
    Address1?: string;
    Address2?: string;
    City?: string;
    State?: string;
    Zip?: string;
    Country?: string;
  };
  Items: Array<{
    SKU: string;
    Quantity: number;
    UnitPrice?: number;
  }>;
}

interface VeraCoreInventoryItem {
  SKU: string;
  AvailableQuantity: number;
  ReservedQuantity: number;
  OnHandQuantity: number;
}

interface VeraCoreOrderStatus {
  OrderNumber: string;
  Status: string;
  TrackingNumber?: string;
  ShipDate?: string;
  Carrier?: string;
}

@Injectable()
export class VeraCoreApiService {
  private readonly logger = new Logger(VeraCoreApiService.name);
  private readonly httpClient: AxiosInstance;
  private config: VeraCoreConfigEntity | null = null;

  constructor(
    private connection: TransactionalConnection,
    private errorHandler: ErrorHandlerService,
  ) {
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vendure-VeraCore-Plugin/1.0.0',
      },
    });

    // Request interceptor to add auth token
    this.httpClient.interceptors.request.use(async (config) => {
      const token = await this.getValidToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        this.logger.error(`VeraCore API Error: ${error.message}`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
        throw error;
      }
    );
  }

  private async getConfig(ctx: RequestContext): Promise<VeraCoreConfigEntity | null> {
    if (!this.config) {
      this.config = await this.connection.getRepository(ctx, VeraCoreConfigEntity).findOne({
        where: {},
      });
    }
    return this.config;
  }

  private async getValidToken(): Promise<string | null> {
    const ctx = RequestContext.empty();
    const config = await this.getConfig(ctx);
    
    if (!config) {
      this.logger.warn('VeraCore configuration not found');
      return null;
    }

    if (config.accessToken && config.tokenExpiresAt && new Date() < config.tokenExpiresAt) {
      return config.accessToken;
    }

    return await this.refreshToken(ctx, config);
  }

  private async refreshToken(ctx: RequestContext, config: VeraCoreConfigEntity): Promise<string | null> {
    try {
      const response = await axios.post<VeraCoreTokenResponse>(
        `${config.apiUrl}/api/token`,
        new URLSearchParams({ 
          grant_type: 'client_credentials',
          scope: 'api' 
        }),
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      config.accessToken = response.data.access_token;
      // Set expiry 5 minutes before actual expiry for safety
      config.tokenExpiresAt = new Date(Date.now() + (response.data.expires_in - 300) * 1000);
      
      await this.connection.getRepository(ctx, VeraCoreConfigEntity).save(config);
      
      this.logger.log('Successfully refreshed VeraCore API token');
      return config.accessToken;
    } catch (error) {
      this.logger.error('Failed to refresh VeraCore API token', error);
      return null;
    }
  }

  async createOrder(ctx: RequestContext, orderData: VeraCoreOrderRequest): Promise<{ success: boolean; veracoreOrderId?: string; error?: string }> {
    const config = await this.getConfig(ctx);
    if (!config) {
      return { success: false, error: 'VeraCore configuration not found' };
    }

    const result = await this.errorHandler.withRetry(
      async () => {
        return await this.httpClient.post('/api/orders', orderData);
      },
      {
        maxRetries: 3,
        baseDelay: 2000,
      },
      `create order ${orderData.OrderNumber}`
    );

    if (result.success && result.result) {
      this.logger.log(`Successfully created order ${orderData.OrderNumber} in VeraCore`, {
        orderId: result.result.data.OrderId,
        status: result.result.status,
        attempts: result.attempts,
      });

      return {
        success: true,
        veracoreOrderId: result.result.data.OrderId,
      };
    } else {
      const errorMessage = this.extractErrorMessage(result.error);
      this.errorHandler.logError(result.error, `create order ${orderData.OrderNumber}`, {
        attempts: result.attempts,
        orderData,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getOrderStatus(ctx: RequestContext, orderNumber: string): Promise<VeraCoreOrderStatus | null> {
    try {
      const response = await this.httpClient.get(`/api/orders/${orderNumber}/status`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch order status for ${orderNumber}`, error);
      return null;
    }
  }

  async getInventory(ctx: RequestContext, sku?: string): Promise<VeraCoreInventoryItem[]> {
    try {
      const url = sku ? `/api/inventory/${sku}` : '/api/inventory';
      const response = await this.httpClient.get(url);
      
      // Handle both single item and array responses
      const data = Array.isArray(response.data) ? response.data : [response.data];
      return data;
    } catch (error) {
      this.logger.error(`Failed to fetch inventory${sku ? ` for SKU ${sku}` : ''}`, error);
      return [];
    }
  }

  private extractErrorMessage(error: any): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message) {
      return error.message;
    }
    return 'Unknown error occurred';
  }
}
