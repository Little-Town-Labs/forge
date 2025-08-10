/**
 * Environment Variable Validation Utility
 * 
 * Provides comprehensive validation for environment variables with
 * detailed error messages, security checks, and configuration recommendations.
 */

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

interface EnvVarValidation {
  name: string;
  required: boolean;
  description: string;
  validator?: (value: string) => ValidationResult;
  sensitive?: boolean;
  category: 'database' | 'auth' | 'api' | 'encryption' | 'features';
}

/**
 * Validate URL format
 */
function validateUrl(url: string, allowedProtocols: string[] = ['http', 'https']): ValidationResult {
  const result: ValidationResult = { isValid: true, errors: [], warnings: [], recommendations: [] };
  
  try {
    const parsed = new URL(url);
    
    if (!allowedProtocols.includes(parsed.protocol.replace(':', ''))) {
      result.isValid = false;
      result.errors.push(`Protocol must be one of: ${allowedProtocols.join(', ')}`);
    }
    
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      result.warnings.push('Using localhost - ensure this is correct for production');
    }
    
    if (parsed.protocol === 'http:' && parsed.hostname !== 'localhost') {
      result.warnings.push('Using HTTP instead of HTTPS may be insecure');
    }
  } catch {
    result.isValid = false;
    result.errors.push('Invalid URL format');
  }
  
  return result;
}

/**
 * Validate email format
 */
function validateEmail(email: string): ValidationResult {
  const result: ValidationResult = { isValid: true, errors: [], warnings: [], recommendations: [] };
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailPattern.test(email)) {
    result.isValid = false;
    result.errors.push('Invalid email format');
  }
  
  if (email.includes('example.com') || email.includes('test.com') || email.includes('localhost')) {
    result.warnings.push('Using test/example email - update for production');
  }
  
  return result;
}

/**
 * Validate encryption key strength
 */
function validateEncryptionKey(key: string): ValidationResult {
  const result: ValidationResult = { isValid: true, errors: [], warnings: [], recommendations: [] };
  
  if (key.length < 32) {
    result.isValid = false;
    result.errors.push('Encryption key must be at least 32 characters long');
  }
  
  if (key.length < 64) {
    result.warnings.push('Consider using a longer encryption key (64+ characters) for better security');
  }
  
  // Check for common weak patterns
  if (/^(.)\1+$/.test(key)) {
    result.isValid = false;
    result.errors.push('Encryption key cannot be repeating characters');
  }
  
  if (key.includes('password') || key.includes('secret') || key.includes('key')) {
    result.warnings.push('Avoid using common words in encryption keys');
  }
  
  // Check for sufficient entropy (basic check)
  const uniqueChars = new Set(key).size;
  if (uniqueChars < 10) {
    result.warnings.push('Encryption key should have more character variety for better entropy');
  }
  
  return result;
}

/**
 * Validate API key format
 */
function validateApiKey(key: string, provider: string): ValidationResult {
  const result: ValidationResult = { isValid: true, errors: [], warnings: [], recommendations: [] };
  
  // Provider-specific validation
  switch (provider.toLowerCase()) {
    case 'openai':
      if (!key.startsWith('sk-')) {
        result.warnings.push('OpenAI API keys typically start with "sk-"');
      }
      if (key.length < 20) {
        result.isValid = false;
        result.errors.push('OpenAI API key appears too short');
      }
      break;
      
    case 'pinecone':
      if (key.length < 20) {
        result.warnings.push('Pinecone API key appears unusually short');
      }
      break;
      
    case 'clerk':
      if (key.startsWith('sk_test_')) {
        result.warnings.push('Using Clerk test key - ensure this is correct for your environment');
      } else if (key.startsWith('sk_live_')) {
        result.recommendations.push('Using Clerk live key - ensure proper security measures');
      }
      break;
  }
  
  // General validations
  if (key.includes(' ')) {
    result.isValid = false;
    result.errors.push('API key should not contain spaces');
  }
  
  if (key === 'your_api_key_here' || key === 'sk-xxx' || key === 'test') {
    result.isValid = false;
    result.errors.push('Replace placeholder API key with actual key');
  }
  
  return result;
}

