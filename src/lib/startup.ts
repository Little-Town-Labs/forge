/**
 * Application Startup Initialization
 * 
 * Handles all startup initialization tasks including database setup,
 * environment validation, and system health checks.
 */

import { ensureDatabaseInitialized } from './database-init';
import { validateEncryptionKey, testEncryption } from './encryption';
import { runMigrationsWithBackup } from './migration-runner';
import { getUptime } from './startup-init';

interface StartupResult {
  success: boolean;
  duration: number;
  database: {
    initialized: boolean;
    alreadyInitialized: boolean;
    error?: string;
  };
  migrations: {
    success: boolean;
    applied: number;
    skipped: number;
    currentVersion: number;
    backupId?: number;
    error?: string;
  };
  encryption: {
    configured: boolean;
    working: boolean;
    error?: string;
  };
  environment: {
    valid: boolean;
    missingVariables: string[];
  };
}

/**
 * Validate required environment variables
 */
function validateEnvironment(): { valid: boolean; missingVariables: string[] } {
  const requiredVars = [
    'POSTGRES_URL',
    'OPENAI_API_KEY',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET'
  ];
  
  const optionalVars = [
    'CONFIG_ENCRYPTION_KEY', // Required for production with encryption
    'PINECONE_API_KEY',      // Optional for vector search
    'PINECONE_INDEX',        // Optional for vector search
    'CLERK_SECRET_KEY',      // Optional for Clerk auth
    'CLERK_PUBLISHABLE_KEY'  // Optional for Clerk auth
  ];
  
  const missingRequired = requiredVars.filter(varName => !process.env[varName]);
  const missingOptional = optionalVars.filter(varName => !process.env[varName]);
  
  if (missingOptional.length > 0) {
    console.log(`[STARTUP] Optional environment variables not set: ${missingOptional.join(', ')}`);
  }
  
  return {
    valid: missingRequired.length === 0,
    missingVariables: missingRequired
  };
}

/**
 * Initialize encryption system
 */
function initializeEncryption(): { configured: boolean; working: boolean; error?: string } {
  try {
    const keyValidation = validateEncryptionKey(process.env.CONFIG_ENCRYPTION_KEY);
    
    if (!keyValidation.isValid) {
      return {
        configured: false,
        working: false,
        error: keyValidation.error
      };
    }
    
    // Test encryption functionality
    const encryptionTest = testEncryption();
    
    return {
      configured: true,
      working: encryptionTest.success,
      error: encryptionTest.error
    };
  } catch (error) {
    return {
      configured: false,
      working: false,
      error: error instanceof Error ? error.message : 'Unknown encryption error'
    };
  }
}

/**
 * Perform all startup initialization tasks
 */
