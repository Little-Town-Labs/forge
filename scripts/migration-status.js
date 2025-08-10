#!/usr/bin/env node

/**
 * Migration Status Checker Script
 * 
 * Shows the current database migration status without applying any changes.
 * 
 * Usage:
 *   node scripts/migration-status.js
 *   npm run db:migrate:status
 */

const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
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
 * Format table output
 */
function formatTable(headers, rows) {
  // Calculate column widths
  const widths = headers.map((header, i) => 
    Math.max(header.length, ...rows.map(row => String(row[i] || '').length))
  );
  
  // Create separator
  const separator = '+-' + widths.map(w => '-'.repeat(w)).join('-+-') + '-+';
  
  // Format header
  const headerRow = '| ' + headers.map((header, i) => 
    header.padEnd(widths[i])
  ).join(' | ') + ' |';
  
  // Format data rows
  const dataRows = rows.map(row => 
    '| ' + row.map((cell, i) => 
      String(cell || '').padEnd(widths[i])
    ).join(' | ') + ' |'
  );
  
  return [separator, headerRow, separator, ...dataRows, separator].join('\n');
}

/**
 * Main migration status checker
 */
async function checkMigrationStatus() {
  try {
    log(`${colors.bold}📊 Database Migration Status${colors.reset}`);
    log(`${colors.bold}${'-'.repeat(40)}${colors.reset}`);

    // Import the migration status function
    let getMigrationStatus;
    
    try {
      const migrationModule = await import('../src/lib/migration-runner.js');
      getMigrationStatus = migrationModule.getMigrationStatus;
    } catch (importError) {
      try {
        const migrationModule = require('../src/lib/migration-runner');
        getMigrationStatus = migrationModule.getMigrationStatus;
      } catch (requireError) {
        log(`❌ Could not import migration status module:`, colors.red);
        log(`This script requires the application to be built first.`, colors.yellow);
        log(`Please run: npm run build`, colors.yellow);
        process.exit(1);
      }
    }

    // Get migration status
    const status = await getMigrationStatus();
    
    // Display summary
    log('', colors.reset);
    log('='.repeat(60), colors.bold);
    log('MIGRATION STATUS SUMMARY', colors.bold);
    log('='.repeat(60), colors.bold);
    
    log(`Current Schema Version: ${status.currentVersion}`, status.currentVersion > 0 ? colors.green : colors.yellow);
    log(`Available Migrations: ${status.availableMigrations}`, colors.blue);
    log(`Pending Migrations: ${status.pendingMigrations}`, status.pendingMigrations > 0 ? colors.yellow : colors.green);
    log(`Applied Migrations: ${status.appliedMigrations.length}`, colors.green);
    
    // Integrity check
    if (status.integrityCheck.isValid) {
      log(`Migration Integrity: ✅ Valid`, colors.green);
    } else {
      log(`Migration Integrity: ❌ Issues Found`, colors.red);
      status.integrityCheck.errors.forEach(error => {
        log(`  - ${error}`, colors.red);
      });
    }
    
    // Applied migrations table
    if (status.appliedMigrations.length > 0) {
      log('', colors.reset);
      log('APPLIED MIGRATIONS', colors.bold);
      log('-'.repeat(20), colors.bold);
      
      const migrationHeaders = ['Version', 'Name', 'Applied At', 'Applied By'];
      const migrationRows = status.appliedMigrations.map(migration => [
        migration.version,
        migration.name,
        new Date(migration.applied_at).toLocaleString(),
        migration.applied_by
      ]);
      
      console.log(formatTable(migrationHeaders, migrationRows));
    }
    
    // Status indicators
    log('', colors.reset);
    log('STATUS INDICATORS', colors.bold);
    log('-'.repeat(17), colors.bold);
    
    if (status.pendingMigrations === 0) {
      log('🟢 Database is up to date', colors.green);
      log('   No migrations need to be applied', colors.green);
    } else {
      log(`🟡 ${status.pendingMigrations} migrations pending`, colors.yellow);
      log('   Run "npm run db:migrate" to apply pending migrations', colors.yellow);
    }
    
    if (!status.integrityCheck.isValid) {
      log('🔴 Migration integrity issues detected', colors.red);
      log('   Review migration files and database state', colors.red);
    }
    
    // Recommendations
    log('', colors.reset);
    log('RECOMMENDATIONS', colors.bold);
    log('-'.repeat(15), colors.bold);
    
    if (status.pendingMigrations > 0) {
      log('📝 Create a backup before running migrations:', colors.cyan);
      log('   pg_dump $POSTGRES_URL > backup_$(date +%Y%m%d_%H%M%S).sql', colors.cyan);
      log('📦 Run migrations with automatic backup:', colors.cyan);
      log('   npm run db:migrate', colors.cyan);
    }
    
    if (status.appliedMigrations.length > 5) {
      log('🗂️  Consider creating a consolidated schema file for new deployments', colors.cyan);
    }
    
    if (status.currentVersion === 0) {
      log('⚡ This appears to be a new database - run initial setup:', colors.cyan);
      log('   npm run setup-db', colors.cyan);
    }
    
    log('', colors.reset);
    process.exit(0);

  } catch (error) {
    log(`❌ Migration status check failed: ${error.message}`, colors.red);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n🛑 Status check interrupted by user', colors.yellow);
  process.exit(1);
});

// Run status check
checkMigrationStatus().catch((error) => {
  log(`❌ Fatal error in migration status checker:`, colors.red);
  console.error(error);
  process.exit(1);
});