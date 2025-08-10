# Database Validation System

This document describes the comprehensive database validation system implemented for the Forge application. The system provides startup validation, graceful degradation, and clear error messages when database components are not properly configured.

## Overview

The database validation system consists of three main components:

1. **Database Validation** (`src/lib/database.ts`) - Core database connectivity and schema validation
2. **Startup Validation** (`src/utils/startup.ts`) - Application startup validation orchestration
3. **Graceful Degradation** (`src/utils/degradation.ts`) - Degradation mode management and utilities

## Features

### ✅ Database Connectivity Validation
- Tests database connection health
- Measures response times
- Handles connection failures gracefully
- Supports multiple connection string formats

### ✅ Database Schema Validation
- Validates presence of required tables
- Checks for required indexes
- Verifies database triggers exist
- Comprehensive schema completeness checking

### ✅ Data Integrity Validation
- Checks for default AI model configurations
- Validates essential seed data
- Counts records in critical tables
- Ensures functional baseline data exists

### ✅ Graceful Degradation Modes
- **None** - Full functionality (all components working)
- **Demo** - Limited functionality with hardcoded demo data
- **Readonly** - Database access available but modifications restricted
- **Disabled** - Critical components unavailable

### ✅ Clear Error Messages & Setup Instructions
- Contextual error messages for different failure scenarios
- Step-by-step setup instructions for database configuration
- Helpful command suggestions for resolving issues
- User-friendly explanations of application state

### ✅ Integration Ready
- Next.js middleware integration
- API route protection based on degradation mode
- Health check endpoints
- Runtime degradation monitoring

## Usage

### Basic Startup Validation

```typescript
import { runStartupValidation } from './src/utils/startup';

const result = await runStartupValidation({
  exitOnError: false,
  allowDegradedMode: true,
  skipDatabaseValidation: false
});

console.log(`Application mode: ${result.degradationMode}`);
```

### Health Check Implementation

```typescript
import { getValidationStatus } from './src/utils/startup';

export async function GET() {
  const health = await getValidationStatus();
  return Response.json(health, {
    status: health.isHealthy ? 200 : 503
  });
}
```

### API Route Protection

```typescript
import { withDegradationHandling } from './src/app/startup-validation-example';

const chatHandler = async (req: Request) => {
  // Chat logic here
  return Response.json({ message: 'Chat response' });
};

export const POST = withDegradationHandling(chatHandler, 'chat');
```

### Degradation Mode Detection

```typescript
import { globalDegradationDetector } from './src/utils/degradation';

// Check current mode
const mode = globalDegradationDetector.getCurrentMode();

// Listen for mode changes
const unsubscribe = globalDegradationDetector.onModeChange((newMode) => {
  console.log(`Mode changed to: ${newMode}`);
});
```

## Validation Components

### Database Validation (`validateDatabase`)

Performs comprehensive database validation including:

- **Connectivity Check**: Tests database connection and response time
- **Schema Validation**: Verifies all required tables, indexes, and triggers exist
- **Data Validation**: Checks for essential data like default AI models
- **Degradation Assessment**: Determines appropriate degradation mode

### Startup Validation (`runStartupValidation`)

Orchestrates all startup validations:

- Environment variable validation
- Admin configuration validation
- Rate limiting configuration validation
- Database validation (optional)
- Overall application state assessment

### Application State Management

The system provides clear application states based on validation results:

```typescript
interface ApplicationState {
  mode: DegradationMode;
  features: {
    chat: boolean;
    adminConfig: boolean;
    ragCrawling: boolean;
    userManagement: boolean;
    auditLogs: boolean;
  };
  limitations: string[];
  recommendations: string[];
}
```

## Database Requirements

### Required Tables
- `ai_model_config` - AI model configurations
- `rag_urls` - RAG URL configurations  
- `config_audit` - Configuration audit log

### Required Indexes
- `idx_ai_model_provider_name` - Model provider/name lookup
- `idx_one_default_per_provider` - Unique default per provider constraint
- `idx_rag_urls_namespace` - RAG URL namespace lookup
- `idx_config_audit_admin_email` - Audit log admin email lookup
- `idx_config_audit_created_at` - Audit log timestamp lookup

### Required Triggers
- `update_ai_model_config_updated_at` - Auto-update model config timestamps
- `update_rag_urls_updated_at` - Auto-update RAG URL timestamps

## Degradation Modes

### None Mode (Full Operation)
- ✅ All features available
- ✅ Database fully configured
- ✅ Complete functionality

### Demo Mode (Limited Functionality)
- ✅ Chat works with hardcoded demo context
- ✅ User management available
- ❌ Admin configuration disabled
- ❌ RAG crawling unavailable
- ❌ Audit logging disabled

**Use Case**: Database not configured or connection failed

### Readonly Mode (Partial Functionality)
- ✅ Chat functionality available
- ✅ Admin configuration available (read-only)
- ✅ User management available
- ✅ Audit logging available
- ❌ RAG crawling disabled
- ❌ Configuration modifications limited

**Use Case**: Database connected but schema incomplete

### Disabled Mode (Service Unavailable)
- ❌ All major features disabled
- ❌ Chat functionality unavailable
- ❌ Admin configuration inaccessible
- ❌ User management disabled

