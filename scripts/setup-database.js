#!/usr/bin/env node

/**
 * Forge Database Setup Script
 * 
 * Connects to Vercel Postgres, executes schema and seed SQL files,
 * includes proper error handling, and provides verification of successful setup.
 * 
 * Usage:
 *   node scripts/setup-database.js
 *   npm run setup-db  (if added to package.json)
 * 
 * Migration from old schema:
 *   If upgrading from a database with EXCLUDE constraints, run the migration first:
 *   psql $POSTGRES_URL -f sql/migrate-exclude-to-index.sql
 * 
 * Environment Variables Required:
 *   POSTGRES_URL - Vercel Postgres connection string
 *   POSTGRES_PRISMA_URL - Alternative connection string
 *   POSTGRES_URL_NON_POOLING - Non-pooling connection string
 */

const fs = require('fs').promises;
const path = require('path');

// Try to require pg, handle case where it's not installed
let Client;
try {
  const pg = require('pg');
  Client = pg.Client;
} catch (error) {
  console.error(`
⚠️  PostgreSQL client (pg) package not found.

This is required for the database setup script. Please install it with:

  npm install pg @types/pg

If you're deploying to Vercel, these dependencies will be automatically
installed during deployment.
`);
  process.exit(1);
}

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

class DatabaseSetup {
  constructor() {
    this.client = null;
    this.startTime = Date.now();
    this.stats = {
      tablesCreated: 0,
      indexesCreated: 0,
      triggersCreated: 0,
      rowsInserted: 0,
      errors: []
    };
  }

