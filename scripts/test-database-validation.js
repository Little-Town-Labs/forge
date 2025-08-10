#!/usr/bin/env node

/**
 * Database Validation Testing Script
 * 
 * Tests the database validation system with different scenarios
 * to ensure proper error handling and graceful degradation.
 */

const path = require('path');
const fs = require('fs');

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
 * Mock different database connection scenarios
 */
const testScenarios = [
  {
    name: 'No Database Connection',
    description: 'Simulate database connection failure',
    mockEnv: {
      POSTGRES_URL: undefined,
      POSTGRES_PRISMA_URL: undefined
    },
    expectedDegradationMode: 'demo'
  },
  {
    name: 'Connected but Missing Schema',
    description: 'Database connected but tables not created',
    mockEnv: {
      POSTGRES_URL: 'postgresql://test:test@localhost:5432/test_empty'
    },
    expectedDegradationMode: 'demo'
  },
  {
    name: 'Partial Schema',
    description: 'Some tables exist but schema incomplete',
    mockEnv: {
      POSTGRES_URL: 'postgresql://test:test@localhost:5432/test_partial'
    },
    expectedDegradationMode: 'readonly'
  },
  {
    name: 'Full Database Setup',
    description: 'Complete database with all tables and data',
    mockEnv: {
      POSTGRES_URL: process.env.POSTGRES_URL
    },
    expectedDegradationMode: 'none'
  }
];

/**
 * Run validation test scenarios
 */
async function runValidationTests() {
  console.log(`\n${colors.bold}${colors.cyan}🧪 Database Validation System Tests${colors.reset}`);
  console.log(`${colors.dim}Testing database validation and graceful degradation...${colors.reset}\n`);

  let passedTests = 0;
  let totalTests = 0;

  for (const scenario of testScenarios) {
    console.log(`${colors.bold}Test: ${scenario.name}${colors.reset}`);
    console.log(`${colors.dim}Description: ${scenario.description}${colors.reset}`);
    
    totalTests++;
    
    try {
      // Mock environment variables for this test
      const originalEnv = {};
      for (const [key, value] of Object.entries(scenario.mockEnv)) {
        originalEnv[key] = process.env[key];
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }

      // Import and run validation (dynamic import to get fresh module)
      const { runStartupValidation } = await import('../src/utils/startup.js');
      
      const result = await runStartupValidation({
        exitOnError: false,
        allowDegradedMode: true,
        logLevel: 'error' // Reduce log output during testing
      });

      // Restore environment variables
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }

      // Verify results
      const success = result.degradationMode === scenario.expectedDegradationMode;
      
      if (success) {
        console.log(`${colors.green}✓ PASSED${colors.reset} - Degradation mode: ${colors.yellow}${result.degradationMode}${colors.reset}`);
        passedTests++;
      } else {
        console.log(`${colors.red}✗ FAILED${colors.reset} - Expected: ${scenario.expectedDegradationMode}, Got: ${result.degradationMode}`);
      }

      // Show additional details
      if (result.databaseValidation) {
        console.log(`${colors.dim}  Database connected: ${result.databaseValidation.connectivity.connected}${colors.reset}`);
        console.log(`${colors.dim}  Tables exist: ${result.databaseValidation.schema.tablesExist}${colors.reset}`);
        console.log(`${colors.dim}  Has default models: ${result.databaseValidation.data.hasDefaultModels}${colors.reset}`);
      }

    } catch (error) {
      console.log(`${colors.red}✗ ERROR${colors.reset} - ${error.message}`);
      console.log(`${colors.dim}  ${error.stack}${colors.reset}`);
    }

    console.log('');
  }

  // Test Summary
  console.log(`${colors.bold}Test Summary:${colors.reset}`);
  console.log(`  ${colors.green}Passed: ${passedTests}/${totalTests}${colors.reset}`);
  
  if (passedTests === totalTests) {
    console.log(`  ${colors.green}${colors.bold}✓ All tests passed!${colors.reset}`);
    return true;
  } else {
    console.log(`  ${colors.red}${colors.bold}✗ ${totalTests - passedTests} test(s) failed${colors.reset}`);
    return false;
  }
}

/**
 * Test degradation utilities
 */
