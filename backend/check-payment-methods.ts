import { bootstrap, TransactionalConnection } from '@vendure/core';
import { config } from './src/vendure-config';

async function checkPaymentMethods() {
  console.log('🚀 Bootstrapping Vendure to check payment methods...');
  
  const app = await bootstrap(config);
  
  try {
    // Get the connection from the app
    const connection = app.get(TransactionalConnection);
    
    console.log('✅ Connected to database via Vendure');

    // Check payment_method table
    console.log('\n📋 Checking payment_method table:');
    const paymentMethods = await connection.rawConnection.query(`
      SELECT id, code, name, description, enabled, "createdAt", "updatedAt"
      FROM payment_method 
      ORDER BY "createdAt" DESC
    `);
    
    if (paymentMethods.length === 0) {
      console.log('❌ No payment methods found in database');
    } else {
      console.log(`✅ Found ${paymentMethods.length} payment method(s):`);
      paymentMethods.forEach((method: any) => {
        console.log(`\n  📄 Payment Method:`);
        console.log(`     ID: ${method.id}`);
        console.log(`     Code: ${method.code}`);
        console.log(`     Name: ${method.name}`);
        console.log(`     Description: ${method.description}`);
        console.log(`     Enabled: ${method.enabled}`);
        console.log(`     Created: ${method.createdAt}`);
      });
    }

    // Check payment method handlers configuration
    console.log('\n🔧 Checking payment method handler configuration:');
    const handlerConfigs = await connection.rawConnection.query(`
      SELECT code, name, handler, enabled
      FROM payment_method
      WHERE enabled = true
    `);
    
    if (handlerConfigs.length > 0) {
      console.log('Enabled payment method handlers:');
      handlerConfigs.forEach((config: any) => {
        console.log(`  ${config.code}: ${config.name}`);
        console.log(`    Handler: ${JSON.stringify(config.handler, null, 2)}`);
      });
    } else {
      console.log('No enabled payment methods found');
    }

    // Check recent payments
    console.log('\n💳 Checking recent payments:');
    const payments = await connection.rawConnection.query(`
      SELECT id, method, state, amount, "createdAt"
      FROM payment 
      ORDER BY "createdAt" DESC 
      LIMIT 5
    `);
    
    if (payments.length === 0) {
      console.log('❌ No payments found in database');
    } else {
      console.log(`Found ${payments.length} recent payment(s):`);
      payments.forEach((payment: any) => {
        console.log(`  Payment ${payment.id}: method=${payment.method}, state=${payment.state}, amount=${payment.amount}`);
      });
    }

    // Check channels
    console.log('\n🏪 Checking channels:');
    const channels = await connection.rawConnection.query(`
      SELECT id, code, token, "defaultLanguageCode"
      FROM channel 
      ORDER BY "createdAt"
    `);
    
    console.log(`Found ${channels.length} channel(s):`);
    channels.forEach((channel: any) => {
      console.log(`  Channel ${channel.id}: code=${channel.code}, language=${channel.defaultLanguageCode}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await app.close();
    console.log('\n🔌 Application closed');
  }
}

checkPaymentMethods().catch(console.error);