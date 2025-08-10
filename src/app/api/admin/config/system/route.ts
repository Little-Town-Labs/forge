import { NextRequest } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isAdmin } from "@/utils/admin";
import { 
  verifyAuthentication, 
  createSuccessResponse, 
  createErrorResponse, 
  ErrorCodes, 
  HttpStatus 
} from "@/utils/apiResponse";
import { checkDatabaseHealth, getDatabaseStats, initializeSchema } from "@/lib/database";
import { testEncryption, validateEncryptionKey } from "@/lib/encryption";
import { writeAuditLog } from "@/lib/config-service";
import { 
  validateEnvironmentVariables, 
  getEnvironmentVariablesByCategory,
  getSecurityRecommendations 
} from "@/utils/env-validation";

// Define types for migration functions
interface MigrationStatus {
  currentVersion: number;
  availableMigrations: number;
  pendingMigrations: number;
  appliedMigrations: unknown[];
  integrityCheck: { isValid: boolean; errors: string[] };
  error?: string;
}

interface MigrationResult {
  success: boolean;
  migrationsApplied: number;
  backupId?: number;
}

// Conditional import for migration functions with graceful fallback
let getMigrationStatus: ((options?: unknown) => Promise<MigrationStatus>) | null = null;
let runMigrationsWithBackup: ((appliedBy: string) => Promise<MigrationResult>) | null = null;

try {
  // Use dynamic import instead of require
  import("@/lib/migration-runner").then((migrationModule) => {
    getMigrationStatus = migrationModule.getMigrationStatus;
    runMigrationsWithBackup = migrationModule.runMigrationsWithBackup;
  }).catch((importError) => {
    console.warn("Migration runner not available:", importError instanceof Error ? importError.message : "Unknown error");
    console.warn("Migration-related endpoints will return graceful error messages");
  });
} catch (importError) {
  console.warn("Migration runner not available:", importError instanceof Error ? importError.message : "Unknown error");
  console.warn("Migration-related endpoints will return graceful error messages");
}

