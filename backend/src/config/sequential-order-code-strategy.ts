import { OrderCodeStrategy, RequestContext, Injector, TransactionalConnection } from '@vendure/core';

/**
 * Custom OrderCodeStrategy that generates sequential order numbers starting from RH000001
 * with zero-padded format for consistent order numbering.
 * 
 * IMPORTANT: This strategy ONLY affects NEW orders. It never modifies existing order codes.
 */
export class SequentialOrderCodeStrategy implements OrderCodeStrategy {
    private connection: TransactionalConnection;
    private readonly startingNumber = 1; // Start from RH000001

    init(injector: Injector) {
        this.connection = injector.get(TransactionalConnection);
    }

    async generate(ctx: RequestContext): Promise<string> {
        // Get the next sequential number from the database
        const nextNumber = await this.getNextOrderNumber(ctx);
        // Format with zero-padding to 6 digits (RH000001, RH000002, etc.)
        return `RH${nextNumber.toString().padStart(6, '0')}`;
    }

    private async getNextOrderNumber(ctx: RequestContext): Promise<number> {
        // Use a transaction to ensure atomicity when generating order numbers
        return await this.connection.withTransaction(ctx, async (transactionCtx) => {
            // Query for the highest numeric part of RH-prefixed order codes
            // This finds the highest existing RH number to continue the sequence
            const result = await this.connection.rawConnection.query(`
                SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 3) AS INTEGER)), $1) as max_code 
                FROM "order" 
                WHERE code ~ '^RH[0-9]+$'
            `, [this.startingNumber - 1]);

            const maxCode = parseInt(result[0]?.max_code || this.startingNumber - 1);
            
            // Return the next number in sequence
            // If DB has RH000001, this returns 2
            // If DB has RH000010, this returns 11
            return Math.max(maxCode + 1, this.startingNumber);
        });
    }
}
