/**
 * Startup validation utilities for the Forge application
 * 
 * This module runs validation checks during application startup to catch
 * configuration issues early in the application lifecycle.
 */

import { validateAdminConfig } from './admin';
import { validateDatabase, getDatabaseSetupInstructions } from '../lib/database';
import type { DatabaseValidationResult } from '../lib/database';

// ANSI color codes for console output
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

/**
 * Configuration validation results
 */
interface ValidationResult {
  component: string;
  isValid: boolean;
  issues: string[];
  warnings: string[];
  details?: Record<string, unknown>;
  degradationMode?: string;
  setupInstructions?: {
    title: string;
    instructions: string[];
    commands: string[];
    severity: 'error' | 'warning' | 'info';
  };
}

/**
 * Startup validation configuration
 */
interface StartupValidationConfig {
  exitOnError: boolean;
  skipOnProduction: boolean;
  skipDatabaseValidation: boolean;
  allowDegradedMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

const defaultConfig: StartupValidationConfig = {
  exitOnError: process.env.NODE_ENV === 'production',
  skipOnProduction: false,
  skipDatabaseValidation: false,
  allowDegradedMode: true,
  logLevel: 'info'
};

/**
 * Validate admin configuration
 */
function validateAdmin(): ValidationResult {
  const adminValidation = validateAdminConfig();
  
  return {
    component: 'Admin Configuration',
    isValid: adminValidation.isValid,
    issues: adminValidation.issues,
    warnings: adminValidation.warnings,
    details: {
      adminCount: adminValidation.adminCount,
      maxAdminEmails: adminValidation.maxAdminEmails
    }
  };
}

/**
 * Validate environment variables
 */
function validateEnvironment(): ValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Check required environment variables
  const requiredVars = ['OPENAI_API_KEY'];
  const optionalVars = ['PINECONE_API_KEY', 'PINECONE_INDEX', 'GOOGLE_AI_API_KEY'];
  const authVars = ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY'];
  
  // Check required variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      issues.push(`Missing required environment variable: ${varName}`);
    }
  }
  
  // Check authentication variables
  for (const varName of authVars) {
    if (!process.env[varName]) {
      issues.push(`Missing required authentication variable: ${varName}`);
    }
  }
  
  // Check optional variables
  let missingOptional = 0;
  for (const varName of optionalVars) {
    if (!process.env[varName]) {
      missingOptional++;
    }
  }
  
  if (missingOptional === optionalVars.length) {
    warnings.push('Pinecone configuration missing - application will run in demo mode');
  } else if (missingOptional > 0) {
    warnings.push('Partial Pinecone configuration - some features may not work correctly');
  }
  
  // Check for potentially problematic values
  if (process.env.ADMIN_EMAILS === 'admin@company.com,manager@company.com') {
    warnings.push('Using example admin emails - update ADMIN_EMAILS for production');
  }
  
  return {
    component: 'Environment Variables',
    isValid: issues.length === 0,
    issues,
    warnings,
    details: {
      requiredSet: requiredVars.filter(v => !!process.env[v]).length,
      requiredTotal: requiredVars.length,
      optionalSet: optionalVars.filter(v => !!process.env[v]).length,
      optionalTotal: optionalVars.length
    }
  };
}

/**
 * Validate database connectivity and schema
 */
