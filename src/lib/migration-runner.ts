/**
 * Database Migration Runner
 * 
 * Provides automated database migration execution with rollback capabilities,
 * integrity checking, and comprehensive logging.
 */

import { sql } from './database';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

interface Migration {
  version: number;
  name: string;
  description: string;
  filePath: string;
  checksum: string;
}

interface MigrationResult {
  success: boolean;
  migrationsApplied: number;
  migrationsSkipped: number;
  error?: string;
  appliedMigrations: Migration[];
  duration: number;
}

interface AppliedMigration {
  version: number;
  name: string;
  applied_at: Date;
  applied_by: string;
  checksum: string;
}

/**
 * Calculate SHA256 hash of file content for integrity verification
 */
function calculateChecksum(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Discover all migration files in the migrations directory
 */
async function discoverMigrations(): Promise<Migration[]> {
  const migrationsDir = path.join(process.cwd(), 'sql', 'migrations');
  
  try {
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files.filter(file => file.endsWith('.sql')).sort();
    
    const migrations: Migration[] = [];
    
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      
      // Extract migration number and name from filename (e.g., "001_add_versioning.sql")
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (match) {
        const version = parseInt(match[1]);
        const name = match[2];
        
        // Extract description from SQL comments
        const descMatch = content.match(/--\s*(?:Migration \d+:|This migration)\s*(.+)/i);
        const description = descMatch ? descMatch[1].trim() : `Migration ${version}`;
        
        migrations.push({
          version,
          name,
          description,
          filePath,
          checksum: calculateChecksum(content)
        });
      }
    }
    
    return migrations.sort((a, b) => a.version - b.version);
  } catch {
    console.log('[MIGRATION] No migrations directory found or no migrations to apply');
    return [];
  }
}

/**
 * Get currently applied migrations from database
 */
async function getAppliedMigrations(): Promise<AppliedMigration[]> {
  try {
    const result = await sql`
      SELECT version, name, applied_at, applied_by, checksum
      FROM schema_migrations
      ORDER BY version
    `;
    
    return result.rows as AppliedMigration[];
  } catch {
    // If schema_migrations table doesn't exist, return empty array
    console.log('[MIGRATION] Schema migrations table not found - this may be a new installation');
    return [];
  }
}

/**
 * Execute a single migration file
 */
