/**
 * Vercel Postgres Database Utilities and Connection Management
 * 
 * Provides optimized database connection and query utilities for the Forge
 * admin configuration system using Vercel Postgres.
 */

import { sql } from '@vercel/postgres';

// Type definitions for better type safety
interface DatabaseRow {
  [key: string]: unknown;
}

interface TableRow {
  table_name: string;
}

interface IndexRow {
  indexname: string;
}

interface TriggerRow {
  trigger_name: string;
}

interface DatabaseHealth {
  connected: boolean;
  responseTime: number;
  error?: string;
}

// Query logging configuration
const ENABLE_QUERY_LOGGING = process.env.NODE_ENV === 'development';
const MAX_QUERY_LOG_LENGTH = 200;

/**
 * Log database queries in development for debugging
 */
function logQuery(query: string, params?: unknown[], duration?: number): void {
  if (!ENABLE_QUERY_LOGGING) return;
  
  const truncatedQuery = query.length > MAX_QUERY_LOG_LENGTH 
    ? `${query.substring(0, MAX_QUERY_LOG_LENGTH)}...`
    : query;
    
  const logMessage = duration 
    ? `[DB Query ${duration}ms] ${truncatedQuery}`
    : `[DB Query] ${truncatedQuery}`;
    
  if (params && params.length > 0) {
    console.log(logMessage, { params });
  } else {
    console.log(logMessage);
  }
}

/**
 * Execute a database query with logging and error handling
 */
