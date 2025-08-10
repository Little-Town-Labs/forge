#!/usr/bin/env node

/**
 * Database Migration Runner Script
 * 
 * Runs all pending database migrations with backup creation and integrity checking.
 * 
 * Usage:
 *   node scripts/run-migrations.js
 *   npm run db:migrate
 */

const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

/**
 * Log with color
 */
function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

/**
 * Main migration runner
 */
async function runMigrations() {
  try {
    log(`${colors.bold}🚀 Database Migration Runner${colors.reset}`);
    log(`${colors.bold}${'-'.repeat(40)}${colors.reset}`);

    // Import the migration runner dynamically
    // This allows the script to work even if the module doesn't exist yet
    let runMigrationsWithBackup;
    
    try {
      const migrationModule = await import('../src/lib/migration-runner.js');
      runMigrationsWithBackup = migrationModule.runMigrationsWithBackup;
    } catch (importError) {
      // Try with .mjs extension or direct require
      try {
        const migrationModule = require('../src/lib/migration-runner');
        runMigrationsWithBackup = migrationModule.runMigrationsWithBackup;
      } catch (requireError) {
        log(`❌ Could not import migration runner module:`, colors.red);
        log(`Import error: ${importError.message}`, colors.red);
        log(`Require error: ${requireError.message}`, colors.red);
        log(`This script requires the application to be built first.`, colors.yellow);
        log(`Please run: npm run build`, colors.yellow);
        process.exit(1);
      }
    }

    // Run migrations
    const result = await runMigrationsWithBackup('cli-migration');
    
    // Display results
    log('', colors.reset);
    log('='.repeat(50), colors.bold);
    log('MIGRATION RESULTS', colors.bold);
    log('='.repeat(50), colors.bold);
    
    if (result.success) {
      log(`✅ Migration completed successfully`, colors.green);
      log(`Applied: ${result.migrationsApplied} migrations`, colors.green);
      log(`Skipped: ${result.migrationsSkipped} migrations`, colors.blue);
      log(`Duration: ${result.duration}ms`, colors.blue);
      
      if (result.backupId) {
        log(`Backup created: ID ${result.backupId}`, colors.blue);
      }
      
      if (result.appliedMigrations && result.appliedMigrations.length > 0) {
        log('Applied migrations:', colors.blue);
        result.appliedMigrations.forEach(migration => {
          log(`  - ${migration.version}: ${migration.name}`, colors.blue);
        });
      }
      
      log('Database is now up to date! 🎉', colors.green);
      process.exit(0);
    } else {
      log(`❌ Migration failed: ${result.error}`, colors.red);
      log(`Applied: ${result.migrationsApplied} migrations before failure`, colors.yellow);
      log(`Duration: ${result.duration}ms`, colors.red);
      
      log('', colors.reset);
      log('Troubleshooting:', colors.yellow);
      log('1. Check database connection', colors.yellow);
      log('2. Verify migration file syntax', colors.yellow);
      log('3. Review migration logs above', colors.yellow);
      log('4. Consider rollback if needed', colors.yellow);
      
      process.exit(1);
    }

  } catch (error) {
    log(`❌ Migration runner failed: ${error.message}`, colors.red);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n🛑 Migration interrupted by user', colors.yellow);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('❌ Unhandled Promise Rejection:', colors.red);
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

// Run migrations
runMigrations().catch((error) => {
  log(`❌ Fatal error in migration runner:`, colors.red);
  console.error(error);
  process.exit(1);
});