async function testDegradationUtilities() {
  console.log(`\n${colors.bold}${colors.cyan}🔧 Degradation Utilities Tests${colors.reset}`);
  console.log(`${colors.dim}Testing degradation mode utilities...${colors.reset}\n`);

  try {
    const { 
      getApplicationState, 
      isFeatureAvailable, 
      getStateExplanation,
      DegradationDetector,
      databaseFallbacks
    } = await import('../src/utils/degradation.js');

    let passedTests = 0;
    let totalTests = 0;

    // Test getApplicationState
    totalTests++;
    const demoState = getApplicationState('demo');
    if (demoState.mode === 'demo' && demoState.features.chat === true && demoState.features.adminConfig === false) {
      console.log(`${colors.green}✓ getApplicationState works correctly${colors.reset}`);
      passedTests++;
    } else {
      console.log(`${colors.red}✗ getApplicationState failed${colors.reset}`);
    }

    // Test isFeatureAvailable
    totalTests++;
    if (isFeatureAvailable('demo', 'chat') === true && isFeatureAvailable('demo', 'adminConfig') === false) {
      console.log(`${colors.green}✓ isFeatureAvailable works correctly${colors.reset}`);
      passedTests++;
    } else {
      console.log(`${colors.red}✗ isFeatureAvailable failed${colors.reset}`);
    }

    // Test getStateExplanation
    totalTests++;
    const explanation = getStateExplanation('demo');
    if (explanation.title && explanation.description && explanation.severity === 'warning') {
      console.log(`${colors.green}✓ getStateExplanation works correctly${colors.reset}`);
      passedTests++;
    } else {
      console.log(`${colors.red}✗ getStateExplanation failed${colors.reset}`);
    }

    // Test DegradationDetector
    totalTests++;
    const detector = new DegradationDetector('none');
    let modeChanged = false;
    const unsubscribe = detector.onModeChange((mode) => {
      modeChanged = mode === 'demo';
    });
    detector.updateMode('demo');
    unsubscribe();
    
    if (modeChanged && detector.getCurrentMode() === 'demo') {
      console.log(`${colors.green}✓ DegradationDetector works correctly${colors.reset}`);
      passedTests++;
    } else {
      console.log(`${colors.red}✗ DegradationDetector failed${colors.reset}`);
    }

    // Test database fallbacks
    totalTests++;
    const fallbackConfig = databaseFallbacks.getFallbackModelConfig('openai');
    const demoContext = databaseFallbacks.getDemoContext();
    if (fallbackConfig.provider === 'openai' && Array.isArray(demoContext) && demoContext.length > 0) {
      console.log(`${colors.green}✓ Database fallbacks work correctly${colors.reset}`);
      passedTests++;
    } else {
      console.log(`${colors.red}✗ Database fallbacks failed${colors.reset}`);
    }

    console.log(`\n${colors.bold}Degradation Utilities Summary:${colors.reset}`);
    console.log(`  ${colors.green}Passed: ${passedTests}/${totalTests}${colors.reset}`);
    
    return passedTests === totalTests;

  } catch (error) {
    console.log(`${colors.red}✗ ERROR loading degradation utilities:${colors.reset} ${error.message}`);
    return false;
  }
}

/**
 * Integration test with Next.js app
 */
async function testNextJSIntegration() {
  console.log(`\n${colors.bold}${colors.cyan}🚀 Next.js Integration Test${colors.reset}`);
  console.log(`${colors.dim}Testing integration with Next.js application startup...${colors.reset}\n`);

  try {
    // Check if we're in a Next.js project
    const packageJsonPath = path.join(__dirname, '../package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.log(`${colors.yellow}⚠ package.json not found, skipping Next.js integration test${colors.reset}`);
      return true;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (!packageJson.dependencies?.next) {
      console.log(`${colors.yellow}⚠ Next.js not found in dependencies, skipping integration test${colors.reset}`);
      return true;
    }

    // Test startup validation integration
    const { runStartupValidation, getValidationStatus } = await import('../src/utils/startup.js');
    
    console.log(`${colors.dim}Running startup validation...${colors.reset}`);
    const startupResult = await runStartupValidation({
      exitOnError: false,
      allowDegradedMode: true
    });

    console.log(`${colors.dim}Getting validation status...${colors.reset}`);
    const statusResult = await getValidationStatus();

    if (startupResult.success !== undefined && statusResult.isHealthy !== undefined) {
      console.log(`${colors.green}✓ Next.js integration working correctly${colors.reset}`);
      console.log(`${colors.dim}  Startup success: ${startupResult.success}${colors.reset}`);
      console.log(`${colors.dim}  App healthy: ${statusResult.isHealthy}${colors.reset}`);
      console.log(`${colors.dim}  Degradation mode: ${startupResult.degradationMode}${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}✗ Next.js integration failed${colors.reset}`);
      return false;
    }

  } catch (error) {
    console.log(`${colors.red}✗ Next.js integration error:${colors.reset} ${error.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log(`${colors.bold}${colors.cyan}Database Validation System Test Suite${colors.reset}`);
  console.log(`${colors.dim}Testing database validation, graceful degradation, and integration${colors.reset}`);
  
  const startTime = Date.now();
  let allTestsPassed = true;

  try {
    // Run validation tests
    const validationPassed = await runValidationTests();
    allTestsPassed = allTestsPassed && validationPassed;

    // Run degradation utilities tests
    const degradationPassed = await testDegradationUtilities();
    allTestsPassed = allTestsPassed && degradationPassed;

    // Run Next.js integration test
    const integrationPassed = await testNextJSIntegration();
    allTestsPassed = allTestsPassed && integrationPassed;

  } catch (error) {
    console.error(`${colors.red}Test suite error:${colors.reset}`, error);
    allTestsPassed = false;
  }

  const duration = Math.round((Date.now() - startTime) / 1000);

  console.log(`\n${colors.bold}============================================================${colors.reset}`);
  console.log(`${colors.bold}TEST SUITE SUMMARY${colors.reset}`);
  console.log(`${colors.bold}============================================================${colors.reset}`);
  console.log(`${colors.dim}Duration: ${duration} seconds${colors.reset}`);
  
  if (allTestsPassed) {
    console.log(`${colors.green}${colors.bold}✅ All tests passed! Database validation system is working correctly.${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}❌ Some tests failed. Please review the output above.${colors.reset}`);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = { runValidationTests, testDegradationUtilities, testNextJSIntegration };