async function validateDatabaseConfiguration(): Promise<ValidationResult> {
  try {
    const validation = await validateDatabase();
    const setupInstructions = getDatabaseSetupInstructions(validation);
    
    return {
      component: 'Database Configuration',
      isValid: validation.isValid,
      issues: validation.issues,
      warnings: validation.warnings,
      degradationMode: validation.degradationMode,
      setupInstructions,
      details: {
        connected: validation.connectivity.connected,
        responseTime: validation.connectivity.responseTime,
        tablesExist: validation.schema.tablesExist,
        missingTables: validation.schema.missingTables,
        hasDefaultModels: validation.data.hasDefaultModels,
        modelCount: validation.data.modelCount,
        urlCount: validation.data.urlCount,
        auditLogCount: validation.data.auditLogCount,
        degradationMode: validation.degradationMode
      }
    };
  } catch (error) {
    return {
      component: 'Database Configuration',
      isValid: false,
      issues: [`Database validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
      degradationMode: 'demo',
      setupInstructions: {
        title: 'Database Validation Failed',
        instructions: [
          'Database validation encountered an unexpected error.',
          'This may indicate a network issue or database misconfiguration.',
          'Check your database connection and environment variables.'
        ],
        commands: [
          'Check POSTGRES_URL environment variable',
          'Verify database server is accessible',
          'Review application logs for detailed error information'
        ],
        severity: 'error'
      },
      details: {
        connected: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * Validate rate limiting configuration
 */
function validateRateLimiting(): ValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  const perMinute = parseInt(process.env.MAX_INVITATIONS_PER_MINUTE || '5');
  const perHour = parseInt(process.env.MAX_INVITATIONS_PER_HOUR || '20');
  const rateLimitMode = process.env.RATE_LIMIT_MODE?.toLowerCase();
  const redisUrl = process.env.REDIS_URL;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Validate rate limiting values
  if (isNaN(perMinute) || perMinute < 1) {
    issues.push('MAX_INVITATIONS_PER_MINUTE must be a positive integer');
  } else if (perMinute > 60) {
    warnings.push('MAX_INVITATIONS_PER_MINUTE is very high - consider lowering for better rate limiting');
  }
  
  if (isNaN(perHour) || perHour < 1) {
    issues.push('MAX_INVITATIONS_PER_HOUR must be a positive integer');
  } else if (perHour > 1000) {
    warnings.push('MAX_INVITATIONS_PER_HOUR is very high - consider lowering to prevent abuse');
  }
  
  // Check logical relationship
  if (!isNaN(perMinute) && !isNaN(perHour) && perMinute * 60 > perHour) {
    warnings.push('Per-minute limit allows more invitations than hourly limit when extrapolated');
  }
  
  // Validate rate limiting mode and Redis configuration
  if (rateLimitMode && !['redis', 'memory', 'disabled'].includes(rateLimitMode)) {
    warnings.push(`Unknown RATE_LIMIT_MODE: ${rateLimitMode}. Valid options: redis, memory, disabled`);
  }
  
  // Check production-specific configurations
  if (isProduction) {
    if (rateLimitMode === 'memory') {
      warnings.push('Using in-memory rate limiting in production - this will not work with multiple instances');
    } else if (!redisUrl && rateLimitMode !== 'disabled' && rateLimitMode !== 'memory') {
      warnings.push('No Redis URL configured for production - rate limiting will be disabled');
    }
  }
  
  // Redis configuration validation
  if (rateLimitMode === 'redis' || (!rateLimitMode && redisUrl)) {
    if (!redisUrl) {
      issues.push('RATE_LIMIT_MODE is redis but REDIS_URL is not configured');
    } else if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
      warnings.push('REDIS_URL should start with redis:// or rediss:// for proper connection');
    }
  }
  
  // Determine effective mode
  let effectiveMode = rateLimitMode;
  if (!effectiveMode) {
    if (redisUrl) {
      effectiveMode = 'redis';
    } else if (isProduction) {
      effectiveMode = 'disabled';
    } else {
      effectiveMode = 'memory';
    }
  }
  
  return {
    component: 'Rate Limiting',
    isValid: issues.length === 0,
    issues,
    warnings,
    details: {
      mode: effectiveMode,
      perMinute,
      perHour,
      maxTheoreticalPerHour: perMinute * 60,
      redisConfigured: !!redisUrl,
      isProduction
    }
  };
}

/**
 * Format and log validation results
 */
function logValidationResults(results: ValidationResult[], config: StartupValidationConfig): void {
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
  const validComponents = results.filter(r => r.isValid).length;
  const degradedComponents = results.filter(r => r.degradationMode && r.degradationMode !== 'none');
  
  console.log(`\n${colors.bold}${colors.cyan}🚀 Forge Application Startup Validation${colors.reset}`);
  console.log(`${colors.dim}Validating ${results.length} configuration components...${colors.reset}\n`);
  
  // Log each component result
  results.forEach(result => {
    let status = result.isValid 
      ? `${colors.green}✓ VALID${colors.reset}` 
      : `${colors.red}✗ INVALID${colors.reset}`;
    
    // Add degradation mode if applicable
    if (result.degradationMode && result.degradationMode !== 'none') {
      const modeColor = result.degradationMode === 'demo' ? colors.yellow : 
                        result.degradationMode === 'readonly' ? colors.blue : colors.cyan;
      status += ` ${colors.dim}(${modeColor}${result.degradationMode.toUpperCase()}${colors.reset}${colors.dim})${colors.reset}`;
    }
    
    console.log(`${colors.bold}${result.component}:${colors.reset} ${status}`);
    
    // Log degradation mode details
    if (result.degradationMode && result.degradationMode !== 'none') {
      const modeExplanation = getDegradationModeExplanation(result.degradationMode);
      console.log(`${colors.dim}  Mode: ${modeExplanation}${colors.reset}`);
    }
    
    // Log details if available (but make them more readable)
    if (result.details && Object.keys(result.details).length > 0) {
      const importantDetails = getImportantDetails(result.details);
      if (importantDetails.length > 0) {
        console.log(`${colors.dim}  Details: ${importantDetails.join(', ')}${colors.reset}`);
      }
    }
    
    // Log issues
    result.issues.forEach(issue => {
      console.log(`  ${colors.red}✗ ERROR:${colors.reset} ${issue}`);
    });
    
    // Log warnings
    result.warnings.forEach(warning => {
      console.log(`  ${colors.yellow}⚠ WARNING:${colors.reset} ${warning}`);
    });
    
    // Log setup instructions for failed components
    if (result.setupInstructions && (!result.isValid || result.setupInstructions.severity === 'error')) {
      console.log(`  ${colors.bold}${colors.cyan}📋 Setup Instructions:${colors.reset} ${result.setupInstructions.title}`);
      result.setupInstructions.instructions.forEach(instruction => {
        console.log(`    ${colors.dim}• ${instruction}${colors.reset}`);
      });
      if (result.setupInstructions.commands.length > 0) {
        console.log(`    ${colors.bold}Commands to run:${colors.reset}`);
        result.setupInstructions.commands.forEach(command => {
          console.log(`      ${colors.green}${command}${colors.reset}`);
        });
      }
    }
    
    console.log('');
  });
  
  // Summary
  console.log(`${colors.bold}Validation Summary:${colors.reset}`);
  console.log(`  ${colors.green}Valid components: ${validComponents}/${results.length}${colors.reset}`);
  
  if (degradedComponents.length > 0) {
    console.log(`  ${colors.yellow}Components in degraded mode: ${degradedComponents.length}${colors.reset}`);
  }
  
  if (totalIssues > 0) {
    console.log(`  ${colors.red}Total errors: ${totalIssues}${colors.reset}`);
  }
  
  if (totalWarnings > 0) {
    console.log(`  ${colors.yellow}Total warnings: ${totalWarnings}${colors.reset}`);
  }
  
  // Determine overall application state
  if (totalIssues === 0 && totalWarnings === 0) {
    console.log(`  ${colors.green}✓ All configurations valid! Application ready for full operation.${colors.reset}`);
  } else if (config.allowDegradedMode && degradedComponents.length > 0) {
    console.log(`  ${colors.yellow}⚠ Application will start in degraded mode due to configuration issues.${colors.reset}`);
  } else if (totalIssues > 0) {
    console.log(`  ${colors.red}✗ Critical configuration errors detected.${colors.reset}`);
  }
  
  console.log('');
}

/**
 * Get human-readable explanation for degradation modes
 */
function getDegradationModeExplanation(mode: string): string {
  switch (mode) {
    case 'demo':
      return 'Limited functionality with hardcoded demo data';
    case 'readonly':
      return 'Database access available but some operations disabled';
    case 'disabled':
      return 'Component completely disabled';
    default:
      return 'Unknown degradation mode';
  }
}

/**
 * Extract important details for display
 */
function getImportantDetails(details: Record<string, unknown>): string[] {
  const important: string[] = [];
  
  if (details.connected === false) {
    important.push('Database disconnected');
  } else if (details.responseTime) {
    important.push(`Response time: ${details.responseTime}ms`);
  }
  
  if (details.modelCount !== undefined) {
    important.push(`Models: ${details.modelCount}`);
  }
  
  if (details.hasDefaultModels === false) {
    important.push('No default models');
  }
  
  if (Array.isArray(details.missingTables) && details.missingTables.length > 0) {
    important.push(`Missing tables: ${details.missingTables.length}`);
  }
  
  if (details.mode) {
    important.push(`Mode: ${details.mode}`);
  }
  
  return important;
}

/**
 * Run all startup validations
 */
export async function runStartupValidation(config: Partial<StartupValidationConfig> = {}): Promise<{
  success: boolean;
  degradationMode: 'none' | 'demo' | 'readonly' | 'disabled';
  databaseValidation?: DatabaseValidationResult;
}> {
  const validationConfig = { ...defaultConfig, ...config };
  
  // Skip validation in production if configured
  if (validationConfig.skipOnProduction && process.env.NODE_ENV === 'production') {
    console.log(`${colors.dim}Skipping startup validation in production environment${colors.reset}`);
    return { success: true, degradationMode: 'none' };
  }
  
  const results: ValidationResult[] = [
    validateAdmin(),
    validateEnvironment(),
    validateRateLimiting()
  ];
  
  // Add database validation if not skipped
  let databaseValidationResult: DatabaseValidationResult | undefined;
  if (!validationConfig.skipDatabaseValidation) {
    try {
      const databaseResult = await validateDatabaseConfiguration();
      results.push(databaseResult);
      // Extract the actual database validation result for return
      if (databaseResult.details?.degradationMode) {
        databaseValidationResult = {
          isValid: databaseResult.isValid,
          connectivity: {
            connected: Boolean(databaseResult.details.connected),
            responseTime: Number(databaseResult.details.responseTime || 0),
            error: databaseResult.details.errorMessage as string
          },
          schema: {
            tablesExist: Boolean(databaseResult.details.tablesExist),
            missingTables: Array.isArray(databaseResult.details.missingTables) ? databaseResult.details.missingTables as string[] : [],
            indexesExist: true,
            missingIndexes: [],
            triggersExist: true,
            missingTriggers: []
          },
          data: {
            hasDefaultModels: Boolean(databaseResult.details.hasDefaultModels),
            modelCount: Number(databaseResult.details.modelCount || 0),
            urlCount: Number(databaseResult.details.urlCount || 0),
            auditLogCount: Number(databaseResult.details.auditLogCount || 0)
          },
          degradationMode: databaseResult.details.degradationMode as 'none' | 'demo' | 'readonly' | 'disabled',
          issues: databaseResult.issues,
          warnings: databaseResult.warnings
        };
      }
    } catch (error) {
      console.error(`${colors.red}Failed to validate database:${colors.reset}`, error);
      // Continue with other validations even if database validation fails
    }
  }
  
  logValidationResults(results, validationConfig);
  
  const hasErrors = results.some(r => !r.isValid);
  const hasCriticalErrors = results.some(r => !r.isValid && r.degradationMode !== 'demo' && r.degradationMode !== 'readonly');
  
  // Determine overall degradation mode
  const degradationModes = results
    .map(r => r.degradationMode)
    .filter(mode => mode && mode !== 'none');
  
  let overallDegradationMode: 'none' | 'demo' | 'readonly' | 'disabled' = 'none';
  if (degradationModes.includes('disabled')) {
    overallDegradationMode = 'disabled';
  } else if (degradationModes.includes('demo')) {
    overallDegradationMode = 'demo';
  } else if (degradationModes.includes('readonly')) {
    overallDegradationMode = 'readonly';
  }
  
  // Handle error conditions
  if (hasCriticalErrors) {
    const errorMessage = `${colors.red}${colors.bold}Critical startup validation errors detected!${colors.reset} Application cannot start safely.`;
    console.error(errorMessage);
    
    if (validationConfig.exitOnError) {
      console.error(`${colors.red}Exiting application due to critical configuration errors.${colors.reset}`);
      process.exit(1);
    }
    
    return { success: false, degradationMode: 'disabled', databaseValidation: databaseValidationResult };
  }
  
  if (hasErrors && !validationConfig.allowDegradedMode) {
    const errorMessage = `${colors.red}${colors.bold}Startup validation failed!${colors.reset} Degraded mode is not allowed.`;
    console.error(errorMessage);
    
    if (validationConfig.exitOnError) {
      console.error(`${colors.red}Exiting application due to configuration errors.${colors.reset}`);
      process.exit(1);
    }
    
    return { success: false, degradationMode: overallDegradationMode, databaseValidation: databaseValidationResult };
  }
  
  // Success scenarios
  const hasWarnings = results.some(r => r.warnings.length > 0);
  
  if (overallDegradationMode !== 'none') {
    console.log(`${colors.yellow}${colors.bold}⚠ Application will start in ${overallDegradationMode.toUpperCase()} mode.${colors.reset}`);
    console.log(`${colors.yellow}Some functionality may be limited. Address configuration issues for full operation.${colors.reset}\n`);
  } else if (hasWarnings) {
    console.log(`${colors.yellow}Application starting with warnings. Consider addressing them for optimal operation.${colors.reset}\n`);
  } else {
    console.log(`${colors.green}${colors.bold}✓ All validations passed! Application ready for full operation.${colors.reset}\n`);
  }
  
  return { 
    success: true, 
    degradationMode: overallDegradationMode,
    databaseValidation: databaseValidationResult
  };
}

/**
 * Synchronous version of startup validation for environments that don't support async
 */
export function runStartupValidationSync(config: Partial<StartupValidationConfig> = {}): boolean {
  const validationConfig = { ...defaultConfig, ...config, skipDatabaseValidation: true };
  
  // Skip validation in production if configured
  if (validationConfig.skipOnProduction && process.env.NODE_ENV === 'production') {
    console.log(`${colors.dim}Skipping startup validation in production environment${colors.reset}`);
    return true;
  }
  
  const results: ValidationResult[] = [
    validateAdmin(),
    validateEnvironment(),
    validateRateLimiting()
  ];
  
  logValidationResults(results, validationConfig);
  
  const hasErrors = results.some(r => !r.isValid);
  
  if (hasErrors) {
    const errorMessage = `${colors.red}${colors.bold}Startup validation failed!${colors.reset} Please fix the configuration errors above.`;
    console.error(errorMessage);
    
    if (validationConfig.exitOnError) {
      console.error(`${colors.red}Exiting application due to configuration errors.${colors.reset}`);
      process.exit(1);
    }
    
    return false;
  }
  
  const hasWarnings = results.some(r => r.warnings.length > 0);
  if (hasWarnings) {
    console.log(`${colors.yellow}Application starting with warnings. Consider addressing them for optimal operation.${colors.reset}\n`);
  } else {
    console.log(`${colors.green}${colors.bold}✓ All validations passed! Application ready to start.${colors.reset}\n`);
  }
  
  return true;
}

/**
 * Get current validation status (for health checks)
 */
export async function getValidationStatus(): Promise<{
  isHealthy: boolean;
  timestamp: string;
  results: ValidationResult[];
  degradationMode: 'none' | 'demo' | 'readonly' | 'disabled';
}> {
  const results = [
    validateAdmin(),
    validateEnvironment(),
    validateRateLimiting()
  ];
  
  // Add database validation
  try {
    const databaseResult = await validateDatabaseConfiguration();
    results.push(databaseResult);
  } catch (error) {
    results.push({
      component: 'Database Configuration',
      isValid: false,
      issues: [`Database validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
      degradationMode: 'demo'
    });
  }
  
  // Determine overall degradation mode
  const degradationModes = results
    .map(r => r.degradationMode)
    .filter(mode => mode && mode !== 'none');
  
  let overallDegradationMode: 'none' | 'demo' | 'readonly' | 'disabled' = 'none';
  if (degradationModes.includes('disabled')) {
    overallDegradationMode = 'disabled';
  } else if (degradationModes.includes('demo')) {
    overallDegradationMode = 'demo';
  } else if (degradationModes.includes('readonly')) {
    overallDegradationMode = 'readonly';
  }
  
  return {
    isHealthy: results.every(r => r.isValid),
    timestamp: new Date().toISOString(),
    results,
    degradationMode: overallDegradationMode
  };
}

/**
 * Synchronous validation status for environments that don't support async
 */
export function getValidationStatusSync(): {
  isHealthy: boolean;
  timestamp: string;
  results: ValidationResult[];
} {
  const results = [
    validateAdmin(),
    validateEnvironment(),
    validateRateLimiting()
  ];
  
  return {
    isHealthy: results.every(r => r.isValid),
    timestamp: new Date().toISOString(),
    results
  };
}