export async function executeQuery<T = unknown>(
  queryString: string, 
  params: unknown[] = []
): Promise<{ rows: T[]; rowCount: number }> {
  const startTime = Date.now();
  
  try {
    // Use template literal with sql`` for proper parameterization
    const result = await sql.query(queryString, params);
    
    const duration = Date.now() - startTime;
    logQuery(queryString, params, duration);
    
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount || result.rows.length
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[DB Error ${duration}ms] Query failed:`, {
      query: queryString.substring(0, MAX_QUERY_LOG_LENGTH),
      params,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Execute a parameterized query using Vercel's template literal syntax
 */
export async function query<T = unknown>(
  template: TemplateStringsArray,
  ...values: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const startTime = Date.now();
  const queryString = template.join('?');
  
  try {
    // Type assertion for values to handle the unknown type properly
    const result = await sql(template, ...(values as any[]));
    
    const duration = Date.now() - startTime;
    logQuery(queryString, values, duration);
    
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount || result.rows.length
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[DB Error ${duration}ms] Template query failed:`, {
      query: queryString.substring(0, MAX_QUERY_LOG_LENGTH),
      values,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Check database connection health
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const startTime = Date.now();
  
  try {
    await sql`SELECT 1 as health_check`;
    const responseTime = Date.now() - startTime;
    
    return {
      connected: true,
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      connected: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown connection error'
    };
  }
}

/**
 * Get database statistics and connection info
 */
export async function getDatabaseStats(): Promise<{
  health: DatabaseHealth;
  tableStats: Array<{
    tableName: string;
    rowCount: number;
    sizeBytes: number;
  }>;
  connectionInfo: {
    database: string;
    user: string;
    applicationName: string;
  };
}> {
  const health = await checkDatabaseHealth();
  
  if (!health.connected) {
    return {
      health,
      tableStats: [],
      connectionInfo: {
        database: 'unknown',
        user: 'unknown',
        applicationName: 'forge-admin'
      }
    };
  }
  
  try {
    // Get table statistics
    const tableStatsResult = await sql`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins + n_tup_upd + n_tup_del as row_operations,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      AND tablename IN ('ai_model_config', 'rag_urls', 'config_audit')
    `;
    
    // Get connection info
    const connectionResult = await sql`
      SELECT 
        current_database() as database,
        current_user as user,
        'forge-admin' as application_name
    `;
    
    return {
      health,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tableStats: tableStatsResult.rows.map((row: any) => ({
        tableName: row.tablename,
        rowCount: Number(row.row_operations) || 0,
        sizeBytes: Number(row.size_bytes) || 0
      })),
      connectionInfo: {
        database: connectionResult.rows[0]?.database || 'unknown',
        user: connectionResult.rows[0]?.user || 'unknown',
        applicationName: 'forge-admin'
      }
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return {
      health,
      tableStats: [],
      connectionInfo: {
        database: 'error',
        user: 'error',
        applicationName: 'forge-admin'
      }
    };
  }
}

/**
 * Database validation results interface
 */
export interface DatabaseValidationResult {
  isValid: boolean;
  connectivity: {
    connected: boolean;
    responseTime: number;
    error?: string;
  };
  schema: {
    tablesExist: boolean;
    missingTables: string[];
    indexesExist: boolean;
    missingIndexes: string[];
    triggersExist: boolean;
    missingTriggers: string[];
  };
  data: {
    hasDefaultModels: boolean;
    modelCount: number;
    urlCount: number;
    auditLogCount: number;
  };
  degradationMode: 'none' | 'demo' | 'readonly' | 'disabled';
  issues: string[];
  warnings: string[];
}

/**
 * Required database tables
 */
const REQUIRED_TABLES = ['ai_model_config', 'rag_urls', 'config_audit'];

/**
 * Required database indexes
 */
const REQUIRED_INDEXES = [
  'idx_ai_model_provider_name',
  'idx_one_default_per_provider',
  'idx_rag_urls_namespace',
  'idx_config_audit_admin_email',
  'idx_config_audit_created_at'
];

/**
 * Required database triggers
 */
const REQUIRED_TRIGGERS = [
  'update_ai_model_config_updated_at',
  'update_rag_urls_updated_at'
];

/**
 * Comprehensive database validation for startup sequence
 */
export async function validateDatabase(): Promise<DatabaseValidationResult> {
  const result: DatabaseValidationResult = {
    isValid: false,
    connectivity: {
      connected: false,
      responseTime: 0
    },
    schema: {
      tablesExist: false,
      missingTables: [],
      indexesExist: false,
      missingIndexes: [],
      triggersExist: false,
      missingTriggers: []
    },
    data: {
      hasDefaultModels: false,
      modelCount: 0,
      urlCount: 0,
      auditLogCount: 0
    },
    degradationMode: 'disabled',
    issues: [],
    warnings: []
  };

  // Step 1: Test database connectivity
  try {
    const health = await checkDatabaseHealth();
    result.connectivity = health;

    if (!health.connected) {
      result.issues.push('Database connection failed');
      result.degradationMode = 'demo';
      return result;
    }
  } catch (error) {
    result.issues.push(`Database connectivity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.degradationMode = 'demo';
    return result;
  }

  // Step 2: Validate database schema
  try {
    const schemaValidation = await validateDatabaseSchema();
    result.schema = schemaValidation;

    if (schemaValidation.missingTables.length > 0) {
      result.issues.push(`Missing required tables: ${schemaValidation.missingTables.join(', ')}`);
    }

    if (schemaValidation.missingIndexes.length > 0) {
      result.warnings.push(`Missing performance indexes: ${schemaValidation.missingIndexes.join(', ')}`);
    }

    if (schemaValidation.missingTriggers.length > 0) {
      result.warnings.push(`Missing database triggers: ${schemaValidation.missingTriggers.join(', ')}`);
    }
  } catch (error) {
    result.issues.push(`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.degradationMode = 'demo';
    return result;
  }

  // Step 3: Validate essential data
  try {
    const dataValidation = await validateDatabaseData();
    result.data = dataValidation;

    if (!dataValidation.hasDefaultModels) {
      result.warnings.push('No default AI models configured - chat functionality may be limited');
    }

    if (dataValidation.modelCount === 0) {
      result.warnings.push('No AI models configured in database');
    }
  } catch (error) {
    result.warnings.push(`Data validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Step 4: Determine degradation mode and overall validity
  if (result.issues.length === 0) {
    if (result.schema.tablesExist && result.connectivity.connected) {
      result.degradationMode = 'none';
      result.isValid = true;
    } else if (result.connectivity.connected && result.schema.missingTables.length < REQUIRED_TABLES.length) {
      result.degradationMode = 'readonly';
      result.warnings.push('Database partially configured - running in read-only mode');
    } else {
      result.degradationMode = 'demo';
      result.warnings.push('Database not fully configured - running in demo mode');
    }
  } else {
    // Has critical issues
    if (result.connectivity.connected && result.schema.missingTables.length === 0) {
      result.degradationMode = 'readonly';
    } else {
      result.degradationMode = 'demo';
    }
  }

  return result;
}

/**
 * Validate database schema completeness
 */
async function validateDatabaseSchema(): Promise<{
  tablesExist: boolean;
  missingTables: string[];
  indexesExist: boolean;
  missingIndexes: string[];
  triggersExist: boolean;
  missingTriggers: string[];
}> {
  // Check tables - use proper SQL syntax for array checking
  const tablesResult = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (${REQUIRED_TABLES[0]}, ${REQUIRED_TABLES[1]}, ${REQUIRED_TABLES[2]})
  `;
  
  const existingTables = tablesResult.rows.map((row: DatabaseRow) => row.table_name as string);
  const missingTables = REQUIRED_TABLES.filter(table => !existingTables.includes(table));

  // Check indexes - use proper SQL syntax for array checking
  const indexesResult = await sql`
    SELECT indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public'
    AND indexname IN (${REQUIRED_INDEXES[0]}, ${REQUIRED_INDEXES[1]}, ${REQUIRED_INDEXES[2]}, ${REQUIRED_INDEXES[3]}, ${REQUIRED_INDEXES[4]})
  `;
  
  const existingIndexes = indexesResult.rows.map((row: DatabaseRow) => row.indexname as string);
  const missingIndexes = REQUIRED_INDEXES.filter(index => !existingIndexes.includes(index));

  // Check triggers - use proper SQL syntax for array checking
  const triggersResult = await sql`
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
    AND trigger_name IN (${REQUIRED_TRIGGERS[0]}, ${REQUIRED_TRIGGERS[1]})
  `;
  
  const existingTriggers = triggersResult.rows.map((row: DatabaseRow) => row.trigger_name as string);
  const missingTriggers = REQUIRED_TRIGGERS.filter(trigger => !existingTriggers.includes(trigger));

  return {
    tablesExist: missingTables.length === 0,
    missingTables,
    indexesExist: missingIndexes.length === 0,
    missingIndexes,
    triggersExist: missingTriggers.length === 0,
    missingTriggers
  };
}

/**
 * Validate essential database data
 */
async function validateDatabaseData(): Promise<{
  hasDefaultModels: boolean;
  modelCount: number;
  urlCount: number;
  auditLogCount: number;
}> {
  const promises = [];

  // Check for default models
  promises.push(
    sql`SELECT COUNT(*) as count FROM ai_model_config WHERE is_default = TRUE AND is_enabled = TRUE`
      .then(result => ({ hasDefaultModels: Number(result.rows[0]?.count || 0) > 0 }))
      .catch(() => ({ hasDefaultModels: false }))
  );

  // Get total model count
  promises.push(
    sql`SELECT COUNT(*) as count FROM ai_model_config`
      .then(result => ({ modelCount: Number(result.rows[0]?.count || 0) }))
      .catch(() => ({ modelCount: 0 }))
  );

  // Get RAG URL count
  promises.push(
    sql`SELECT COUNT(*) as count FROM rag_urls`
      .then(result => ({ urlCount: Number(result.rows[0]?.count || 0) }))
      .catch(() => ({ urlCount: 0 }))
  );

  // Get audit log count
  promises.push(
    sql`SELECT COUNT(*) as count FROM config_audit`
      .then(result => ({ auditLogCount: Number(result.rows[0]?.count || 0) }))
      .catch(() => ({ auditLogCount: 0 }))
  );

  const results = await Promise.all(promises);
  
  // Type-safe property access with proper type narrowing
  const hasDefaultModels = 'hasDefaultModels' in results[0] ? results[0].hasDefaultModels : false;
  const modelCount = 'modelCount' in results[1] ? results[1].modelCount : 0;
  const urlCount = 'urlCount' in results[2] ? results[2].urlCount : 0;
  const auditLogCount = 'auditLogCount' in results[3] ? results[3].auditLogCount : 0;
  
  return {
    hasDefaultModels,
    modelCount,
    urlCount,
    auditLogCount
  };
}

/**
 * Initialize database schema if needed
 * This should typically be run during deployment
 */
export async function initializeSchema(): Promise<void> {
  try {
    // Check if tables exist
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('ai_model_config', 'rag_urls', 'config_audit')
    `;
    
    const existingTables = tablesResult.rows.map((row: DatabaseRow) => row.table_name as string);
    const requiredTables = ['ai_model_config', 'rag_urls', 'config_audit'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.warn('Database schema incomplete. Missing tables:', missingTables);
      console.warn('Please run the schema.sql and seed.sql scripts to initialize the database.');
    } else {
      console.log('✅ Database schema is properly initialized');
    }
  } catch (error) {
    console.error('Failed to check database schema:', error);
    throw new Error('Database schema validation failed');
  }
}

/**
 * Get database setup instructions based on validation results
 */
export function getDatabaseSetupInstructions(validation: DatabaseValidationResult): {
  title: string;
  instructions: string[];
  commands: string[];
  severity: 'error' | 'warning' | 'info';
} {
  if (!validation.connectivity.connected) {
    return {
      title: 'Database Connection Required',
      instructions: [
        'The application cannot connect to the database.',
        'Please ensure your database connection is properly configured.',
        'Check your environment variables and database availability.'
      ],
      commands: [
        'Verify POSTGRES_URL environment variable is set',
        'Test database connectivity: npm run test-setup',
        'Check Vercel Postgres dashboard for connection issues'
      ],
      severity: 'error'
    };
  }

  if (validation.schema.missingTables.length > 0) {
    return {
      title: 'Database Schema Setup Required',
      instructions: [
        'The database is connected but missing required tables.',
        'Run the database setup script to create the necessary schema.',
        'This will create tables, indexes, triggers, and seed data.'
      ],
      commands: [
        'npm run setup-db',
        'npm run verify-models',
        'Check logs for any setup errors'
      ],
      severity: 'error'
    };
  }

  if (validation.warnings.length > 0) {
    return {
      title: 'Database Configuration Recommendations',
      instructions: [
        'The database is functional but has some configuration recommendations.',
        'Consider addressing these warnings for optimal performance.',
        'The application will continue to work but may have reduced functionality.'
      ],
      commands: [
        'Review missing indexes: consider running schema updates',
        'Check default model configuration',
        'Review audit log setup'
      ],
      severity: 'warning'
    };
  }

  return {
    title: 'Database Fully Configured',
    instructions: [
      'Database validation passed successfully.',
      'All required components are present and functional.',
      'Application ready for full operation.'
    ],
    commands: [],
    severity: 'info'
  };
}

/**
 * Transaction helper for complex operations with proper BEGIN/COMMIT/ROLLBACK support
 * Since we're using Neon DB, we have full PostgreSQL transaction support
 */
export async function withTransaction<T>(
  operation: (client: TransactionClient) => Promise<T>
): Promise<T> {
  // Create a transaction wrapper that tracks transaction state
  const transactionClient = new TransactionClient();
  
  try {
    // Begin the transaction
    await transactionClient.begin();
    
    // Execute the operation within the transaction
    const result = await operation(transactionClient);
    
    // Commit the transaction if successful
    await transactionClient.commit();
    
    return result;
  } catch (error) {
    // Rollback the transaction on any error
    await transactionClient.rollback();
    
    console.error('Transaction rolled back due to error:', error);
    throw error;
  }
}

/**
 * Transaction client that provides proper transaction control for Neon DB
 */
class TransactionClient {
  private transactionStarted = false;
  private transactionCommitted = false;
  private transactionRolledBack = false;

  async begin(): Promise<void> {
    if (this.transactionStarted) {
      throw new Error('Transaction already started');
    }
    
    try {
      await sql`BEGIN`;
      this.transactionStarted = true;
      console.log('[Transaction] BEGIN - Transaction started');
    } catch (error) {
      console.error('[Transaction] Failed to BEGIN transaction:', error);
      throw new Error(`Failed to start transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async commit(): Promise<void> {
    if (!this.transactionStarted) {
      throw new Error('No active transaction to commit');
    }
    if (this.transactionCommitted) {
      throw new Error('Transaction already committed');
    }
    if (this.transactionRolledBack) {
      throw new Error('Cannot commit a rolled back transaction');
    }
    
    try {
      await sql`COMMIT`;
      this.transactionCommitted = true;
      console.log('[Transaction] COMMIT - Transaction committed successfully');
    } catch (error) {
      console.error('[Transaction] Failed to COMMIT transaction:', error);
      // Attempt rollback on commit failure
      await this.rollback();
      throw new Error(`Failed to commit transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async rollback(): Promise<void> {
    if (!this.transactionStarted) {
      // Silent return if no transaction to rollback
      return;
    }
    if (this.transactionRolledBack) {
      // Already rolled back
      return;
    }
    if (this.transactionCommitted) {
      console.warn('[Transaction] Attempting to rollback already committed transaction');
      return;
    }
    
    try {
      await sql`ROLLBACK`;
      this.transactionRolledBack = true;
      console.log('[Transaction] ROLLBACK - Transaction rolled back');
    } catch (error) {
      console.error('[Transaction] Failed to ROLLBACK transaction:', error);
      // Don't throw here - rollback failures shouldn't break error handling
    }
  }

  /**
   * Execute a query within this transaction using template literals
   */
  async query<T = unknown>(
    template: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<{ rows: T[]; rowCount: number }> {
    if (!this.transactionStarted) {
      throw new Error('Transaction not started');
    }
    if (this.transactionCommitted) {
      throw new Error('Cannot execute query on committed transaction');
    }
    if (this.transactionRolledBack) {
      throw new Error('Cannot execute query on rolled back transaction');
    }

    const startTime = Date.now();
    const queryString = template.join('?');
    
    try {
      // Type assertion for values to handle the unknown type properly
      const result = await sql(template, ...(values as any[]));
      
      const duration = Date.now() - startTime;
      logQuery(`[Transaction] ${queryString}`, values, duration);
      
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount || result.rows.length
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Transaction Error ${duration}ms] Query failed:`, {
        query: queryString.substring(0, MAX_QUERY_LOG_LENGTH),
        values,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Execute a parameterized query within this transaction
   */
  async executeQuery<T = unknown>(
    queryString: string, 
    params: unknown[] = []
  ): Promise<{ rows: T[]; rowCount: number }> {
    if (!this.transactionStarted) {
      throw new Error('Transaction not started');
    }
    if (this.transactionCommitted) {
      throw new Error('Cannot execute query on committed transaction');
    }
    if (this.transactionRolledBack) {
      throw new Error('Cannot execute query on rolled back transaction');
    }

    const startTime = Date.now();
    
    try {
      const result = await sql.query(queryString, params);
      
      const duration = Date.now() - startTime;
      logQuery(`[Transaction] ${queryString}`, params, duration);
      
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount || result.rows.length
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Transaction Error ${duration}ms] Query failed:`, {
        query: queryString.substring(0, MAX_QUERY_LOG_LENGTH),
        params,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create a savepoint for nested transaction control
   */
  async savepoint(name: string): Promise<SavepointClient> {
    if (!this.transactionStarted || this.transactionCommitted || this.transactionRolledBack) {
      throw new Error('Cannot create savepoint outside of active transaction');
    }
    
    try {
      await sql.query(`SAVEPOINT ${name}`);
      console.log(`[Transaction] SAVEPOINT ${name} - Savepoint created`);
      return new SavepointClient(name, this);
    } catch (error) {
      console.error(`[Transaction] Failed to create savepoint ${name}:`, error);
      throw new Error(`Failed to create savepoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transaction state for debugging
   */
  getTransactionState(): {
    started: boolean;
    committed: boolean;
    rolledBack: boolean;
    active: boolean;
  } {
    return {
      started: this.transactionStarted,
      committed: this.transactionCommitted,
      rolledBack: this.transactionRolledBack,
      active: this.transactionStarted && !this.transactionCommitted && !this.transactionRolledBack
    };
  }
}

/**
 * Savepoint client for nested transaction control
 */
class SavepointClient {
  private isReleased = false;
  private isRolledBack = false;

  constructor(
    private savepointName: string,
    private transactionClient: TransactionClient
  ) {}

  /**
   * Rollback to this savepoint
   */
  async rollbackTo(): Promise<void> {
    if (this.isReleased) {
      throw new Error('Cannot rollback to released savepoint');
    }
    if (this.isRolledBack) {
      throw new Error('Savepoint already rolled back');
    }

    try {
      await sql.query(`ROLLBACK TO SAVEPOINT ${this.savepointName}`);
      this.isRolledBack = true;
      console.log(`[Transaction] ROLLBACK TO SAVEPOINT ${this.savepointName} - Rolled back to savepoint`);
    } catch (error) {
      console.error(`[Transaction] Failed to rollback to savepoint ${this.savepointName}:`, error);
      throw new Error(`Failed to rollback to savepoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Release this savepoint
   */
  async release(): Promise<void> {
    if (this.isReleased) {
      return; // Already released
    }

    try {
      await sql.query(`RELEASE SAVEPOINT ${this.savepointName}`);
      this.isReleased = true;
      console.log(`[Transaction] RELEASE SAVEPOINT ${this.savepointName} - Savepoint released`);
    } catch (error) {
      console.error(`[Transaction] Failed to release savepoint ${this.savepointName}:`, error);
      // Don't throw on release failure - it's not critical
    }
  }
}

/**
 * Retry mechanism for database operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Check if error is retriable
      const isRetriable = lastError.message.includes('connection') || 
                         lastError.message.includes('timeout') ||
                         lastError.message.includes('network');
      
      if (!isRetriable) {
        throw lastError;
      }
      
      console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, lastError.message);
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
}

/**
 * Advanced transaction management with nested transactions and rollback points
 */
export async function withNestedTransaction<T>(
  operation: (client: TransactionClient, createSavepoint: (name: string) => Promise<SavepointClient>) => Promise<T>
): Promise<T> {
  return await withTransaction(async (client) => {
    const createSavepoint = async (name: string) => {
      return await client.savepoint(name);
    };
    
    return await operation(client, createSavepoint);
  });
}

/**
 * Execute multiple operations in a single transaction with automatic rollback on any failure
 */
export async function withBatchTransaction<T extends readonly unknown[]>(
  operations: readonly [
    ...{ [K in keyof T]: (client: TransactionClient) => Promise<T[K]> }
  ]
): Promise<T> {
  return await withTransaction(async (client) => {
    const results: unknown[] = [];
    
    for (const operation of operations) {
      const result = await operation(client);
      results.push(result);
    }
    
    // Type-safe conversion with proper validation
    return results as unknown as T;
  });
}

/**
 * Compensating transaction pattern for complex business operations
 * Executes forward operations, and if any fail, executes compensating actions in reverse order
 */
export async function withCompensatingTransaction<T>(
  operations: Array<{
    forward: (client: TransactionClient) => Promise<T>;
    compensate?: (client: TransactionClient, forwardResult?: T) => Promise<void>;
  }>
): Promise<T[]> {
  const results: T[] = [];
  const completedOperations: Array<{ result: T; compensate?: (client: TransactionClient) => Promise<void> }> = [];
  
  return await withTransaction(async (client) => {
    try {
      // Execute all forward operations
      for (const operation of operations) {
        const result = await operation.forward(client);
        results.push(result);
        
        if (operation.compensate) {
          completedOperations.push({
            result,
            compensate: (client: TransactionClient) => operation.compensate!(client, result)
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Forward operation failed, executing compensating transactions:', error);
      
      // Execute compensating transactions in reverse order
      for (const completedOp of completedOperations.reverse()) {
        if (completedOp.compensate) {
          try {
            await completedOp.compensate(client);
          } catch (compensationError) {
            console.error('Compensation failed:', compensationError);
            // Continue with other compensations even if one fails
          }
        }
      }
      
      throw error;
    }
  });
}

/**
 * Connection pool information and health monitoring
 */
export async function getConnectionPoolStats(): Promise<{
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  maxConnections: number;
  connectionWaiting: number;
}> {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE state = 'active') as active_connections,
        COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
        COUNT(*) as total_connections,
        (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections,
        COUNT(*) FILTER (WHERE wait_event_type = 'Client') as connection_waiting
      FROM pg_stat_activity 
      WHERE backend_type = 'client backend'
    `;
    
    const row = result.rows[0] as { 
      active_connections: string; 
      idle_connections: string; 
      total_connections: string; 
      max_connections: string; 
      connection_waiting: string; 
    };
    return {
      activeConnections: Number(row.active_connections) || 0,
      idleConnections: Number(row.idle_connections) || 0,
      totalConnections: Number(row.total_connections) || 0,
      maxConnections: Number(row.max_connections) || 100,
      connectionWaiting: Number(row.connection_waiting) || 0
    };
  } catch (error) {
    console.error('Failed to get connection pool stats:', error);
    return {
      activeConnections: 0,
      idleConnections: 0,
      totalConnections: 0,
      maxConnections: 100,
      connectionWaiting: 0
    };
  }
}

// Export the sql client and transaction classes for direct use when needed
export { sql, TransactionClient, SavepointClient };