/**
 * Define all environment variables with validation rules
 */
export const ENV_VAR_DEFINITIONS: EnvVarValidation[] = [
  // Database Configuration
  {
    name: 'POSTGRES_URL',
    required: true,
    description: 'Main PostgreSQL connection string',
    category: 'database',
    validator: (value) => validateUrl(value, ['postgresql', 'postgres'])
  },
  {
    name: 'POSTGRES_PRISMA_URL', 
    required: false,
    description: 'Prisma-optimized PostgreSQL connection string',
    category: 'database',
    validator: (value) => validateUrl(value, ['postgresql', 'postgres'])
  },
  {
    name: 'POSTGRES_URL_NON_POOLING',
    required: false,
    description: 'Non-pooling PostgreSQL connection for migrations',
    category: 'database',
    validator: (value) => validateUrl(value, ['postgresql', 'postgres'])
  },
  
  // Authentication
  {
    name: 'CLERK_SECRET_KEY',
    required: true,
    description: 'Clerk authentication secret key',
    category: 'auth',
    sensitive: true,
    validator: (value) => validateApiKey(value, 'clerk')
  },
  {
    name: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    required: true,
    description: 'Clerk publishable key for client-side authentication',
    category: 'auth',
    validator: (value) => {
      const result: ValidationResult = { isValid: true, errors: [], warnings: [], recommendations: [] };
      if (!value.startsWith('pk_')) {
        result.warnings.push('Clerk publishable keys typically start with "pk_"');
      }
      return result;
    }
  },
  
  // API Keys
  {
    name: 'OPENAI_API_KEY',
    required: true,
    description: 'OpenAI API key for language model access',
    category: 'api',
    sensitive: true,
    validator: (value) => validateApiKey(value, 'openai')
  },
  {
    name: 'PINECONE_API_KEY',
    required: false,
    description: 'Pinecone API key for vector database (optional for demo mode)',
    category: 'api',
    sensitive: true,
    validator: (value) => validateApiKey(value, 'pinecone')
  },
  
  // Configuration
  {
    name: 'PINECONE_INDEX',
    required: false,
    description: 'Pinecone index name (optional for demo mode)',
    category: 'features',
    validator: (value) => {
      const result: ValidationResult = { isValid: true, errors: [], warnings: [], recommendations: [] };
      if (!/^[a-z0-9-]+$/.test(value)) {
        result.isValid = false;
        result.errors.push('Pinecone index name must contain only lowercase letters, numbers, and hyphens');
      }
      if (value.length > 45) {
        result.isValid = false;
        result.errors.push('Pinecone index name must be 45 characters or less');
      }
      return result;
    }
  },
  
  // Security
  {
    name: 'CONFIG_ENCRYPTION_KEY',
    required: true,
    description: 'Encryption key for sensitive configuration data',
    category: 'encryption',
    sensitive: true,
    validator: validateEncryptionKey
  },
  
  // Admin Configuration
  {
    name: 'ADMIN_EMAILS',
    required: true,
    description: 'Comma-separated list of admin email addresses',
    category: 'auth',
    validator: (value) => {
      const result: ValidationResult = { isValid: true, errors: [], warnings: [], recommendations: [] };
      const emails = value.split(',').map(e => e.trim()).filter(e => e);
      
      if (emails.length === 0) {
        result.isValid = false;
        result.errors.push('At least one admin email is required');
        return result;
      }
      
      for (const email of emails) {
        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) {
          result.isValid = false;
          result.errors.push(`Invalid admin email: ${email}`);
        }
        result.warnings.push(...emailValidation.warnings);
      }
      
      if (value === 'admin@company.com,manager@company.com') {
        result.warnings.push('Using default admin emails - update for production');
      }
      
      if (emails.length === 1) {
        result.recommendations.push('Consider adding multiple admin emails for redundancy');
      }
      
      return result;
    }
  }
];

/**
 * Comprehensive environment variable validation
 */
interface EnvValidationResult {
  present: boolean;
  required: boolean;
  validation?: ValidationResult;
  category: string;
  description: string;
}

