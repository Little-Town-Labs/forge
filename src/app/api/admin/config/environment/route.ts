import { NextRequest } from "next/server";

export const runtime = 'nodejs';
import { currentUser } from "@clerk/nextjs/server";
import { isAdmin } from "@/utils/admin";
import { 
  verifyAuthentication, 
  createSuccessResponse, 
  createErrorResponse, 
  ErrorCodes, 
  HttpStatus 
} from "@/utils/apiResponse";
import { 
  validateEnvironmentVariables, 
  getEnvironmentVariablesByCategory,
  getSecurityRecommendations,
  ENV_VAR_DEFINITIONS,
  type ValidationResult
} from "@/utils/env-validation";
import { writeAuditLog } from "@/lib/config-service";

/**
 * GET /api/admin/config/environment - Get detailed environment variable validation
 * Provides comprehensive validation results, recommendations, and security analysis
 */
export async function GET() {
  try {
    const authResult = await verifyAuthentication();
    if (!authResult.success) {
      return authResult.response!;
    }
    
    const user = await currentUser();
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      return createErrorResponse("Unable to verify user email", ErrorCodes.INVALID_USER, HttpStatus.BAD_REQUEST);
    }

    const userEmail = user.emailAddresses[0].emailAddress;
    if (!isAdmin(userEmail)) {
      return createErrorResponse("Admin privileges required", ErrorCodes.FORBIDDEN, HttpStatus.FORBIDDEN);
    }

    console.log(`[ENV VALIDATION] 🔍 Performing comprehensive environment validation for admin: ${userEmail}`);

    // Perform comprehensive validation
    const envValidation = validateEnvironmentVariables();
    const envCategories = getEnvironmentVariablesByCategory();
    const securityRecommendations = getSecurityRecommendations();

    // Build detailed report
    const validationReport = {
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      overallStatus: envValidation.overallHealth,
      isValid: envValidation.isValid,
      
      summary: {
        totalVariables: Object.keys(envValidation.results).length,
        requiredVariables: envValidation.summary.totalRequired,
        requiredConfigured: envValidation.summary.requiredPresent,
        requiredMissing: envValidation.summary.totalRequired - envValidation.summary.requiredPresent,
        optionalVariables: envValidation.summary.totalOptional,
        optionalConfigured: envValidation.summary.optionalPresent,
        criticalErrors: envValidation.summary.criticalErrors,
        warnings: envValidation.summary.warnings,
        recommendations: envValidation.summary.recommendations,
        configurationCompleteness: Math.round(
          ((envValidation.summary.requiredPresent + envValidation.summary.optionalPresent) / 
           (envValidation.summary.totalRequired + envValidation.summary.totalOptional)) * 100
        )
      },
      
      categories: Object.keys(envCategories).map(category => {
        const vars = envCategories[category];
        const categoryResults = vars.map(v => {
          const result = envValidation.results[v.name];
          return {
            name: v.name,
            present: result.present,
            required: result.required,
            category: result.category,
            description: result.description,
            validation: result.validation
          };
        });
        
        const configured = categoryResults.filter(r => r.present).length;
        const required = vars.filter(v => v.required).length;
        
        return {
          name: category,
          description: getCategoryDescription(category),
          totalVariables: vars.length,
          requiredVariables: required,
          configuredVariables: configured,
          healthStatus: getCategoryHealth(categoryResults),
          variables: categoryResults.map(result => ({
            name: result.name,
            present: result.present,
            required: result.required,
            category: result.category,
            description: result.description,
            validation: result.validation ? {
              isValid: result.validation.isValid,
              errors: result.validation.errors,
              warnings: result.validation.warnings,
              recommendations: result.validation.recommendations
            } : undefined
          }))
        };
      }),
      
      security: {
        recommendations: securityRecommendations,
        overallSecurity: envValidation.overallHealth,
        criticalIssues: getCriticalSecurityIssues(envValidation),
        productionReadiness: getProductionReadinessChecks(),
        sensitiveVariablesStatus: getSensitiveVariablesStatus(envValidation)
      },
      
      actionItems: generateActionItems(envValidation, securityRecommendations)
    };

    // Log the validation request
    await writeAuditLog(
      userEmail,
      'environment_validation',
      'system',
      undefined,
      undefined,
      { 
        validationSummary: validationReport.summary,
        securityStatus: validationReport.security.overallSecurity 
      }
    );

    console.log(`[ENV VALIDATION] ✅ Validation completed`, {
      status: validationReport.overallStatus,
      errors: validationReport.summary.criticalErrors,
      warnings: validationReport.summary.warnings,
      completeness: validationReport.summary.configurationCompleteness
    });

    return createSuccessResponse(validationReport);
  } catch (error) {
    console.error(`[ENV VALIDATION] ❌ Environment validation failed:`, error);
    return createErrorResponse(
      "Failed to validate environment configuration",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * POST /api/admin/config/environment - Validate specific environment variables or perform actions
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthentication();
    if (!authResult.success) {
      return authResult.response!;
    }
    
    const user = await currentUser();
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      return createErrorResponse("Unable to verify user email", ErrorCodes.INVALID_USER, HttpStatus.BAD_REQUEST);
    }

    const userEmail = user.emailAddresses[0].emailAddress;
    if (!isAdmin(userEmail)) {
      return createErrorResponse("Admin privileges required", ErrorCodes.FORBIDDEN, HttpStatus.FORBIDDEN);
    }

    const body = await request.json();
    const action = body.action;

    switch (action) {
      case 'validate_variable':
        if (!body.variableName) {
          return createErrorResponse(
            "Variable name is required",
            ErrorCodes.INVALID_INPUT,
            HttpStatus.BAD_REQUEST
          );
        }
        
        const varDef = ENV_VAR_DEFINITIONS.find(v => v.name === body.variableName);
        if (!varDef) {
          return createErrorResponse(
            `Unknown environment variable: ${body.variableName}`,
            ErrorCodes.INVALID_INPUT,
            HttpStatus.BAD_REQUEST
          );
        }
        
        const value = process.env[body.variableName];
        let validation: ValidationResult = { 
          isValid: true, 
          errors: [], 
          warnings: [], 
          recommendations: [] 
        };
        
        if (value && varDef.validator) {
          validation = varDef.validator(value);
        } else if (!value && varDef.required) {
          validation = {
            isValid: false,
            errors: ['Required environment variable is missing'],
            warnings: [],
            recommendations: ['Set this variable in your environment configuration']
          };
        }
        
        await writeAuditLog(
          userEmail,
          'single_env_validation',
          'system',
          body.variableName,
          undefined,
          { variableName: body.variableName, validation }
        );
        
        return createSuccessResponse({
          variableName: body.variableName,
          present: !!value,
          required: varDef.required,
          validation,
          definition: {
            description: varDef.description,
            category: varDef.category,
            sensitive: varDef.sensitive
          }
        });
        
      case 'get_recommendations':
        const recommendations = getSecurityRecommendations();
        const envValidation = validateEnvironmentVariables();
        
        return createSuccessResponse({
          recommendations,
          priority: envValidation.overallHealth,
          actionItems: generateActionItems(envValidation, recommendations)
        });
        
      default:
        return createErrorResponse(
          `Unknown action: ${action}`,
          ErrorCodes.INVALID_INPUT,
          HttpStatus.BAD_REQUEST
        );
    }
  } catch (error) {
    console.error("Environment validation action failed:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Environment validation action failed",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

// Helper functions

function getCategoryDescription(category: string): string {
  const descriptions = {
    database: 'Database connection and configuration settings',
    auth: 'Authentication and authorization settings',
    api: 'External API keys and service configurations',
    encryption: 'Security and encryption configuration',
    features: 'Optional feature configurations'
  };
  return descriptions[category as keyof typeof descriptions] || 'Configuration settings';
}

interface CategoryResult {
  present: boolean;
  required: boolean;
  validation?: {
    errors: string[];
    warnings: string[];
  };
}

function getCategoryHealth(results: CategoryResult[]): 'healthy' | 'warning' | 'critical' {
  const errors = results.reduce((sum, r) => sum + (r.validation?.errors?.length || 0), 0);
  const warnings = results.reduce((sum, r) => sum + (r.validation?.warnings?.length || 0), 0);
  const requiredMissing = results.filter(r => r.required && !r.present).length;
  
  if (errors > 0 || requiredMissing > 0) return 'critical';
  if (warnings > 0) return 'warning';
  return 'healthy';
}

interface ValidationResults {
  results: Record<string, {
    required: boolean;
    present: boolean;
    category: string;
    description: string;
    validation?: {
      isValid: boolean;
      errors: string[];
    };
  }>;
}

function getCriticalSecurityIssues(validation: ValidationResults): string[] {
  const issues: string[] = [];
  
  for (const [varName, result] of Object.entries(validation.results)) {
    if (result.required && !result.present) {
      issues.push(`Required variable ${varName} is missing`);
    }
    
    if (result.validation && !result.validation.isValid) {
      result.validation.errors.forEach((error: string) => {
        issues.push(`${varName}: ${error}`);
      });
    }
  }
  
  return issues;
}

function getProductionReadinessChecks(): {
  ready: boolean;
  checks: Array<{ name: string; status: boolean; message: string }>;
} {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const checks = [
    {
      name: 'Environment Mode',
      status: process.env.NODE_ENV === 'production',
      message: isProduction ? 'Running in production mode' : 'Not in production mode'
    },
    {
      name: 'Admin Emails Configured',
      status: !!(process.env.ADMIN_EMAILS && !process.env.ADMIN_EMAILS.includes('example.com')),
      message: process.env.ADMIN_EMAILS?.includes('example.com') ? 
        'Using example admin emails' : 'Admin emails properly configured'
    },
    {
      name: 'Production Database',
      status: !!(process.env.POSTGRES_URL && !process.env.POSTGRES_URL.includes('localhost')),
      message: process.env.POSTGRES_URL?.includes('localhost') ? 
        'Using localhost database' : 'Production database configured'
    },
    {
      name: 'Strong Encryption',
      status: !!(process.env.CONFIG_ENCRYPTION_KEY && process.env.CONFIG_ENCRYPTION_KEY.length >= 64),
      message: process.env.CONFIG_ENCRYPTION_KEY && process.env.CONFIG_ENCRYPTION_KEY.length >= 64 ?
        'Strong encryption key configured' : 'Encryption key could be stronger'
    },
    {
      name: 'Production Authentication',
      status: !!(process.env.CLERK_SECRET_KEY && !process.env.CLERK_SECRET_KEY.includes('test')),
      message: process.env.CLERK_SECRET_KEY?.includes('test') ?
        'Using test authentication keys' : 'Production authentication configured'
    }
  ];
  
  return {
    ready: checks.every(check => check.status),
    checks
  };
}

function getSensitiveVariablesStatus(validation: ValidationResults): {
  total: number;
  configured: number;
  secure: number;
  issues: string[];
} {
  const sensitiveVars = ENV_VAR_DEFINITIONS.filter(v => v.sensitive);
  const issues: string[] = [];
  
  let configured = 0;
  let secure = 0;
  
  for (const varDef of sensitiveVars) {
    const result = validation.results[varDef.name];
    
    if (result.present) {
      configured++;
      
      if (result.validation?.isValid) {
        secure++;
      } else if (result.validation) {
        result.validation.errors.forEach((error: string) => {
          issues.push(`${varDef.name}: ${error}`);
        });
      }
    } else if (varDef.required) {
      issues.push(`Required sensitive variable ${varDef.name} is missing`);
    }
  }
  
  return {
    total: sensitiveVars.length,
    configured,
    secure,
    issues
  };
}

function generateActionItems(validation: ValidationResults, recommendations: string[]): Array<{
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  action: string;
}> {
  const items: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    title: string;
    description: string;
    action: string;
  }> = [];
  
  // Critical errors get high priority
  for (const [varName, result] of Object.entries(validation.results)) {
    if (result.required && !result.present) {
      items.push({
        priority: 'high',
        category: result.category,
        title: `Configure ${varName}`,
        description: `Required environment variable ${varName} is missing`,
        action: `Set ${varName} in your environment configuration`
      });
    }
    
    if (result.validation && !result.validation.isValid) {
      result.validation.errors.forEach((error: string) => {
        items.push({
          priority: 'high',
          category: result.category,
          title: `Fix ${varName} configuration`,
          description: error,
          action: 'Update the environment variable value to resolve this issue'
        });
      });
    }
  }
  
  // Security recommendations get medium priority
  recommendations.forEach(rec => {
    items.push({
      priority: 'medium',
      category: 'security',
      title: 'Security Recommendation',
      description: rec,
      action: 'Review and implement this security recommendation'
    });
  });
  
  return items.slice(0, 20); // Limit to top 20 items
}