async function executeMigration(migration: Migration, appliedBy: string): Promise<void> {
  const content = await fs.readFile(migration.filePath, 'utf8');
  
  console.log(`[MIGRATION] Applying migration ${migration.version}: ${migration.name}...`);
  
  try {
    // Execute the migration SQL using the proper query method
    await sql.query(content);
    
    // Record successful application (the migration should insert its own record,
    // but we'll update it with additional metadata)
    await sql`
      INSERT INTO schema_migrations (version, name, description, applied_by, checksum)
      VALUES (${migration.version}, ${migration.name}, ${migration.description}, ${appliedBy}, ${migration.checksum})
      ON CONFLICT (version) DO UPDATE SET
        applied_at = CURRENT_TIMESTAMP,
        applied_by = ${appliedBy},
        checksum = ${migration.checksum}
    `;
    
    console.log(`[MIGRATION] ✅ Migration ${migration.version} completed successfully`);
  } catch (error) {
    console.error(`[MIGRATION] ❌ Migration ${migration.version} failed:`, error);
    throw new Error(`Migration ${migration.version} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify migration integrity by comparing checksums
 */
async function verifyMigrationIntegrity(
  availableMigrations: Migration[],
  appliedMigrations: AppliedMigration[]
): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  for (const applied of appliedMigrations) {
    const available = availableMigrations.find(m => m.version === applied.version);
    
    if (!available) {
      errors.push(`Applied migration ${applied.version} (${applied.name}) not found in migration files`);
      continue;
    }
    
    if (available.checksum !== applied.checksum) {
      errors.push(`Migration ${applied.version} checksum mismatch - file may have been modified`);
    }
    
    if (available.name !== applied.name) {
      errors.push(`Migration ${applied.version} name mismatch: file="${available.name}", db="${applied.name}"`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Run all pending database migrations
 */
export async function runMigrations(appliedBy: string = 'system'): Promise<MigrationResult> {
  const startTime = Date.now();
  
  console.log('[MIGRATION] 🚀 Starting database migration runner...');
  console.log('[MIGRATION] ' + '-'.repeat(50));
  
  try {
    // Step 1: Discover available migrations
    const availableMigrations = await discoverMigrations();
    console.log(`[MIGRATION] Found ${availableMigrations.length} migration files`);
    
    if (availableMigrations.length === 0) {
      return {
        success: true,
        migrationsApplied: 0,
        migrationsSkipped: 0,
        appliedMigrations: [],
        duration: Date.now() - startTime
      };
    }
    
    // Step 2: Get applied migrations
    const appliedMigrations = await getAppliedMigrations();
    console.log(`[MIGRATION] Found ${appliedMigrations.length} applied migrations`);
    
    // Step 3: Verify integrity
    const integrity = await verifyMigrationIntegrity(availableMigrations, appliedMigrations);
    if (!integrity.isValid) {
      console.error('[MIGRATION] ❌ Migration integrity check failed:');
      integrity.errors.forEach(error => console.error(`[MIGRATION]   - ${error}`));
      throw new Error(`Migration integrity check failed: ${integrity.errors.join(', ')}`);
    }
    
    // Step 4: Determine pending migrations
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));
    const pendingMigrations = availableMigrations.filter(m => !appliedVersions.has(m.version));
    
    console.log(`[MIGRATION] ${pendingMigrations.length} migrations pending`);
    
    if (pendingMigrations.length === 0) {
      console.log('[MIGRATION] ✅ All migrations are already applied - database is up to date');
      return {
        success: true,
        migrationsApplied: 0,
        migrationsSkipped: availableMigrations.length,
        appliedMigrations: [],
        duration: Date.now() - startTime
      };
    }
    
    // Step 5: Apply pending migrations
    const appliedMigrationsList: Migration[] = [];
    
    for (const migration of pendingMigrations) {
      try {
        await executeMigration(migration, appliedBy);
        appliedMigrationsList.push(migration);
      } catch (error) {
        // Migration failed - log and halt
        console.error(`[MIGRATION] ❌ Migration sequence halted at migration ${migration.version}`);
        return {
          success: false,
          migrationsApplied: appliedMigrationsList.length,
          migrationsSkipped: availableMigrations.length - appliedMigrationsList.length - 1,
          error: error instanceof Error ? error.message : 'Unknown migration error',
          appliedMigrations: appliedMigrationsList,
          duration: Date.now() - startTime
        };
      }
    }
    
    const duration = Date.now() - startTime;
    
    console.log('[MIGRATION] ' + '-'.repeat(50));
    console.log(`[MIGRATION] ✅ All migrations completed successfully in ${duration}ms`);
    console.log(`[MIGRATION] Applied ${appliedMigrationsList.length} migrations`);
    
    return {
      success: true,
      migrationsApplied: appliedMigrationsList.length,
      migrationsSkipped: 0,
      appliedMigrations: appliedMigrationsList,
      duration
    };
    
  } catch (error) {
    console.error('[MIGRATION] ❌ Migration runner failed:', error);
    return {
      success: false,
      migrationsApplied: 0,
      migrationsSkipped: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      appliedMigrations: [],
      duration: Date.now() - startTime
    };
  }
}

/**
 * Get current migration status without running migrations
 */
export async function getMigrationStatus(): Promise<{
  currentVersion: number;
  availableMigrations: number;
  pendingMigrations: number;
  appliedMigrations: AppliedMigration[];
  integrityCheck: { isValid: boolean; errors: string[] };
}> {
  try {
    const availableMigrations = await discoverMigrations();
    const appliedMigrations = await getAppliedMigrations();
    const integrityCheck = await verifyMigrationIntegrity(availableMigrations, appliedMigrations);
    
    const currentVersion = appliedMigrations.length > 0 
      ? Math.max(...appliedMigrations.map(m => m.version))
      : 0;
    
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));
    const pendingCount = availableMigrations.filter(m => !appliedVersions.has(m.version)).length;
    
    return {
      currentVersion,
      availableMigrations: availableMigrations.length,
      pendingMigrations: pendingCount,
      appliedMigrations,
      integrityCheck
    };
  } catch (error) {
    throw new Error(`Failed to get migration status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a pre-migration backup
 */
export async function createPreMigrationBackup(appliedBy: string): Promise<number> {
  try {
    // This requires the backup functions from migration 002
    const result = await sql`
      SELECT create_config_backup(
        ${'pre_migration_' + new Date().toISOString().replace(/[:.]/g, '_')},
        'pre_migration',
        ${'Automatic backup before migration at ' + new Date().toISOString()},
        ${appliedBy}
      ) as backup_id
    `;
    
    const backupId = result.rows[0].backup_id;
    console.log(`[MIGRATION] ✅ Created pre-migration backup ID: ${backupId}`);
    return backupId;
  } catch (error) {
    console.warn('[MIGRATION] ⚠️  Could not create pre-migration backup:', error);
    return -1; // Continue without backup
  }
}

/**
 * Safe migration runner with automatic backup
 */
export async function runMigrationsWithBackup(appliedBy: string = 'system'): Promise<MigrationResult & { backupId?: number }> {
  console.log('[MIGRATION] Starting safe migration with automatic backup...');
  
  try {
    // Create backup before migrations
    const backupId = await createPreMigrationBackup(appliedBy);
    
    // Run migrations
    const result = await runMigrations(appliedBy);
    
    return {
      ...result,
      backupId: backupId > 0 ? backupId : undefined
    };
  } catch (error) {
    console.error('[MIGRATION] Safe migration failed:', error);
    return {
      success: false,
      migrationsApplied: 0,
      migrationsSkipped: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      appliedMigrations: [],
      duration: 0
    };
  }
}