export function validateEnvironmentVariables(): {
  isValid: boolean;
  results: Record<string, EnvValidationResult>;
  summary: {
    totalRequired: number;
    requiredPresent: number;
    totalOptional: number;
    optionalPresent: number;
    criticalErrors: number;
    warnings: number;
    recommendations: number;
  };
  overallHealth: 'healthy' | 'warning' | 'critical';
} {
  const results: Record<string, EnvValidationResult> = {};
  let criticalErrors = 0;
  let warnings = 0;
  let recommendations = 0;
  let requiredPresent = 0;
  let optionalPresent = 0;
  
  for (const envVar of ENV_VAR_DEFINITIONS) {
    const value = process.env[envVar.name];
    const present = !!value;
    
    const result = {
      present,
      required: envVar.required,
      category: envVar.category,
      description: envVar.description
    };
    
    if (envVar.required && present) requiredPresent++;
    if (!envVar.required && present) optionalPresent++;
    
    if (present && envVar.validator) {
      const validation = envVar.validator(value);
      result.validation = validation;
      
      if (!validation.isValid) {
        criticalErrors += validation.errors.length;
        if (envVar.required) {
          criticalErrors++; // Extra penalty for required vars with errors
        }
      }
      
      warnings += validation.warnings.length;
      recommendations += validation.recommendations.length;
    } else if (envVar.required && !present) {
      criticalErrors++;
      result.validation = {
        isValid: false,
        errors: ['Required environment variable is missing'],
        warnings: [],
        recommendations: []
      };
    }
    
    results[envVar.name] = result;
  }
  
  const requiredVars = ENV_VAR_DEFINITIONS.filter(v => v.required).length;
  const optionalVars = ENV_VAR_DEFINITIONS.filter(v => !v.required).length;
  
  // Calculate overall health
  let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
  
  if (criticalErrors > 0 || requiredPresent < requiredVars) {
    overallHealth = 'critical';
  } else if (warnings > 0 || requiredPresent < requiredVars * 0.8) {
    overallHealth = 'warning';
  }
  
  return {
    isValid: criticalErrors === 0 && requiredPresent === requiredVars,
    results,
    summary: {
      totalRequired: requiredVars,
      requiredPresent,
      totalOptional: optionalVars,
      optionalPresent,
      criticalErrors,
      warnings,
      recommendations
    },
    overallHealth
  };
}

/**
 * Get environment variables grouped by category
 */
export function getEnvironmentVariablesByCategory() {
  const categories: Record<string, EnvVarValidation[]> = {};
  
  for (const envVar of ENV_VAR_DEFINITIONS) {
    if (!categories[envVar.category]) {
      categories[envVar.category] = [];
    }
    categories[envVar.category].push(envVar);
  }
  
  return categories;
}

/**
 * Get security recommendations based on current configuration
 */
export function getSecurityRecommendations(): string[] {
  const recommendations: string[] = [];
  const validation = validateEnvironmentVariables();
  
  // Check for test/development configurations in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.CLERK_SECRET_KEY?.includes('test')) {
      recommendations.push('Update Clerk to use production keys in production environment');
    }
    
    if (process.env.POSTGRES_URL?.includes('localhost')) {
      recommendations.push('Use a production database instead of localhost in production');
    }
    
    const adminEmails = process.env.ADMIN_EMAILS || '';
    if (adminEmails.includes('example.com') || adminEmails.includes('test.com')) {
      recommendations.push('Update admin emails from test/example addresses');
    }
  }
  
  // Check for missing optional but recommended variables
  if (!process.env.PINECONE_API_KEY && !process.env.PINECONE_INDEX) {
    recommendations.push('Consider configuring Pinecone for enhanced search capabilities');
  } else if (process.env.PINECONE_API_KEY && !process.env.PINECONE_INDEX) {
    recommendations.push('PINECONE_API_KEY is set but PINECONE_INDEX is missing');
  } else if (!process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX) {
    recommendations.push('PINECONE_INDEX is set but PINECONE_API_KEY is missing');
  }
  
  // Security strength recommendations
  if (validation.summary.warnings > 0) {
    recommendations.push(`Address ${validation.summary.warnings} configuration warnings to improve security`);
  }
  
  return recommendations;
}