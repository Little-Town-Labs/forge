/**
 * Edge-compatible startup validation
 * 
 * This module provides lightweight startup validation that can run in Edge Runtime
 * without Node.js dependencies like fs, path, or crypto.
 */

interface EdgeStartupResult {
  success: boolean;
  environment: {
    valid: boolean;
    missingVariables: string[];
    warnings: string[];
  };
  basic: {
    timestamp: string;
    runtime: string;
  };
}

/**
 * Validate environment variables that can be checked in Edge Runtime
 */
function validateEnvironmentEdge(): { 
  valid: boolean; 
  missingVariables: string[];
  warnings: string[];
} {
  const requiredVars = [
    'POSTGRES_URL',
    'OPENAI_API_KEY'
  ];
  
  const optionalVars = [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'CONFIG_ENCRYPTION_KEY',
    'PINECONE_API_KEY',
    'PINECONE_INDEX',
    'CLERK_SECRET_KEY',
    'CLERK_PUBLISHABLE_KEY'
  ];
  
  const missingRequired = requiredVars.filter(varName => !process.env[varName]);
  const missingOptional = optionalVars.filter(varName => !process.env[varName]);
  
  const warnings: string[] = [];
  
  if (missingOptional.length > 0) {
    warnings.push(`Optional environment variables not set: ${missingOptional.join(', ')}`);
  }
  
  // Check for NextAuth configuration
  if (!process.env.NEXTAUTH_URL || !process.env.NEXTAUTH_SECRET) {
    warnings.push('NextAuth configuration incomplete - authentication may not work properly');
  }
  
  return {
    valid: missingRequired.length === 0,
    missingVariables: missingRequired,
    warnings
  };
}

/**
 * Get basic startup status for Edge Runtime
 */
export function getEdgeStartupStatus(): EdgeStartupResult {
  const environment = validateEnvironmentEdge();
  
  return {
    success: environment.valid,
    environment,
    basic: {
      timestamp: new Date().toISOString(),
      runtime: 'edge'
    }
  };
}

/**
 * Check if basic startup requirements are met
 */
export function isEdgeStartupReady(): boolean {
  return validateEnvironmentEdge().valid;
}
