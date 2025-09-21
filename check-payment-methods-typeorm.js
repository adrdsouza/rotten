#!/usr/bin/env node

/**
 * Script to check payment methods using TypeORM connection
 * Based on the existing codebase pattern
 */

const { createConnection } = require('typeorm');
require('dotenv').config();

async function checkPaymentMethods() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database with TypeORM...');
    
    // Create connection similar to Vendure's setup
    connection = await createConnection({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'vendure',
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      synchronize: false,
      logging: false,
    });

    console.log('✅ Connected to database');

    // Check payment_method table
    console.log('\n📋 Checking payment_method table:');
    const paymentMethods = await connection.query(`
      SELECT id, code, name, description, enabled, "createdAt", "updatedAt"
      FROM payment_method 
      ORDER BY "createdAt" DESC
    `);
    
    if (paymentMethods.length === 0) {
      console.log('❌ No payment methods found in database');
    } else {
      console.log(`✅ Found ${paymentMethods.length} payment method(s):`);
      paymentMethods.forEach(method => {
        console.log(`\n  📄 Payment Method:`);
        console.log(`     ID: ${method.id}`);
        console.log(`     Code: ${method.code}`);
        console.log(`     Name: ${method.name}`);
        console.log(`     Description: ${method.description}`);
        console.log(`     Enabled: ${method.enabled}`);
        console.log(`     Created: ${method.createdAt}`);
        console.log(`     Updated: ${method.updatedAt}`);
      });
    }

    // Check payment_method_handler table if it exists
    console.log('\n🔧 Checking payment method configuration:');
    try {
      const handlerConfigs = await connection.query(`
        SELECT pm.code as payment_method_code, pm.name, pm.handler
        FROM payment_method pm
        WHERE pm.enabled = true
      `);
      
      if (handlerConfigs.length > 0) {
        console.log('Payment method handlers:');
        handlerConfigs.forEach(config => {
          console.log(`  ${config.payment_method_code}: ${JSON.stringify(config.handler, null, 2)}`);
        });
      } else {
        console.log('No enabled payment methods with handler configuration found');
      }
    } catch (error) {
      console.log('Could not query payment method handlers:', error.message);
    }

    // Check if there are any payment records
    console.log('\n💳 Checking recent payments:');
    const payments = await connection.query(`
      SELECT id, method, state, amount, "createdAt"
      FROM payment 
      ORDER BY "createdAt" DESC 
      LIMIT 5
    `);
    
    if (payments.length === 0) {
      console.log('❌ No payments found in database');
    } else {
      console.log(`Found ${payments.length} recent payment(s):`);
      payments.forEach(payment => {
        console.log(`  Payment ${payment.id}: method=${payment.method}, state=${payment.state}, amount=${payment.amount}`);
      });
    }

    // Check channels (payment methods are channel-specific)
    console.log('\n🏪 Checking channels:');
    const channels = await connection.query(`
      SELECT id, code, token, "defaultLanguageCode", "createdAt"
      FROM channel 
      ORDER BY "createdAt"
    `);
    
    console.log(`Found ${channels.length} channel(s):`);
    channels.forEach(channel => {
      console.log(`  Channel ${channel.id}: code=${channel.code}, language=${channel.defaultLanguageCode}`);
    });

    // Check payment-related tables
    console.log('\n📊 Checking payment-related table structure:');
    const tables = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%payment%'
      ORDER BY table_name
    `);
    
    console.log('Payment-related tables:');
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

checkPaymentMethods().catch(console.error);