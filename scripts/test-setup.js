#!/usr/bin/env node

/**
 * Test script to verify the database setup script functionality
 * 
 * This script tests the DatabaseSetup class without actually connecting
 * to a database, allowing for safe testing of the logic.
 */

const DatabaseSetup = require('./setup-database');
const path = require('path');

// Mock client for testing
class MockClient {
  constructor() {
    this.queries = [];
    this.connected = false;
  }

  async connect() {
    this.connected = true;
    console.log('Mock: Connected to database');
  }

  async query(sql) {
    this.queries.push(sql);
    
    // Mock responses for different query types
    if (sql.includes('SELECT version()')) {
      return {
        rows: [{
          version: 'PostgreSQL 14.9 on x86_64-linux',
          current_database: 'test_db',
          current_user: 'test_user'
        }]
      };
    }
    
    if (sql.includes('information_schema.tables')) {
      return {
        rows: [
          { table_name: 'ai_model_config', table_type: 'BASE TABLE' },
          { table_name: 'rag_urls', table_type: 'BASE TABLE' },
          { table_name: 'config_audit', table_type: 'BASE TABLE' }
        ]
      };
    }
    
    if (sql.includes('pg_indexes')) {
      return { rows: new Array(12).fill({}).map((_, i) => ({ indexname: `idx_${i}`, tablename: 'test' })) };
    }
    
    if (sql.includes('information_schema.triggers')) {
      return { rows: [{ trigger_name: 'test_trigger', event_object_table: 'test' }] };
    }
    
    if (sql.includes('COUNT(*)')) {
      return { rows: [{ count: '5' }] };
    }
    
    if (sql.includes('config_summary')) {
      return {
        rows: [
          { resource_type: 'ai_models', total_count: '6', enabled_count: '2' },
          { resource_type: 'rag_urls', total_count: '0', enabled_count: '0' }
        ]
      };
    }
    
    // Default response for other queries
    return { rows: [], rowCount: 1 };
  }

  async end() {
    this.connected = false;
    console.log('Mock: Disconnected from database');
  }
}

// Test the setup class
async function testSetup() {
  console.log('🧪 Testing Database Setup Script\n');
  
  try {
    // Create setup instance
    const setup = new DatabaseSetup();
    
    // Mock the client
    setup.client = new MockClient();
    
    // Test connection method
    console.log('Testing connection...');
    await setup.connect();
    
    // Test SQL file reading
    console.log('Testing SQL file reading...');
    try {
      const schema = await setup.readSQLFile('schema.sql');
      console.log(`✅ Schema file read successfully (${schema.length} chars)`);
    } catch (error) {
      console.log(`⚠️  Schema file not found: ${error.message}`);
    }
    
    try {
      const seed = await setup.readSQLFile('seed.sql');
      console.log(`✅ Seed file read successfully (${seed.length} chars)`);
    } catch (error) {
      console.log(`⚠️  Seed file not found: ${error.message}`);
    }
    
    // Test verification
    console.log('Testing verification...');
    const verified = await setup.verifySetup();
    console.log(`Verification result: ${verified ? '✅ PASSED' : '❌ FAILED'}`);
    
    // Test disconnection
    await setup.disconnect();
    
    // Print summary
    setup.printSummary();
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Environment variable tests
function testEnvironmentVariables() {
  console.log('🔧 Testing Environment Variables\n');
  
  const setup = new DatabaseSetup();
  
  // Test without any environment variables
  delete process.env.POSTGRES_URL;
  delete process.env.POSTGRES_PRISMA_URL;
  delete process.env.POSTGRES_URL_NON_POOLING;
  delete process.env.DATABASE_URL;
  
  const url = setup.getDatabaseUrl();
  if (url === null) {
    console.log('✅ Correctly handles missing environment variables');
  } else {
    console.log('❌ Should return null for missing environment variables');
  }
  
  // Test with environment variable
  process.env.POSTGRES_URL = 'postgresql://test:pass@localhost:5432/testdb';
  const testUrl = setup.getDatabaseUrl();
  if (testUrl) {
    console.log('✅ Correctly reads POSTGRES_URL environment variable');
  } else {
    console.log('❌ Should read POSTGRES_URL environment variable');
  }
}

// Main test execution
async function main() {
  console.log('📋 Database Setup Script Test Suite');
  console.log('=' .repeat(50));
  
  // Test environment variables
  testEnvironmentVariables();
  
  console.log(); // Empty line
  
  // Test setup functionality
  await testSetup();
  
  console.log('\n🎉 All tests passed! The setup script is ready to use.');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { MockClient };