**Use Case**: Critical database or configuration errors

## Setup Instructions

### 1. Database Setup

Run the automated database setup:

```bash
npm run setup-db
```

This will:
- Create all required tables
- Add necessary indexes and triggers
- Insert default seed data
- Verify setup completion

### 2. Environment Configuration

Ensure these environment variables are set:

```env
# Database connection (required)
POSTGRES_URL=postgresql://username:password@hostname:port/database

# AI API keys (required)
OPENAI_API_KEY=your_openai_api_key

# Authentication (required)  
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret

# Optional - RAG functionality
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX=your_pinecone_index

# Optional - Google AI
GOOGLE_AI_API_KEY=your_google_key
```

### 3. Validation Testing

Test the validation system:

```bash
npm run validate-db-system
```

### 4. Model Consistency Check

Verify model configurations are consistent:

```bash
npm run verify-models
```

## Error Scenarios & Solutions

### "Database Connection Failed"
**Problem**: Cannot connect to database
**Solution**: 
- Verify `POSTGRES_URL` environment variable
- Check database server availability
- Confirm network connectivity

**Commands**:
```bash
npm run test-setup  # Test database connectivity
```

### "Missing Required Tables"
**Problem**: Database connected but schema not created
**Solution**:
- Run database setup script
- Verify schema creation completed successfully

**Commands**:
```bash
npm run setup-db
npm run verify-models
```

### "No Default AI Models Configured"
**Problem**: Database has tables but missing seed data
**Solution**:
- Re-run database setup to insert seed data
- Manually configure default models via admin interface

### "Partial Database Configuration"
**Problem**: Some tables/indexes missing
**Solution**:
- Review database setup logs for errors
- Run setup script again
- Check database permissions

## Monitoring & Health Checks

### Health Check Endpoint

The system provides a health check endpoint that returns:

```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "details": {
    "mode": "none",
    "features": {
      "chat": true,
      "adminConfig": true,
      "ragCrawling": true,
      "userManagement": true,
      "auditLogs": true
    },
    "database": {
      "connected": true,
      "responseTime": 45
    }
  }
}
```

### Runtime Monitoring

The system can monitor degradation mode changes:

```typescript
import { startDegradationMonitoring } from './src/app/startup-validation-example';

// Start monitoring (checks every 5 minutes)
const stopMonitoring = startDegradationMonitoring();

// Stop monitoring when needed
stopMonitoring();
```

## Development & Testing

### File Structure

```
src/
├── lib/
│   ├── database.ts              # Core database validation
│   └── config-service.ts        # Database operations
├── utils/
│   ├── startup.ts              # Startup validation orchestration
│   └── degradation.ts          # Degradation mode utilities
├── app/
│   └── startup-validation-example.ts  # Integration examples
└── scripts/
    ├── setup-database.js       # Database setup automation
    ├── validate-db-system.js   # Validation system testing
    └── verify-model-consistency.js  # Model consistency checking
```

### Testing

```bash
# Validate system implementation
npm run validate-db-system

# Test database setup
npm run test-setup

# Verify model consistency
npm run verify-models
```

## Best Practices

### 1. Environment-Specific Configuration

```typescript
const validationConfig = {
  exitOnError: process.env.NODE_ENV === 'production',
  allowDegradedMode: process.env.NODE_ENV !== 'production',
  skipDatabaseValidation: process.env.SKIP_DB_VALIDATION === 'true'
};
```

### 2. Graceful Error Handling

Always handle validation failures gracefully:

```typescript
try {
  const result = await runStartupValidation(config);
  if (!result.success) {
    console.warn(`Starting in ${result.degradationMode} mode`);
  }
} catch (error) {
  console.error('Validation failed:', error);
  // Fall back to disabled mode
}
```

### 3. Feature Availability Checks

Check feature availability before using functionality:

```typescript
if (globalDegradationDetector.isFeatureEnabled('adminConfig')) {
  // Admin configuration is available
} else {
  // Show appropriate message or redirect
}
```

### 4. Progressive Enhancement

Design features to work across degradation modes:

```typescript
// Chat works in both full and demo mode
const getContext = async () => {
  const mode = globalDegradationDetector.getCurrentMode();
  
  if (mode === 'demo') {
    return databaseFallbacks.getDemoContext();
  }
  
  try {
    return await getContextFromDatabase();
  } catch (error) {
    // Fall back to demo context
    return databaseFallbacks.getDemoContext();
  }
};
```

## Integration Examples

See `src/app/startup-validation-example.ts` for comprehensive integration examples including:

- Application initialization
- Health check implementation
- API middleware integration
- Runtime monitoring setup
- Environment-based configuration

## Troubleshooting

### Common Issues

1. **Module Import Errors**: Ensure proper TypeScript configuration
2. **Environment Variable Issues**: Check `.env.local` file encoding
3. **Database Permission Errors**: Verify database user permissions
4. **Connection Timeout**: Check network connectivity and firewall settings

### Debug Mode

For additional debugging information:

```bash
DEBUG=* npm run validate-db-system
```

### Log Analysis

The system provides detailed logging for:
- Database connection attempts
- Schema validation results
- Degradation mode changes
- Error conditions and recovery

This comprehensive system ensures your Forge application can start reliably under various conditions and provides clear guidance when issues occur.