# Database Setup Scripts

This directory contains scripts for setting up and managing the Forge application database.

## Setup Database Script

The `setup-database.js` script automates the complete database setup process for the Forge admin configuration system.

### Features

- **Automated Setup**: Creates tables, indexes, triggers, and inserts seed data
- **Error Handling**: Comprehensive error handling with transaction rollback
- **Verification**: Validates successful setup with detailed checks
- **Colorized Output**: Easy-to-read console output with status indicators
- **Connection Fallbacks**: Supports multiple Vercel Postgres connection string formats
- **Detailed Logging**: Tracks creation of tables, indexes, triggers, and data insertion

### Prerequisites

1. **Vercel Postgres Database**: Set up a Vercel Postgres database
2. **Environment Variables**: Configure database connection strings
3. **Node.js Dependencies**: Install required packages

### Environment Variables

Set one of the following environment variables with your Vercel Postgres connection string:

```bash
# Primary connection string (recommended)
export POSTGRES_URL="postgresql://username:password@hostname:port/database"

# Alternative connection strings (fallbacks)
export POSTGRES_PRISMA_URL="postgresql://username:password@hostname:port/database"
export POSTGRES_URL_NON_POOLING="postgresql://username:password@hostname:port/database"
export DATABASE_URL="postgresql://username:password@hostname:port/database"
```

### Usage

#### Method 1: Using npm scripts (recommended)
```bash
npm run setup-db
# or
npm run db:setup
```

#### Method 2: Direct execution
```bash
node scripts/setup-database.js
```

### What the Script Does

1. **Connection**: Establishes secure connection to Vercel Postgres
2. **Schema Creation**: Creates all required tables with proper constraints
   - `ai_model_config` - AI model configurations
   - `rag_urls` - RAG URL configurations  
   - `config_audit` - Configuration audit log
3. **Index Creation**: Creates performance-optimized indexes
4. **Trigger Setup**: Sets up auto-updating timestamp triggers
5. **Seed Data**: Inserts default AI model configurations
6. **Verification**: Validates all components were created successfully

### Expected Output

```
🚀 Starting Forge Database Setup
----------------------------------------
[12:34:56] ℹ️  Connecting to PostgreSQL database...
[12:34:56] ✅ Connected to PostgreSQL database
[12:34:56] ℹ️  Database: forge_db
[12:34:56] ℹ️  User: your_username
[12:34:56] ℹ️  Version: PostgreSQL 14.9
[12:34:57] ℹ️  Reading SQL file: /path/to/sql/schema.sql
[12:34:57] ✅ Successfully read schema.sql (3421 characters)
[12:34:57] ℹ️  Creating database schema...
[12:34:57] ℹ️    📁 Created table: ai_model_config
[12:34:57] ℹ️    📁 Created table: rag_urls
[12:34:57] ℹ️    📁 Created table: config_audit
[12:34:57] ℹ️    🔍 Created index: idx_ai_model_provider_name
[12:34:57] ℹ️    ⚡ Created trigger: update_ai_model_config_updated_at
[12:34:58] ✅ Creating database schema completed - executed 23 statements
[12:34:58] ℹ️  Reading SQL file: /path/to/sql/seed.sql
[12:34:58] ✅ Successfully read seed.sql (1842 characters)
[12:34:58] ℹ️  Inserting seed data...
[12:34:58] ℹ️    ➕ Inserted 1 rows into ai_model_config
[12:34:58] ✅ Inserting seed data completed - executed 6 statements
[12:34:58] ℹ️  Verifying database setup...
[12:34:58] ℹ️  Found tables: ai_model_config, config_audit, rag_urls
[12:34:58] ℹ️  Found 12 indexes
[12:34:58] ℹ️  Found 2 triggers
[12:34:58] ✅ Database verification completed successfully
[12:34:58] ✅ 🎉 Database setup completed successfully!
[12:34:58] ℹ️  Your Forge application is ready to use.

============================================================
DATABASE SETUP SUMMARY
============================================================
[12:34:58] ℹ️  Duration: 2 seconds
[12:34:58] ℹ️  Tables created: 3
[12:34:58] ℹ️  Indexes created: 12
[12:34:58] ℹ️  Triggers created: 2
[12:34:58] ℹ️  Rows inserted: 6
[12:34:58] ✅ No errors encountered!
============================================================
```

### Error Handling

The script includes comprehensive error handling:

- **Connection Failures**: Clear error messages for connection issues
- **Transaction Rollback**: Automatic rollback on any SQL execution failure
- **File Reading Errors**: Validation of SQL file existence and content
- **Verification Failures**: Detailed reporting of setup verification issues

### Troubleshooting

#### Common Issues

1. **Connection String Not Found**
   ```
   Error: No database connection string found
   ```
   **Solution**: Set one of the required environment variables

2. **Connection Timeout**
   ```
   Error: connection timeout
   ```
   **Solution**: Check network connectivity and database availability

3. **Permission Denied**
   ```
   Error: permission denied for relation
   ```
   **Solution**: Ensure database user has CREATE, INSERT, UPDATE permissions

4. **SQL File Not Found**
   ```
   Error: Failed to read SQL file: schema.sql
   ```
   **Solution**: Ensure `sql/schema.sql` and `sql/seed.sql` exist in project root

#### Debug Mode

For additional debugging information, run with:
```bash
DEBUG=* node scripts/setup-database.js
```

### Schema Migration

If you're upgrading from an older version that used PostgreSQL EXCLUDE constraints, run the migration script first:

```bash
# For PostgreSQL installations with EXCLUDE constraint (before v1.2)
psql $POSTGRES_URL -f sql/migrate-exclude-to-index.sql

# Then run the normal setup
npm run setup-db
```

The migration script:
- Safely removes the old EXCLUDE constraint
- Creates a compatible unique partial index
- Maintains the same constraint behavior (one default per provider)
- Works across all PostgreSQL versions

### Manual Cleanup

If you need to clean up and restart:

```sql
-- Connect to your database and run:
DROP TABLE IF EXISTS config_audit CASCADE;
DROP TABLE IF EXISTS rag_urls CASCADE;
DROP TABLE IF EXISTS ai_model_config CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP VIEW IF EXISTS config_summary CASCADE;
```

### Model Consistency Verification

Use the verification script to ensure hardcoded fallback models in the chat route match the seed data:

```bash
# Verify model consistency
npm run verify-models
```

This script:
- Extracts default model configurations from `sql/seed.sql`
- Extracts hardcoded fallback configurations from `src/app/api/chat/route.ts`
- Compares all properties (modelName, temperature, maxTokens, topP)
- Reports any inconsistencies with detailed output

**Expected Output (when consistent):**
```
🎉 All models are consistent between seed data and chat route fallbacks!
```

### Integration with CI/CD

The script can be integrated into deployment pipelines:

```yaml
# GitHub Actions example
- name: Setup Database
  run: npm run setup-db
  env:
    POSTGRES_URL: ${{ secrets.POSTGRES_URL }}

- name: Verify Model Consistency
  run: npm run verify-models
```

### Security Considerations

- Environment variables containing credentials are masked in logs
- Transactions ensure data consistency during setup
- Connection strings are validated before use
- Sensitive data in audit logs is automatically masked

For additional help or issues, please refer to the main project documentation or open an issue in the repository.