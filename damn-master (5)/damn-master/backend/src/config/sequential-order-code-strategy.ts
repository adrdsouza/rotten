import { OrderCodeStrategy, RequestContext, Injector, TransactionalConnection } from '@vendure/core';

/**
 * Custom OrderCodeStrategy that generates sequential order numbers starting from DD29142
 * to continue from imported WordPress orders and avoid conflicts.
 * 
 * IMPORTANT: This strategy ONLY affects NEW orders. It never modifies existing order codes.
 */
export class SequentialOrderCodeStrategy implements OrderCodeStrategy {
    private connection: TransactionalConnection;
    private readonly startingNumber = 29142; // Continue from DD29142 after DD29141

    init(injector: Injector) {
        this.connection = injector.get(TransactionalConnection);
    }

    async generate(ctx: RequestContext): Promise<string> {
        // Get the next sequential number from the database
        const nextNumber = await this.getNextOrderNumber(ctx);
        return `DD${nextNumber}`;
    }

    private async getNextOrderNumber(ctx: RequestContext): Promise<number> {
        // Use a transaction to ensure atomicity when generating order numbers
        return await this.connection.withTransaction(ctx, async (_transactionCtx) => {
            // Query for the highest numeric part of DD-prefixed order codes
            // This finds the highest existing DD number to continue the sequence
            const result = await this.connection.rawConnection.query(`
                SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 3) AS INTEGER)), $1) as max_code 
                FROM "order" 
                WHERE code ~ '^DD[0-9]+$'
            `, [this.startingNumber - 1]);

            const maxCode = parseInt(result[0]?.max_code || this.startingNumber - 1);
            
            // Return the next number in sequence
            // If DB has DD29141, this returns 29142
            // If DB has DD29150, this returns 29151
            return Math.max(maxCode + 1, this.startingNumber);
        });
    }
}
