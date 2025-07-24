const { Client } = require('pg');
const { exec } = require('child_process');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: './.env' });

async function restoreSchemaAndCreateAdmin() {
    console.log('🚀 Restoring Vendure schema and creating superadmin...');
    
    const dbConfig = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
    };

    // First, restore the schema
    const schemaFile = path.join(__dirname, '../database/backups/vendure_schema_20250722_160153.sql');
    
    console.log('1️⃣ Restoring database schema...');
    
    const restoreCommand = `PGPASSWORD=${dbConfig.password} psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f "${schemaFile}"`;
    
    return new Promise((resolve, reject) => {
        exec(restoreCommand, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Schema restore failed:', error);
                reject(error);
                return;
            }
            
            console.log('✅ Schema restored successfully');
            
            // Now create the superadmin user
            createSuperAdmin(dbConfig).then(resolve).catch(reject);
        });
    });
}

async function createSuperAdmin(dbConfig) {
    const client = new Client(dbConfig);
    
    try {
        await client.connect();
        console.log('2️⃣ Creating superadmin user...');

        // Start transaction
        await client.query('BEGIN');

        // Clear any existing users (but keep the schema)
        await client.query('DELETE FROM user_roles_role');
        await client.query('DELETE FROM authentication_method');
        await client.query('DELETE FROM administrator');
        await client.query('DELETE FROM "user"');
        console.log('✅ Cleared existing users');

        // Create the superadmin user
        const username = 'rotten';
        const password = 'superadmin';
        const hashedPassword = await bcrypt.hash(password, 12);

        // Insert the user
        const userResult = await client.query(`
            INSERT INTO "user" (identifier, verified, "createdAt", "updatedAt")
            VALUES ($1, true, NOW(), NOW())
            RETURNING id
        `, [username]);

        const userId = userResult.rows[0].id;
        console.log(`✅ Created user '${username}' with ID: ${userId}`);

        // Create authentication method
        await client.query(`
            INSERT INTO authentication_method (type, identifier, "passwordHash", "userId", "createdAt", "updatedAt")
            VALUES ('native-authentication-method', $1, $2, $3, NOW(), NOW())
        `, [username, hashedPassword, userId]);

        console.log('✅ Created authentication method');

        // Create administrator record
        await client.query(`
            INSERT INTO administrator ("createdAt", "updatedAt", "deletedAt", "firstName", "lastName", "emailAddress", "userId")
            VALUES (NOW(), NOW(), NULL, 'Rotten', 'Hand', 'admin@rottenhand.com', $1)
        `, [userId]);

        console.log('✅ Created administrator record');

        // Assign superadmin role (role ID 1 is __super_admin_role__)
        await client.query(`
            INSERT INTO user_roles_role ("userId", "roleId")
            VALUES ($1, 1)
        `, [userId]);

        console.log('✅ Assigned SuperAdmin role');

        // Commit transaction
        await client.query('COMMIT');
        
        console.log('\n🎉 Setup completed successfully!');
        console.log('\n📋 Login Details:');
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}`);
        console.log('\n🌐 Admin Panel: https://rottenhand.com/admin');
        console.log('\n✨ Your Vendure instance now has:');
        console.log('   - All your custom configuration and plugins');
        console.log('   - Clean database with no business data');
        console.log('   - Fresh superadmin account ready to use');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error creating superadmin:', error);
        throw error;
    } finally {
        await client.end();
    }
}

restoreSchemaAndCreateAdmin()
    .then(() => {
        console.log('\n🚀 Ready to start admin: pm2 start admin');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    });
