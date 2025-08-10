/**
 * Automatic Database Initialization for Production Deployment
 * 
 * Provides automatic database schema and seed data initialization
 * when the application starts up in production environments.
 */

import { sql } from './database';
import fs from 'fs/promises';
import path from 'path';

interface InitializationResult {
  initialized: boolean;
  alreadyInitialized: boolean;
  error?: string;
  duration: number;
}

/**
 * Check if the database is already initialized by looking for core tables
 */
async function checkDatabaseInitialized(): Promise<boolean> {
  try {
    const result = await sql`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('ai_model_config', 'rag_urls', 'config_audit')
    `;
    
    const tableCount = parseInt(result.rows[0].table_count);
    return tableCount === 3; // All three core tables must exist
  } catch (error) {
    console.error('Failed to check database initialization status:', error);
    return false;
  }
}

/**
 * Read and execute SQL file
 */
async function executeSQLFile(filename: string, description: string): Promise<void> {
  try {
    const sqlPath = path.join(process.cwd(), 'sql', filename);
    const sqlContent = await fs.readFile(sqlPath, 'utf8');
    
    if (!sqlContent.trim()) {
      throw new Error(`SQL file ${filename} is empty`);
    }

    console.log(`[DB-INIT] Executing ${description}...`);
    
    // Split SQL into statements and execute (basic approach for initialization)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.match(/^--/));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await sql.unsafe(statement);
        } catch (error) {
          // Log but don't fail on "already exists" errors
          if (error instanceof Error && 
              (error.message.includes('already exists') || 
               error.message.includes('duplicate key') ||
               error.message.includes('relation') && error.message.includes('already exists'))) {
            console.log(`[DB-INIT] Skipping existing object: ${error.message}`);
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log(`[DB-INIT] ✅ ${description} completed`);
  } catch (error) {
    console.error(`[DB-INIT] ❌ Failed to execute ${description}:`, error);
    throw error;
  }
}

/**
 * Initialize database schema and seed data
 */
async function initializeDatabase(): Promise<void> {
  console.log('[DB-INIT] Starting automatic database initialization...');
  
  try {
    // Execute schema first
    await executeSQLFile('schema.sql', 'Database schema creation');
    
    // Then execute seed data
    await executeSQLFile('seed.sql', 'Seed data insertion');
    
    console.log('[DB-INIT] ✅ Database initialization completed successfully');
  } catch (error) {
    console.error('[DB-INIT] ❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Verify database initialization
 */
async function verifyInitialization(): Promise<boolean> {
  try {
    // Check core tables exist
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('ai_model_config', 'rag_urls', 'config_audit')
      ORDER BY table_name
    `;
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    const requiredTables = ['ai_model_config', 'rag_urls', 'config_audit'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.error(`[DB-INIT] Missing required tables: ${missingTables.join(', ')}`);
      return false;
    }
    
    // Check that at least some indexes exist
    const indexesResult = await sql`
      SELECT COUNT(*) as index_count 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename IN ('ai_model_config', 'rag_urls', 'config_audit')
    `;
    
    const indexCount = parseInt(indexesResult.rows[0].index_count);
    if (indexCount === 0) {
      console.warn('[DB-INIT] ⚠️  No indexes found - database may not be fully initialized');
    }
    
    console.log(`[DB-INIT] ✅ Verification passed: ${existingTables.length} tables, ${indexCount} indexes`);
    return true;
  } catch (error) {
    console.error('[DB-INIT] ❌ Verification failed:', error);
    return false;
  }
}

/**
 * Main initialization function - safe to call multiple times
 * Returns initialization result with status information
 */
export async function ensureDatabaseInitialized(): Promise<InitializationResult> {
  const startTime = Date.now();
  
  try {
    console.log('[DB-INIT] Checking database initialization status...');
    
    // Check if database is already initialized
    const isInitialized = await checkDatabaseInitialized();
    
    if (isInitialized) {
      console.log('[DB-INIT] ✅ Database is already initialized');
      return {
        initialized: true,
        alreadyInitialized: true,
        duration: Date.now() - startTime
      };
    }
    
    // Database needs initialization
    console.log('[DB-INIT] Database not initialized, starting initialization...');
    
    // Perform initialization
    await initializeDatabase();
    
    // Verify initialization was successful
    const verificationPassed = await verifyInitialization();
    
    if (!verificationPassed) {
      throw new Error('Database initialization verification failed');
    }
    
    const duration = Date.now() - startTime;
    console.log(`[DB-INIT] ✅ Database initialization completed in ${duration}ms`);
    
    return {
      initialized: true,
      alreadyInitialized: false,
      duration
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`[DB-INIT] ❌ Database initialization failed after ${duration}ms:`, error);
    
    return {
      initialized: false,
      alreadyInitialized: false,
      error: errorMessage,
      duration
    };
  }
}

/**
 * Get current database initialization status without attempting initialization
 */
export async function getDatabaseInitializationStatus(): Promise<{
  initialized: boolean;
  tables: string[];
  indexCount: number;
  error?: string;
}> {
  try {
    const isInitialized = await checkDatabaseInitialized();
    
    // Get detailed status
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    const indexesResult = await sql`
      SELECT COUNT(*) as index_count 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `;
    
    return {
      initialized: isInitialized,
      tables: tablesResult.rows.map(row => row.table_name),
      indexCount: parseInt(indexesResult.rows[0].index_count)
    };
  } catch (error) {
    return {
      initialized: false,
      tables: [],
      indexCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Force re-initialization (use with caution)
 * This will attempt to run schema and seed scripts even if tables exist
 */
export async function forceReinitializeDatabase(): Promise<InitializationResult> {
  const startTime = Date.now();
  
  try {
    console.log('[DB-INIT] ⚠️  Force re-initialization requested...');
    
    await initializeDatabase();
    const verificationPassed = await verifyInitialization();
    
    if (!verificationPassed) {
      throw new Error('Database force re-initialization verification failed');
    }
    
    const duration = Date.now() - startTime;
    console.log(`[DB-INIT] ✅ Force re-initialization completed in ${duration}ms`);
    
    return {
      initialized: true,
      alreadyInitialized: false,
      duration
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`[DB-INIT] ❌ Force re-initialization failed after ${duration}ms:`, error);
    
    return {
      initialized: false,
      alreadyInitialized: false,
      error: errorMessage,
      duration
    };
  }
}