/**
 * GET /api/admin/config/system - Get comprehensive system status
 * Provides detailed system configuration and health information
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

    // Run system health checks
    const [databaseHealth, databaseStats, encryptionTest, migrationStatus] = await Promise.all([
      checkDatabaseHealth(),
      getDatabaseStats().catch(() => ({ 
        health: { connected: false, responseTime: 0, error: 'Database stats unavailable' },
        tableStats: [],
        connectionInfo: { database: 'unknown', user: 'unknown', applicationName: 'forge-admin' }
      })),
      testEncryption(),
      // Gracefully handle migration status
      getMigrationStatus ? 
        getMigrationStatus().catch((error: unknown) => ({
          currentVersion: 0,
          availableMigrations: 0,
          pendingMigrations: 0,
          appliedMigrations: [],
          integrityCheck: { isValid: false, errors: [`Migration status error: ${error.message}`] },
          error: error instanceof Error ? error.message : 'Migration status unavailable'
        })) : 
        Promise.resolve({
          currentVersion: 0,
          availableMigrations: 0,
          pendingMigrations: 0,
          appliedMigrations: [],
          integrityCheck: { isValid: false, errors: ['Migration runner not available'] },
          error: 'Migration functionality not installed'
        })
    ]);

    // Comprehensive environment variable validation
    const envValidation = validateEnvironmentVariables();
    const envCategories = getEnvironmentVariablesByCategory();
    const securityRecommendations = getSecurityRecommendations();
    const encryptionValidation = validateEncryptionKey(process.env.CONFIG_ENCRYPTION_KEY || '');

    // Calculate comprehensive system health score
    const coreHealthChecks = [
      databaseHealth.connected,
      encryptionTest.success,
      encryptionValidation.isValid,
      envValidation.isValid
    ];
    
    const coreHealthScore = (coreHealthChecks.filter(Boolean).length / coreHealthChecks.length) * 100;
    
    // Factor in environment validation details
    const envHealthPenalty = Math.min(envValidation.summary.criticalErrors * 10, 50); // Max 50% penalty
    const envHealthScore = Math.max(0, coreHealthScore - envHealthPenalty);
    
    // Determine system status based on multiple factors
    let systemStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (envValidation.summary.criticalErrors > 0 || !databaseHealth.connected || !encryptionTest.success) {
      systemStatus = 'critical';
    } else if (envValidation.summary.warnings > 0 || envHealthScore < 80) {
      systemStatus = 'warning';
    }
    
    const healthScore = Math.round(envHealthScore);

    const systemInfo = {
      status: systemStatus,
      healthScore: Math.round(healthScore),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      
      database: {
        health: databaseHealth,
        stats: databaseStats,
        configured: databaseHealth.connected
      },
      
      encryption: {
        test: encryptionTest,
        validation: encryptionValidation,
        configured: encryptionValidation.isValid
      },
      
      environment: {
        validation: envValidation,
        categories: envCategories,
        summary: {
          totalVariables: Object.keys(envValidation.results).length,
          requiredConfigured: envValidation.summary.requiredPresent,
          requiredTotal: envValidation.summary.totalRequired,
          optionalConfigured: envValidation.summary.optionalPresent,
          optionalTotal: envValidation.summary.totalOptional,
          criticalErrors: envValidation.summary.criticalErrors,
          warnings: envValidation.summary.warnings,
          recommendations: envValidation.summary.recommendations
        },
        nodeEnv: process.env.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform
      },
      
      features: {
        databaseEnabled: databaseHealth.connected,
        encryptionEnabled: encryptionValidation.isValid && encryptionTest.success,
        pineconeEnabled: !!(envValidation.results.PINECONE_API_KEY?.present && envValidation.results.PINECONE_INDEX?.present),
        authEnabled: !!(envValidation.results.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.present && envValidation.results.CLERK_SECRET_KEY?.present),
        adminEnabled: !!envValidation.results.ADMIN_EMAILS?.present,
        openaiEnabled: !!envValidation.results.OPENAI_API_KEY?.present,
        demoMode: !(envValidation.results.PINECONE_API_KEY?.present && envValidation.results.PINECONE_INDEX?.present)
      },
      
      security: {
        adminCount: process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').filter(e => e.trim()).length : 0,
        usingDefaultAdmins: process.env.ADMIN_EMAILS === 'admin@company.com,manager@company.com',
        encryptionStrong: encryptionValidation.isValid && process.env.CONFIG_ENCRYPTION_KEY && process.env.CONFIG_ENCRYPTION_KEY.length >= 64,
        environmentSecure: envValidation.summary.criticalErrors === 0,
        hasWarnings: envValidation.summary.warnings > 0,
        recommendations: securityRecommendations,
        overallSecurity: envValidation.overallHealth
      },
      
      performance: {
        databaseResponseTime: databaseHealth.responseTime,
        encryptionResponseTime: encryptionTest.roundTripTime,
        memoryUsage: process.memoryUsage()
      },
      
      migrations: {
        available: getMigrationStatus !== null,
        status: migrationStatus,
        currentVersion: migrationStatus.currentVersion,
        pendingMigrations: migrationStatus.pendingMigrations,
        integrityValid: migrationStatus.integrityCheck?.isValid || false,
        error: migrationStatus.error
      }
    };

    // Log system status check
    await writeAuditLog(
      userEmail,
      'system_status_check',
      'system',
      undefined,
      undefined,
      { systemStatus, healthScore }
    );

    return createSuccessResponse(systemInfo);
  } catch (error) {
    console.error("System status check failed:", error);
    return createErrorResponse(
      "Failed to retrieve system status",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * POST /api/admin/config/system - Perform system maintenance operations
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
    const operation = body.operation;

    switch (operation) {
      case 'initialize_schema':
        try {
          await initializeSchema();
          await writeAuditLog(
            userEmail,
            'system_schema_init',
            'system',
            undefined,
            undefined,
            { operation: 'initialize_schema', success: true }
          );
          return createSuccessResponse({
            message: "Database schema initialization completed",
            operation
          });
        } catch (error) {
          await writeAuditLog(
            userEmail,
            'system_schema_init',
            'system',
            undefined,
            undefined,
            { operation: 'initialize_schema', success: false, error: error instanceof Error ? error.message : 'Unknown error' }
          );
          throw error;
        }

      case 'test_encryption':
        const encryptionTest = testEncryption();
        await writeAuditLog(
          userEmail,
          'system_test_encryption',
          'system',
          undefined,
          undefined,
          { operation: 'test_encryption', result: encryptionTest }
        );
        return createSuccessResponse({
          message: "Encryption test completed",
          operation,
          result: encryptionTest
        });

      case 'health_check':
        const [dbHealth, dbStats] = await Promise.all([
          checkDatabaseHealth(),
          getDatabaseStats().catch(() => null)
        ]);
        const healthResult = {
          database: dbHealth,
          stats: dbStats,
          timestamp: new Date().toISOString()
        };
        await writeAuditLog(
          userEmail,
          'system_health_check',
          'system',
          undefined,
          undefined,
          { operation: 'health_check', result: healthResult }
        );
        return createSuccessResponse({
          message: "System health check completed",
          operation,
          result: healthResult
        });

      case 'run_migrations':
        if (!runMigrationsWithBackup) {
          await writeAuditLog(
            userEmail,
            'system_run_migrations',
            'system',
            undefined,
            undefined,
            { operation: 'run_migrations', success: false, error: 'Migration runner not available' }
          );
          return createErrorResponse(
            "Migration functionality is not available. Please ensure the migration runner is properly installed and configured.",
            ErrorCodes.SERVICE_UNAVAILABLE,
            HttpStatus.SERVICE_UNAVAILABLE
          );
        }
        
        try {
          const migrationResult = await runMigrationsWithBackup(userEmail);
          await writeAuditLog(
            userEmail,
            'system_run_migrations',
            'system',
            undefined,
            undefined,
            { 
              operation: 'run_migrations', 
              result: {
                success: migrationResult.success,
                applied: migrationResult.migrationsApplied,
                backupId: migrationResult.backupId
              }
            }
          );
          return createSuccessResponse({
            message: migrationResult.success 
              ? `Migration completed - ${migrationResult.migrationsApplied} migrations applied`
              : "Migration failed",
            operation,
            result: migrationResult
          });
        } catch (error) {
          await writeAuditLog(
            userEmail,
            'system_run_migrations',
            'system',
            undefined,
            undefined,
            { operation: 'run_migrations', success: false, error: error instanceof Error ? error.message : 'Unknown error' }
          );
          throw error;
        }

      case 'migration_status':
        if (!getMigrationStatus) {
          await writeAuditLog(
            userEmail,
            'system_migration_status',
            'system',
            undefined,
            undefined,
            { operation: 'migration_status', success: false, error: 'Migration runner not available' }
          );
          return createErrorResponse(
            "Migration status functionality is not available. Please ensure the migration runner is properly installed and configured.",
            ErrorCodes.SERVICE_UNAVAILABLE,
            HttpStatus.SERVICE_UNAVAILABLE
          );
        }
        
        try {
          const migrationStatus = await getMigrationStatus();
          await writeAuditLog(
            userEmail,
            'system_migration_status',
            'system',
            undefined,
            undefined,
            { operation: 'migration_status', result: migrationStatus }
          );
          return createSuccessResponse({
            message: "Migration status retrieved",
            operation,
            result: migrationStatus
          });
        } catch (error) {
          await writeAuditLog(
            userEmail,
            'system_migration_status', 
            'system',
            undefined,
            undefined,
            { operation: 'migration_status', success: false, error: error instanceof Error ? error.message : 'Unknown error' }
          );
          throw error;
        }

      default:
        return createErrorResponse(
          `Unknown system operation: ${operation}`,
          ErrorCodes.INVALID_INPUT,
          HttpStatus.BAD_REQUEST
        );
    }
  } catch (error) {
    console.error("System operation failed:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "System operation failed",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}