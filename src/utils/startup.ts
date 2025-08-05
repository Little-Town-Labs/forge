/**
 * Startup validation utilities for the Forge application
 * 
 * This module runs validation checks during application startup to catch
 * configuration issues early in the application lifecycle.
 */

import { validateAdminConfig } from './admin';

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
}

/**
 * Startup validation configuration
 */
interface StartupValidationConfig {
  exitOnError: boolean;
  skipOnProduction: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

const defaultConfig: StartupValidationConfig = {
  exitOnError: process.env.NODE_ENV === 'production',
  skipOnProduction: false,
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
  
  console.log(`\n${colors.bold}${colors.cyan}🚀 Forge Application Startup Validation${colors.reset}`);
  console.log(`${colors.dim}Validating ${results.length} configuration components...${colors.reset}\n`);
  
  // Log each component result
  results.forEach(result => {
    const status = result.isValid 
      ? `${colors.green}✓ VALID${colors.reset}` 
      : `${colors.red}✗ INVALID${colors.reset}`;
    
    console.log(`${colors.bold}${result.component}:${colors.reset} ${status}`);
    
    // Log details if available
    if (result.details && Object.keys(result.details).length > 0) {
      console.log(`${colors.dim}  Details: ${JSON.stringify(result.details)}${colors.reset}`);
    }
    
    // Log issues
    result.issues.forEach(issue => {
      console.log(`  ${colors.red}✗ ERROR:${colors.reset} ${issue}`);
    });
    
    // Log warnings
    result.warnings.forEach(warning => {
      console.log(`  ${colors.yellow}⚠ WARNING:${colors.reset} ${warning}`);
    });
    
    console.log('');
  });
  
  // Summary
  console.log(`${colors.bold}Validation Summary:${colors.reset}`);
  console.log(`  ${colors.green}Valid components: ${validComponents}/${results.length}${colors.reset}`);
  
  if (totalIssues > 0) {
    console.log(`  ${colors.red}Total errors: ${totalIssues}${colors.reset}`);
  }
  
  if (totalWarnings > 0) {
    console.log(`  ${colors.yellow}Total warnings: ${totalWarnings}${colors.reset}`);
  }
  
  if (totalIssues === 0 && totalWarnings === 0) {
    console.log(`  ${colors.green}✓ All configurations valid!${colors.reset}`);
  }
  
  console.log('');
}

/**
 * Run all startup validations
 */
export function runStartupValidation(config: Partial<StartupValidationConfig> = {}): boolean {
  const validationConfig = { ...defaultConfig, ...config };
  
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
export function getValidationStatus(): {
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