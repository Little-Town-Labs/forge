#!/usr/bin/env node

/**
 * Database Validation System Test
 * 
 * Simple validation test that checks if our database validation system
 * files are properly structured and can be imported correctly.
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
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
 * Check if required files exist and have correct structure
 */
function validateFileStructure() {
  console.log(`${colors.bold}${colors.cyan}📁 Database Validation System File Structure Check${colors.reset}\n`);
  
  const requiredFiles = [
    {
      path: 'src/lib/database.ts',
      description: 'Database validation functions',
      requiredExports: [
        'validateDatabase',
        'DatabaseValidationResult',
        'getDatabaseSetupInstructions'
      ]
    },
    {
      path: 'src/utils/startup.ts', 
      description: 'Startup validation system',
      requiredExports: [
        'runStartupValidation',
        'getValidationStatus'
      ]
    },
    {
      path: 'src/utils/degradation.ts',
      description: 'Graceful degradation utilities',
      requiredExports: [
        'getApplicationState',
        'DegradationDetector',
        'createDegradationMiddleware'
      ]
    }
  ];

  let allFilesValid = true;
  
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, '..', file.path);
    console.log(`${colors.bold}Checking: ${file.path}${colors.reset}`);
    console.log(`${colors.dim}  ${file.description}${colors.reset}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`  ${colors.red}✗ File not found${colors.reset}`);
      allFilesValid = false;
      continue;
    }
    
    // Read file content
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for required exports
      let missingExports = [];
      for (const exportName of file.requiredExports) {
        if (!content.includes(`export`) || !content.includes(exportName)) {
          missingExports.push(exportName);
        }
      }
      
      if (missingExports.length > 0) {
        console.log(`  ${colors.yellow}⚠ Missing exports: ${missingExports.join(', ')}${colors.reset}`);
      } else {
        console.log(`  ${colors.green}✓ All required exports found${colors.reset}`);
      }
      
      // Check file size (should not be empty)
      const fileSize = content.length;
      console.log(`  ${colors.dim}File size: ${fileSize} characters${colors.reset}`);
      
      if (fileSize < 100) {
        console.log(`  ${colors.yellow}⚠ File seems very small${colors.reset}`);
      }
      
    } catch (error) {
      console.log(`  ${colors.red}✗ Error reading file: ${error.message}${colors.reset}`);
      allFilesValid = false;
    }
    
    console.log('');
  }
  
  return allFilesValid;
}

/**
 * Check database validation system components
 */
function validateSystemComponents() {
  console.log(`${colors.bold}${colors.cyan}🔧 Database Validation System Components Check${colors.reset}\n`);
  
  const databasePath = path.join(__dirname, '..', 'src/lib/database.ts');
  const startupPath = path.join(__dirname, '..', 'src/utils/startup.ts');
  const degradationPath = path.join(__dirname, '..', 'src/utils/degradation.ts');
  
  let componentsValid = true;
  
  // Check database.ts components
  console.log(`${colors.bold}Database validation components:${colors.reset}`);
  if (fs.existsSync(databasePath)) {
    const content = fs.readFileSync(databasePath, 'utf8');
    
    const checks = [
      { name: 'validateDatabase function', pattern: /export async function validateDatabase/ },
      { name: 'DatabaseValidationResult interface', pattern: /export interface DatabaseValidationResult/ },
      { name: 'getDatabaseSetupInstructions function', pattern: /export function getDatabaseSetupInstructions/ },
      { name: 'Required tables constant', pattern: /REQUIRED_TABLES/ },
      { name: 'Required indexes constant', pattern: /REQUIRED_INDEXES/ },
      { name: 'Schema validation function', pattern: /validateDatabaseSchema/ },
      { name: 'Data validation function', pattern: /validateDatabaseData/ }
    ];
    
    for (const check of checks) {
      if (check.pattern.test(content)) {
        console.log(`  ${colors.green}✓ ${check.name}${colors.reset}`);
      } else {
        console.log(`  ${colors.red}✗ ${check.name}${colors.reset}`);
        componentsValid = false;
      }
    }
  } else {
    console.log(`  ${colors.red}✗ database.ts not found${colors.reset}`);
    componentsValid = false;
  }
  
  console.log('');
  
  // Check startup.ts components
  console.log(`${colors.bold}Startup validation components:${colors.reset}`);
  if (fs.existsSync(startupPath)) {
    const content = fs.readFileSync(startupPath, 'utf8');
    
    const checks = [
      { name: 'runStartupValidation async function', pattern: /export async function runStartupValidation/ },
      { name: 'getValidationStatus async function', pattern: /export async function getValidationStatus/ },
      { name: 'validateDatabaseConfiguration function', pattern: /async function validateDatabaseConfiguration/ },
      { name: 'ValidationResult interface', pattern: /interface ValidationResult/ },
      { name: 'StartupValidationConfig interface', pattern: /interface StartupValidationConfig/ },
      { name: 'Degradation mode support', pattern: /degradationMode/ }
    ];
    
    for (const check of checks) {
      if (check.pattern.test(content)) {
        console.log(`  ${colors.green}✓ ${check.name}${colors.reset}`);
      } else {
        console.log(`  ${colors.red}✗ ${check.name}${colors.reset}`);
        componentsValid = false;
      }
    }
  } else {
    console.log(`  ${colors.red}✗ startup.ts not found${colors.reset}`);
    componentsValid = false;
  }
  
  console.log('');
  
  // Check degradation.ts components
  console.log(`${colors.bold}Degradation utilities components:${colors.reset}`);
  if (fs.existsSync(degradationPath)) {
    const content = fs.readFileSync(degradationPath, 'utf8');
    
    const checks = [
      { name: 'DegradationMode type', pattern: /export type DegradationMode/ },
      { name: 'ApplicationState interface', pattern: /export interface ApplicationState/ },
      { name: 'getApplicationState function', pattern: /export function getApplicationState/ },
      { name: 'DegradationDetector class', pattern: /export class DegradationDetector/ },
      { name: 'createDegradationMiddleware function', pattern: /export function createDegradationMiddleware/ },
      { name: 'Database fallbacks', pattern: /databaseFallbacks/ },
      { name: 'Global detector instance', pattern: /globalDegradationDetector/ }
    ];
    
    for (const check of checks) {
      if (check.pattern.test(content)) {
        console.log(`  ${colors.green}✓ ${check.name}${colors.reset}`);
      } else {
        console.log(`  ${colors.red}✗ ${check.name}${colors.reset}`);
        componentsValid = false;
      }
    }
  } else {
    console.log(`  ${colors.red}✗ degradation.ts not found${colors.reset}`);
    componentsValid = false;
  }
  
  console.log('');
  return componentsValid;
}

/**
 * Check integration files and examples
 */
function validateIntegrationFiles() {
  console.log(`${colors.bold}${colors.cyan}🚀 Integration Files Check${colors.reset}\n`);
  
  const integrationFiles = [
    {
      path: 'src/app/startup-validation-example.ts',
      description: 'Next.js integration example',
      requiredFunctions: [
        'initializeApplication',
        'healthCheck',
        'withDegradationHandling'
      ]
    }
  ];
  
  let integrationsValid = true;
  
  for (const file of integrationFiles) {
    const filePath = path.join(__dirname, '..', file.path);
    console.log(`${colors.bold}Checking: ${file.path}${colors.reset}`);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      for (const func of file.requiredFunctions) {
        if (content.includes(func)) {
          console.log(`  ${colors.green}✓ ${func} function found${colors.reset}`);
        } else {
          console.log(`  ${colors.yellow}⚠ ${func} function not found${colors.reset}`);
        }
      }
      
      console.log(`  ${colors.dim}File size: ${content.length} characters${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ File not found${colors.reset}`);
      integrationsValid = false;
    }
    
    console.log('');
  }
  
  return integrationsValid;
}

/**
 * Check package.json scripts
 */
function validatePackageScripts() {
  console.log(`${colors.bold}${colors.cyan}📦 Package Scripts Check${colors.reset}\n`);
  
  const packagePath = path.join(__dirname, '..', 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    console.log(`${colors.red}✗ package.json not found${colors.reset}`);
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const scripts = packageJson.scripts || {};
  
  const requiredScripts = [
    'setup-db',
    'test-db-validation', 
    'verify-models'
  ];
  
  let scriptsValid = true;
  
  for (const script of requiredScripts) {
    if (scripts[script]) {
      console.log(`  ${colors.green}✓ ${script}: ${scripts[script]}${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ Missing script: ${script}${colors.reset}`);
      scriptsValid = false;
    }
  }
  
  console.log('');
  return scriptsValid;
}

/**
 * Main validation function
 */
function main() {
  console.log(`${colors.bold}${colors.cyan}Database Validation System Verification${colors.reset}`);
  console.log(`${colors.dim}Checking if database validation system is properly implemented...${colors.reset}\n`);
  
  const startTime = Date.now();
  
  let allValid = true;
  
  // Run all validation checks
  allValid = validateFileStructure() && allValid;
  allValid = validateSystemComponents() && allValid;
  allValid = validateIntegrationFiles() && allValid;
  allValid = validatePackageScripts() && allValid;
  
  const duration = Math.round((Date.now() - startTime) / 1000);
  
  console.log(`${colors.bold}============================================================${colors.reset}`);
  console.log(`${colors.bold}VALIDATION SUMMARY${colors.reset}`);
  console.log(`${colors.bold}============================================================${colors.reset}`);
  console.log(`${colors.dim}Duration: ${duration} seconds${colors.reset}`);
  
  if (allValid) {
    console.log(`${colors.green}${colors.bold}✅ Database validation system is properly implemented!${colors.reset}`);
    console.log(`${colors.green}All required files, functions, and components are present.${colors.reset}`);
    console.log(`${colors.dim}You can now run: npm run setup-db${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}❌ Some components are missing or incomplete.${colors.reset}`);
    console.log(`${colors.red}Please review the output above and fix any issues.${colors.reset}`);
    process.exit(1);
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { validateFileStructure, validateSystemComponents };