export async function initializeApplication(): Promise<StartupResult> {
  const startTime = Date.now();
  
  console.log('[STARTUP] 🚀 Starting Forge application initialization...');
  console.log('[STARTUP] ' + '-'.repeat(50));
  
  // Step 1: Validate environment
  console.log('[STARTUP] Step 1: Validating environment variables...');
  const environmentResult = validateEnvironment();
  
  if (!environmentResult.valid) {
    console.error(`[STARTUP] ❌ Missing required environment variables: ${environmentResult.missingVariables.join(', ')}`);
  } else {
    console.log('[STARTUP] ✅ Environment validation passed');
  }
  
  // Step 2: Initialize encryption
  console.log('[STARTUP] Step 2: Initializing encryption system...');
  const encryptionResult = initializeEncryption();
  
  if (encryptionResult.configured && encryptionResult.working) {
    console.log('[STARTUP] ✅ Encryption system initialized and working');
  } else if (encryptionResult.configured) {
    console.log('[STARTUP] ⚠️  Encryption system configured but not working:', encryptionResult.error);
  } else {
    console.log('[STARTUP] ⚠️  Encryption system not configured:', encryptionResult.error);
  }
  
  // Step 3: Initialize database (only if environment is valid)
  let databaseResult;
  let migrationResult;
  
  if (environmentResult.valid) {
    console.log('[STARTUP] Step 3: Initializing database...');
    databaseResult = await ensureDatabaseInitialized();
    
    if (databaseResult.initialized) {
      const status = databaseResult.alreadyInitialized ? 'already initialized' : 'newly initialized';
      console.log(`[STARTUP] ✅ Database ${status} (${databaseResult.duration}ms)`);
      
      // Step 4: Run database migrations
      console.log('[STARTUP] Step 4: Running database migrations...');
      migrationResult = await runMigrationsWithBackup('system-startup');
      
      if (migrationResult.success) {
        if (migrationResult.migrationsApplied > 0) {
          console.log(`[STARTUP] ✅ Applied ${migrationResult.migrationsApplied} migrations`);
          if (migrationResult.backupId) {
            console.log(`[STARTUP] Pre-migration backup created with ID: ${migrationResult.backupId}`);
          }
        } else {
          console.log('[STARTUP] ✅ Database is up-to-date, no migrations needed');
        }
      } else {
        console.error(`[STARTUP] ❌ Migration failed: ${migrationResult.error}`);
      }
    } else {
      console.error(`[STARTUP] ❌ Database initialization failed: ${databaseResult.error}`);
      migrationResult = {
        success: false,
        applied: 0,
        skipped: 0,
        currentVersion: 0,
        error: 'Database initialization failed'
      };
    }
  } else {
    console.log('[STARTUP] Skipping database initialization due to environment validation errors');
    databaseResult = {
      initialized: false,
      alreadyInitialized: false,
      error: 'Environment validation failed'
    };
    migrationResult = {
      success: false,
      applied: 0,
      skipped: 0,
      currentVersion: 0,
      error: 'Environment validation failed'
    };
  }
  
  // Calculate results
  const duration = Date.now() - startTime;
  const success = environmentResult.valid && 
                  databaseResult.initialized && 
                  migrationResult.success &&
                  encryptionResult.configured;
  
  // Final status
  console.log('[STARTUP] ' + '-'.repeat(50));
  
  if (success) {
    console.log(`[STARTUP] ✅ Application initialization completed successfully in ${duration}ms`);
    console.log('[STARTUP] 🎉 Forge is ready to serve requests!');
  } else {
    console.error(`[STARTUP] ❌ Application initialization completed with errors in ${duration}ms`);
    console.error('[STARTUP] Some features may not work correctly');
  }
  
  return {
    success,
    duration,
    database: {
      initialized: databaseResult.initialized,
      alreadyInitialized: databaseResult.alreadyInitialized,
      error: databaseResult.error
    },
    migrations: {
      success: migrationResult.success,
      applied: migrationResult.migrationsApplied || 0,
      skipped: migrationResult.migrationsSkipped || 0,
      currentVersion: migrationResult.appliedMigrations?.length ? Math.max(...migrationResult.appliedMigrations.map(m => m.version)) : 0,
      backupId: migrationResult.backupId,
      error: migrationResult.error
    },
    encryption: encryptionResult,
    environment: environmentResult
  };
}

/**
 * Get startup status without re-initializing
 */
export function getStartupStatus(): {
  timestamp: string;
  uptime: number;
  environment: ReturnType<typeof validateEnvironment>;
  encryption: ReturnType<typeof initializeEncryption>;
} {
  return {
    timestamp: new Date().toISOString(),
    uptime: getUptime(),
    environment: validateEnvironment(),
    encryption: initializeEncryption()
  };
}

// Global flag to prevent multiple initializations
let initializationPromise: Promise<StartupResult> | null = null;

/**
 * Singleton initialization - ensures initialization only happens once
 */
export async function ensureApplicationInitialized(): Promise<StartupResult> {
  if (!initializationPromise) {
    initializationPromise = initializeApplication();
  }
  
  return initializationPromise;
}

/**
 * Force re-initialization (use with caution)
 */
export async function forceReinitializeApplication(): Promise<StartupResult> {
  console.log('[STARTUP] ⚠️  Force re-initialization requested...');
  initializationPromise = null;
  return ensureApplicationInitialized();
}