  /**
   * Log with timestamp and color
   */
  log(message, color = colors.reset) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
  }

  /**
   * Log error with details
   */
  logError(message, error = null) {
    this.log(`❌ ERROR: ${message}`, colors.red);
    if (error) {
      console.error(`${colors.red}${error.stack || error.message}${colors.reset}`);
      this.stats.errors.push({ message, error: error.message });
    }
  }

  /**
   * Log success message
   */
  logSuccess(message) {
    this.log(`✅ ${message}`, colors.green);
  }

  /**
   * Log info message
   */
  logInfo(message) {
    this.log(`ℹ️  ${message}`, colors.blue);
  }

  /**
   * Log warning message
   */
  logWarning(message) {
    this.log(`⚠️  ${message}`, colors.yellow);
  }

  /**
   * Get database connection string with fallback options
   */
  getDatabaseUrl() {
    const urls = [
      process.env.POSTGRES_URL,
      process.env.POSTGRES_PRISMA_URL,
      process.env.POSTGRES_URL_NON_POOLING,
      process.env.DATABASE_URL
    ];

    for (const url of urls) {
      if (url) {
        this.logInfo(`Using connection string: ${url.replace(/:[^:@]*@/, ':****@')}`);
        return url;
      }
    }

    return null;
  }

  /**
   * Create database connection
   */
  async connect() {
    try {
      const connectionString = this.getDatabaseUrl();
      
      if (!connectionString) {
        throw new Error(`
No database connection string found. Please set one of the following environment variables:
- POSTGRES_URL
- POSTGRES_PRISMA_URL  
- POSTGRES_URL_NON_POOLING
- DATABASE_URL

Example:
export POSTGRES_URL="postgresql://username:password@hostname:port/database"
        `);
      }

      this.logInfo('Connecting to PostgreSQL database...');
      
      // Create client with connection timeout
      this.client = new Client({
        connectionString,
        connectionTimeoutMillis: 10000, // 10 seconds
        idleTimeoutMillis: 30000, // 30 seconds
        query_timeout: 60000 // 60 seconds for queries
      });

      await this.client.connect();
      this.logSuccess('Connected to PostgreSQL database');

      // Test connection with a simple query
      const result = await this.client.query('SELECT version(), current_database(), current_user');
      const dbInfo = result.rows[0];
      
      this.logInfo(`Database: ${dbInfo.current_database}`);
      this.logInfo(`User: ${dbInfo.current_user}`);
      this.logInfo(`Version: ${dbInfo.version.split(' ').slice(0, 2).join(' ')}`);

    } catch (error) {
      this.logError('Failed to connect to database', error);
      throw error;
    }
  }

  /**
   * Read SQL file with error handling
   */
  async readSQLFile(filename) {
    try {
      const filePath = path.join(process.cwd(), 'sql', filename);
      this.logInfo(`Reading SQL file: ${filePath}`);
      
      const content = await fs.readFile(filePath, 'utf8');
      
      if (!content.trim()) {
        throw new Error(`SQL file ${filename} is empty`);
      }

      this.logSuccess(`Successfully read ${filename} (${content.length} characters)`);
      return content;
    } catch (error) {
      this.logError(`Failed to read SQL file: ${filename}`, error);
      throw error;
    }
  }

  /**
   * Execute SQL with transaction support and detailed logging
   */
  async executeSQL(sql, description = 'SQL execution') {
    try {
      this.logInfo(`${description}...`);
      
      // Begin transaction
      await this.client.query('BEGIN');
      
      // Split SQL into individual statements and execute
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.match(/^--/));

      let executed = 0;
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            const result = await this.client.query(statement);
            executed++;
            
            // Log specific operations
            if (statement.toUpperCase().includes('CREATE TABLE')) {
              this.stats.tablesCreated++;
              const tableName = statement.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i)?.[1];
              this.logInfo(`  📁 Created table: ${tableName}`);
            } else if (statement.toUpperCase().includes('CREATE INDEX')) {
              this.stats.indexesCreated++;
              const indexName = statement.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF NOT EXISTS\s+)?(\w+)/i)?.[1];
              this.logInfo(`  🔍 Created index: ${indexName}`);
            } else if (statement.toUpperCase().includes('CREATE TRIGGER')) {
              this.stats.triggersCreated++;
              const triggerName = statement.match(/CREATE TRIGGER\s+(\w+)/i)?.[1];
              this.logInfo(`  ⚡ Created trigger: ${triggerName}`);
            } else if (statement.toUpperCase().includes('INSERT INTO')) {
              if (result.rowCount) {
                this.stats.rowsInserted += result.rowCount;
                const tableName = statement.match(/INSERT INTO\s+(\w+)/i)?.[1];
                this.logInfo(`  ➕ Inserted ${result.rowCount} rows into ${tableName}`);
              }
            }
          } catch (statementError) {
            // Log the specific statement that failed
            this.logError(`Failed to execute statement: ${statement.substring(0, 100)}...`, statementError);
            throw statementError;
          }
        }
      }

      // Commit transaction
      await this.client.query('COMMIT');
      this.logSuccess(`${description} completed - executed ${executed} statements`);

    } catch (error) {
      // Rollback transaction on error
      try {
        await this.client.query('ROLLBACK');
        this.logWarning('Transaction rolled back due to error');
      } catch (rollbackError) {
        this.logError('Failed to rollback transaction', rollbackError);
      }
      
      this.logError(`${description} failed`, error);
      throw error;
    }
  }

  /**
   * Verify database setup by checking tables and data
   */
  async verifySetup() {
    try {
      this.logInfo('Verifying database setup...');

      // Check if all required tables exist
      const tablesQuery = `
        SELECT table_name, table_type 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('ai_model_config', 'rag_urls', 'config_audit')
        ORDER BY table_name
      `;
      
      const tablesResult = await this.client.query(tablesQuery);
      const existingTables = tablesResult.rows.map(row => row.table_name);
      const requiredTables = ['ai_model_config', 'rag_urls', 'config_audit'];
      
      this.logInfo(`Found tables: ${existingTables.join(', ')}`);
      
      // Check for missing tables
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));
      if (missingTables.length > 0) {
        throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
      }

      // Check indexes
      const indexesQuery = `
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename IN ('ai_model_config', 'rag_urls', 'config_audit')
        ORDER BY tablename, indexname
      `;
      
      const indexesResult = await this.client.query(indexesQuery);
      this.logInfo(`Found ${indexesResult.rows.length} indexes`);

      // Check triggers
      const triggersQuery = `
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
        ORDER BY event_object_table, trigger_name
      `;
      
      const triggersResult = await this.client.query(triggersQuery);
      this.logInfo(`Found ${triggersResult.rows.length} triggers`);

      // Check seed data
      for (const table of requiredTables) {
        const countResult = await this.client.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(countResult.rows[0].count);
        this.logInfo(`Table ${table}: ${count} rows`);
      }

      // Test the config_summary view
      try {
        const summaryResult = await this.client.query('SELECT * FROM config_summary ORDER BY resource_type');
        this.logInfo('Configuration summary:');
        summaryResult.rows.forEach(row => {
          this.logInfo(`  ${row.resource_type}: ${row.total_count} total, ${row.enabled_count} active`);
        });
      } catch (error) {
        this.logWarning('Could not query config_summary view');
      }

      this.logSuccess('Database verification completed successfully');
      return true;

    } catch (error) {
      this.logError('Database verification failed', error);
      return false;
    }
  }

  /**
   * Cleanup database connection
   */
  async disconnect() {
    if (this.client) {
      try {
        await this.client.end();
        this.logInfo('Database connection closed');
      } catch (error) {
        this.logError('Failed to close database connection', error);
      }
    }
  }

  /**
   * Print final setup summary
   */
  printSummary() {
    const duration = Math.round((Date.now() - this.startTime) / 1000);
    
    this.log('\n' + '='.repeat(60), colors.bold);
    this.log('DATABASE SETUP SUMMARY', colors.bold);
    this.log('='.repeat(60), colors.bold);
    
    this.logInfo(`Duration: ${duration} seconds`);
    this.logInfo(`Tables created: ${this.stats.tablesCreated}`);
    this.logInfo(`Indexes created: ${this.stats.indexesCreated}`);
    this.logInfo(`Triggers created: ${this.stats.triggersCreated}`);
    this.logInfo(`Rows inserted: ${this.stats.rowsInserted}`);
    
    if (this.stats.errors.length > 0) {
      this.logWarning(`Errors encountered: ${this.stats.errors.length}`);
      this.stats.errors.forEach((err, i) => {
        this.log(`  ${i + 1}. ${err.message}: ${err.error}`, colors.yellow);
      });
    } else {
      this.logSuccess('No errors encountered!');
    }
    
    this.log('='.repeat(60) + '\n', colors.bold);
  }

  /**
   * Main setup execution
   */
  async run() {
    try {
      this.log(`${colors.bold}🚀 Starting Forge Database Setup${colors.reset}`);
      this.log(`${colors.bold}${'-'.repeat(40)}${colors.reset}`);

      // Step 1: Connect to database
      await this.connect();

      // Step 2: Execute schema
      const schemaSQL = await this.readSQLFile('schema.sql');
      await this.executeSQL(schemaSQL, 'Creating database schema');

      // Step 3: Execute seed data
      const seedSQL = await this.readSQLFile('seed.sql');
      await this.executeSQL(seedSQL, 'Inserting seed data');

      // Step 4: Verify setup
      const verificationPassed = await this.verifySetup();

      if (verificationPassed) {
        this.logSuccess('🎉 Database setup completed successfully!');
        this.logInfo('Your Forge application is ready to use.');
        this.logInfo('You can now start the development server with: npm run dev');
        return 0;
      } else {
        this.logError('Database setup completed with verification errors');
        return 1;
      }

    } catch (error) {
      this.logError('Database setup failed', error);
      return 1;
    } finally {
      await this.disconnect();
      this.printSummary();
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Setup interrupted by user');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Main execution
async function main() {
  const setup = new DatabaseSetup();
  const exitCode = await setup.run();
  process.exit(exitCode);
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error(`${colors.red}Fatal error during setup:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = DatabaseSetup;