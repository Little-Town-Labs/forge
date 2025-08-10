/**
 * Configuration Service Layer for Admin Configuration Management
 * 
 * Provides comprehensive configuration services using Vercel Postgres with
 * encryption, validation, audit logging, and caching capabilities.
 */

import { sql, withRetry, withTransaction, getDatabaseStats as getDbStats } from './database';
import { encryptApiKey, decryptApiKey, maskApiKey } from './encryption';
import { 
  InputSanitizer, 
  SecureQuery, 
  SecureQueryExecutor 
} from './query-security';
import type { 
  AiModelConfig, 
  RagUrlConfig, 
  ConfigAuditEntry, 
  ModelProvider, 
  CrawlStatus 
} from '../types';

// Type definitions for UPDATE query builder
type UpdateField<T> = {
  column: keyof T;
  value: unknown;
  transform?: (value: unknown) => unknown;
};

type UpdateQueryResult = {
  query: string;
  values: unknown[];
};

// Allowed database tables for security validation
const ALLOWED_TABLES = ['ai_model_config', 'rag_urls', 'config_audit'] as const;
type AllowedTable = typeof ALLOWED_TABLES[number];

// Allowed column names per table to prevent injection
const ALLOWED_COLUMNS: Record<AllowedTable, readonly string[]> = {
  ai_model_config: [
    'provider', 'model_name', 'is_default', 'is_enabled', 'temperature', 
    'max_tokens', 'top_p', 'system_prompt', 'api_key_encrypted', 'updated_at'
  ],
  rag_urls: [
    'namespace', 'url', 'crawl_config', 'is_active', 'crawl_status', 
    'last_crawled', 'pages_indexed', 'error_message', 'updated_at'
  ],
  config_audit: [
    'admin_email', 'action', 'resource_type', 'resource_id', 'old_value', 
    'new_value', 'ip_address', 'user_agent', 'created_at'
  ]
} as const;

/**
 * Enhanced safe UPDATE query builder with comprehensive security validation
 * Prevents SQL injection through strict input validation and parameterization
 */
class UpdateQueryBuilder<T = Record<string, unknown>> {
  private fields: UpdateField<T>[] = [];
  private table: string = '';
  private whereClause: string = '';
  private whereValues: unknown[] = [];

  constructor(tableName: string) {
    // Enhanced security: Validate table name with comprehensive checks
    const sanitizedTable = InputSanitizer.validateTableName(tableName);
    
    // Additional security: Validate against allowlist
    if (!ALLOWED_TABLES.includes(sanitizedTable as AllowedTable)) {
      throw new Error(`Invalid table name: ${sanitizedTable}. Only predefined tables are allowed.`);
    }
    this.table = sanitizedTable;
  }

  /**
   * Add a field to update if the value is defined with security validation
   */
  set(column: keyof T, value: unknown, transform?: (value: unknown) => unknown): this {
    if (value !== undefined) {
      const columnName = String(column);
      
      // Enhanced security: Validate column name with comprehensive checks
      const sanitizedColumn = InputSanitizer.validateColumnName(columnName);
      
      // Security: Validate column name against allowlist for this table
      const allowedColumns = ALLOWED_COLUMNS[this.table as AllowedTable];
      if (!allowedColumns.includes(sanitizedColumn)) {
        throw new Error(`Invalid column '${sanitizedColumn}' for table '${this.table}'. Only predefined columns are allowed.`);
      }
      
      // Enhanced security: Validate parameter value with comprehensive checks
      const sanitizedValue = InputSanitizer.validateParameterValue(value);
      
      // Security: Additional validation for sensitive columns
      if (sanitizedColumn === 'api_key_encrypted' && sanitizedValue && typeof sanitizedValue !== 'string') {
        throw new Error('API key must be a string value');
      }
      
      if (sanitizedColumn === 'admin_email' && sanitizedValue && typeof sanitizedValue === 'string') {
        // Basic email format validation for security
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(sanitizedValue)) {
          throw new Error('Invalid email format for admin_email');
        }
      }
      
      this.fields.push({ column, value: sanitizedValue, transform });
    }
    return this;
  }

  /**
   * Set the WHERE clause with parameters and security validation
   */
  where(clause: string, values: unknown[]): this {
    // Enhanced security: Comprehensive WHERE clause validation
    InputSanitizer.validateWhereClause(clause);
    
    // Enhanced security: Validate all parameter values
    const sanitizedValues = values.map(value => InputSanitizer.validateParameterValue(value));
    
    // Security: Validate parameter count matches placeholders
    const placeholderCount = (clause.match(/\$\d+/g) || []).length;
    if (placeholderCount !== sanitizedValues.length) {
      throw new Error(`WHERE clause parameter count mismatch: expected ${placeholderCount}, got ${sanitizedValues.length}`);
    }
    
    this.whereClause = clause;
    this.whereValues = sanitizedValues;
    return this;
  }

  /**
   * Build the final UPDATE query with enhanced security and parameterization
   */
  build(): UpdateQueryResult {
    if (this.fields.length === 0) {
      throw new Error('No fields to update');
    }
    
    if (!this.whereClause) {
      throw new Error('WHERE clause is required for UPDATE queries');
    }

    // Always add updated_at timestamp (skip column validation for this system field)
    const hasUpdatedAt = this.fields.some(f => String(f.column) === 'updated_at');
    if (!hasUpdatedAt) {
      this.fields.push({ 
        column: 'updated_at' as keyof T, 
        value: 'CURRENT_TIMESTAMP',
        transform: (v) => v // Special case for SQL functions
      });
    }

    const setAssignments: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Build SET assignments with enhanced security
    for (const field of this.fields) {
      const columnName = String(field.column);
      
      if (columnName === 'updated_at' && field.value === 'CURRENT_TIMESTAMP') {
        // Special handling for timestamp
        setAssignments.push(`${columnName} = CURRENT_TIMESTAMP`);
      } else {
        // Security: Validate value for SQL injection attempts
        const transformedValue = field.transform ? field.transform(field.value) : field.value;
        
        // Additional security check for string values
        if (typeof transformedValue === 'string') {
          if (transformedValue.includes('\0') || transformedValue.includes('\x00')) {
            throw new Error('NULL byte detected in string value');
          }
        }
        
        setAssignments.push(`${columnName} = $${paramIndex++}`);
        values.push(transformedValue);
      }
    }

    // Security: Enhanced WHERE clause parameter replacement
    const whereClause = this.whereClause.replace(/\$(\d+)/g, (match, num) => {
      const originalIndex = parseInt(num);
      if (isNaN(originalIndex) || originalIndex < 1) {
        throw new Error(`Invalid parameter placeholder: ${match}`);
      }
      return `$${paramIndex + originalIndex - 1}`;
    });

    values.push(...this.whereValues);

    const query = `
      UPDATE ${this.table}
      SET ${setAssignments.join(', ')}
      WHERE ${whereClause}
      RETURNING *
    `.trim();

    // Security: Log the query structure (without sensitive values) for audit
    console.log(`[SECURE UPDATE] Table: ${this.table}, Columns: ${this.fields.map(f => String(f.column)).join(', ')}`);

    return { query, values };
  }

  /**
   * Execute the update query using a transaction client with enhanced security and error handling
   */
  async execute(
    client: { query: (query: string, values: unknown[]) => Promise<{ rows: unknown[] }> }, 
    options: { timeout?: number; auditContext?: string } = {}
  ): Promise<{ rows: unknown[] }> {
    const { query, values } = this.build();
    const { timeout = 10000, auditContext } = options;
    
    // Security: Create a timeout wrapper for query execution
    const executeWithTimeout = async (): Promise<{ rows: unknown[] }> => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Query execution timeout after ${timeout}ms`));
        }, timeout);
        
        client.query(query, values)
          .then(result => {
            clearTimeout(timer);
            resolve(result);
          })
          .catch(error => {
            clearTimeout(timer);
            reject(error);
          });
      });
    };
    
    const startTime = Date.now();
    
    try {
      const result = await executeWithTimeout();
      const executionTime = Date.now() - startTime;
      
      // Security audit logging
      console.log(`[SECURE UPDATE COMPLETED] Table: ${this.table}, Execution: ${executionTime}ms, Rows: ${result.rows.length}${auditContext ? `, Context: ${auditContext}` : ''}`);
      
      if (result.rows.length === 0) {
        console.warn(`[SECURE UPDATE WARNING] No rows affected for table: ${this.table}`);
      }
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Security: Log failed queries (without sensitive data)
      console.error(`[SECURE UPDATE FAILED] Table: ${this.table}, Error: ${error instanceof Error ? error.message : 'Unknown'}, Time: ${executionTime}ms`);
      
      // Re-throw with enhanced error context
      if (error instanceof Error) {
        throw new Error(`Database update failed for table '${this.table}': ${error.message}`);
      } else {
        throw new Error(`Database update failed for table '${this.table}': Unknown error`);
      }
    }
  }
}

/**
 * Helper function to create a new UpdateQueryBuilder
 */
function createUpdateQuery<T = Record<string, unknown>>(tableName: string): UpdateQueryBuilder<T> {
  return new UpdateQueryBuilder<T>(tableName);
}

/**
 * Enhanced secure batch operation execution with transaction isolation
 */
export async function executeSecureBatchOperation<T>(
  operations: Array<{
    operation: (client: unknown) => Promise<T>;
    description: string;
    timeout?: number;
  }>,
  adminEmail: string
): Promise<T[]> {
  return await withTransaction(async (client) => {
    const results: T[] = [];
    const startTime = Date.now();
    
    console.log(`[SECURE BATCH START] Admin: ${adminEmail}, Operations: ${operations.length}`);
    
    try {
      for (let i = 0; i < operations.length; i++) {
        const { operation, description, timeout = 10000 } = operations[i];
        const opStartTime = Date.now();
        
        // Execute with timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Operation timeout: ${description}`)), timeout);
        });
        
        const result = await Promise.race([operation(client), timeoutPromise]) as T;
        results.push(result);
        
        const opDuration = Date.now() - opStartTime;
        console.log(`[SECURE BATCH STEP] ${i + 1}/${operations.length}: ${description} (${opDuration}ms)`);
      }
      
      const totalDuration = Date.now() - startTime;
      console.log(`[SECURE BATCH COMPLETED] Admin: ${adminEmail}, Duration: ${totalDuration}ms, Results: ${results.length}`);
      
      return results;
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      console.error(`[SECURE BATCH FAILED] Admin: ${adminEmail}, Duration: ${totalDuration}ms, Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      
      // Re-throw to trigger transaction rollback
      throw error;
    }
  });
}

// Cache configuration
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: unknown; timestamp: number }>();

/**
 * Simple cache implementation for frequently accessed configurations
 */
function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CONFIG_CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return cached.data as T;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function clearCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
    return;
  }
  
  const keys = Array.from(cache.keys());
  keys.forEach(key => {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  });
}

/**
 * Write audit log entry for configuration changes
 */
export async function writeAuditLog(
  adminEmail: string,
  action: string,
  resourceType: 'ai_model' | 'rag_url' | 'system',
  resourceId?: string,
  oldValue?: unknown,
  newValue?: unknown,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await withRetry(async () => {
      await sql`
        INSERT INTO config_audit (
          admin_email, action, resource_type, resource_id, 
          old_value, new_value, ip_address, user_agent
        ) VALUES (
          ${adminEmail}, ${action}, ${resourceType}, ${resourceId || null},
          ${oldValue ? JSON.stringify(oldValue) : null}, 
          ${newValue ? JSON.stringify(newValue) : null},
          ${ipAddress || null}, ${userAgent || null}
        )
      `;
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Don't throw - audit logging shouldn't break the main operation
  }
}

/**
 * Get all AI model configurations with decryption
 */
export async function getModelConfigs(): Promise<AiModelConfig[]> {
  const cacheKey = 'model_configs';
  const cached = getCached<AiModelConfig[]>(cacheKey);
  if (cached) return cached;

  const result = await withRetry(async () => {
    return await sql`
      SELECT id, provider, model_name, is_default, is_enabled,
             temperature, max_tokens, top_p, system_prompt, 
             api_key_encrypted, created_at, updated_at
      FROM ai_model_config
      ORDER BY provider ASC, is_default DESC, model_name ASC
    `;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const configs: AiModelConfig[] = result.rows.map((row: any) => ({
    id: row.id,
    provider: row.provider as ModelProvider,
    modelName: row.model_name,
    isDefault: row.is_default,
    isEnabled: row.is_enabled,
    temperature: parseFloat(row.temperature),
    maxTokens: row.max_tokens,
    topP: parseFloat(row.top_p),
    systemPrompt: row.system_prompt,
    apiKey: row.api_key_encrypted ? decryptApiKey(row.api_key_encrypted) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));

  setCache(cacheKey, configs);
  return configs;
}

/**
 * Get default model configuration for a specific provider
 */
export async function getDefaultModelConfig(provider: ModelProvider): Promise<AiModelConfig | null> {
  const cacheKey = `default_model_${provider}`;
  const cached = getCached<AiModelConfig | null>(cacheKey);
  if (cached !== null) return cached;

  const result = await withRetry(async () => {
    return await sql`
      SELECT id, provider, model_name, is_default, is_enabled,
             temperature, max_tokens, top_p, system_prompt, 
             api_key_encrypted, created_at, updated_at
      FROM ai_model_config
      WHERE provider = ${provider} AND is_default = TRUE AND is_enabled = TRUE
      LIMIT 1
    `;
  });

  if (result.rows.length === 0) {
    setCache(cacheKey, null);
    return null;
  }

  const row = result.rows[0];
  const config: AiModelConfig = {
    id: row.id,
    provider: row.provider as ModelProvider,
    modelName: row.model_name,
    isDefault: row.is_default,
    isEnabled: row.is_enabled,
    temperature: parseFloat(row.temperature),
    maxTokens: row.max_tokens,
    topP: parseFloat(row.top_p),
    systemPrompt: row.system_prompt,
    apiKey: row.api_key_encrypted ? decryptApiKey(row.api_key_encrypted) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  setCache(cacheKey, config);
  return config;
}

/**
 * Create new AI model configuration
 */
export async function createModelConfig(
  config: Omit<AiModelConfig, 'id' | 'createdAt' | 'updatedAt'>,
  adminEmail: string
): Promise<AiModelConfig> {
  const result = await withRetry(async () => {
    return await withTransaction(async (client) => {
      // If this is set as default, unset other defaults for this provider
      if (config.isDefault) {
        await client`
          UPDATE ai_model_config 
          SET is_default = FALSE 
          WHERE provider = ${config.provider}
        `;
      }

      const insertResult = await client`
        INSERT INTO ai_model_config (
          provider, model_name, is_default, is_enabled,
          temperature, max_tokens, top_p, system_prompt, api_key_encrypted
        ) VALUES (
          ${config.provider}, ${config.modelName}, ${config.isDefault},
          ${config.isEnabled}, ${config.temperature}, ${config.maxTokens},
          ${config.topP}, ${config.systemPrompt || null},
          ${config.apiKey ? encryptApiKey(config.apiKey) : null}
        )
        RETURNING id, created_at, updated_at
      `;

      return insertResult;
    });
  });

  const newConfig: AiModelConfig = {
    ...config,
    id: result.rows[0].id,
    createdAt: result.rows[0].created_at,
    updatedAt: result.rows[0].updated_at
  };

  // Clear cache and write audit log
  clearCache('model');
  await writeAuditLog(
    adminEmail,
    'model_create',
    'ai_model',
    newConfig.id.toString(),
    null,
    { ...newConfig, apiKey: config.apiKey ? maskApiKey(config.apiKey) : undefined }
  );

  return newConfig;
}

/**
 * Update AI model configuration
 */
export async function updateModelConfig(
  id: number,
  updates: Partial<Omit<AiModelConfig, 'id' | 'createdAt' | 'updatedAt'>>,
  adminEmail: string
): Promise<AiModelConfig> {
  // Get current config for audit log
  const currentResult = await sql`
    SELECT * FROM ai_model_config WHERE id = ${id}
  `;
  
  if (currentResult.rows.length === 0) {
    throw new Error('Model configuration not found');
  }

  const result = await withRetry(async () => {
    return await withTransaction(async (client) => {
      // If this is set as default, unset other defaults for this provider
      if (updates.isDefault && updates.provider) {
        await client`
          UPDATE ai_model_config 
          SET is_default = FALSE 
          WHERE provider = ${updates.provider} AND id != ${id}
        `;
      }

      // Build UPDATE query using the safe query builder
      const updateQuery = createUpdateQuery<AiModelConfig>('ai_model_config')
        .set('model_name', updates.modelName)
        .set('is_default', updates.isDefault)
        .set('is_enabled', updates.isEnabled)
        .set('temperature', updates.temperature)
        .set('max_tokens', updates.maxTokens)
        .set('top_p', updates.topP)
        .set('system_prompt', updates.systemPrompt)
        .set('api_key_encrypted', updates.apiKey, (apiKey) => 
          apiKey ? encryptApiKey(apiKey as string) : null
        )
        .where('id = $1', [id]);

      return await updateQuery.execute(client, { 
        timeout: 15000, 
        auditContext: `Admin: ${adminEmail}` 
      });
    });
  });

  const updatedConfig: AiModelConfig = {
    id: result.rows[0].id,
    provider: result.rows[0].provider as ModelProvider,
    modelName: result.rows[0].model_name,
    isDefault: result.rows[0].is_default,
    isEnabled: result.rows[0].is_enabled,
    temperature: parseFloat(result.rows[0].temperature),
    maxTokens: result.rows[0].max_tokens,
    topP: parseFloat(result.rows[0].top_p),
    systemPrompt: result.rows[0].system_prompt,
    apiKey: result.rows[0].api_key_encrypted ? decryptApiKey(result.rows[0].api_key_encrypted) : undefined,
    createdAt: result.rows[0].created_at,
    updatedAt: result.rows[0].updated_at
  };

  // Clear cache and write audit log
  clearCache('model');
  await writeAuditLog(
    adminEmail,
    'model_update',
    'ai_model',
    id.toString(),
    currentResult.rows[0],
    { ...updatedConfig, apiKey: updates.apiKey ? maskApiKey(updates.apiKey) : undefined }
  );

  return updatedConfig;
}

/**
 * Delete AI model configuration
 */
export async function deleteModelConfig(id: number, adminEmail: string): Promise<void> {
  // Get current config for audit log
  const currentResult = await sql`
    SELECT * FROM ai_model_config WHERE id = ${id}
  `;
  
  if (currentResult.rows.length === 0) {
    throw new Error('Model configuration not found');
  }

  await withRetry(async () => {
    await sql`DELETE FROM ai_model_config WHERE id = ${id}`;
  });

  // Clear cache and write audit log
  clearCache('model');
  await writeAuditLog(
    adminEmail,
    'model_delete',
    'ai_model',
    id.toString(),
    currentResult.rows[0],
    null
  );
}

/**
 * Test model connection with API key
 */
export async function testModelConnection(
  provider: ModelProvider,
  apiKey: string,
  modelName?: string
): Promise<{
  success: boolean;
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    if (provider === 'openai') {
      // Test OpenAI connection
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      return {
        success: true,
        responseTime: Date.now() - startTime
      };
    } else if (provider === 'google') {
      // Test Google AI connection
      const testModel = modelName || 'gemini-pro';
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${testModel}?key=${apiKey}`, {
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Google AI API error: ${response.status} ${response.statusText}`);
      }

      return {
        success: true,
        responseTime: Date.now() - startTime
      };
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    return {
      success: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown connection error'
    };
  }
}

/**
 * Get all RAG URL configurations
 */
export async function getRagUrls(): Promise<RagUrlConfig[]> {
  const cacheKey = 'rag_urls';
  const cached = getCached<RagUrlConfig[]>(cacheKey);
  if (cached) return cached;

  const result = await withRetry(async () => {
    return await sql`
      SELECT id, url, namespace, crawl_config, is_active,
             last_crawled, crawl_status, pages_indexed, error_message,
             created_at, updated_at
      FROM rag_urls
      ORDER BY created_at DESC
    `;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const configs: RagUrlConfig[] = result.rows.map((row: any) => ({
    id: row.id,
    url: row.url,
    namespace: row.namespace,
    crawlConfig: typeof row.crawl_config === 'string' 
      ? JSON.parse(row.crawl_config) 
      : row.crawl_config,
    isActive: row.is_active,
    lastCrawled: row.last_crawled,
    crawlStatus: row.crawl_status as CrawlStatus,
    pagesIndexed: row.pages_indexed,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));

  setCache(cacheKey, configs);
  return configs;
}

/**
 * Create new RAG URL configuration
 */
export async function createRagUrl(
  config: Omit<RagUrlConfig, 'id' | 'createdAt' | 'updatedAt'>,
  adminEmail: string
): Promise<RagUrlConfig> {
  const result = await withRetry(async () => {
    return await sql`
      INSERT INTO rag_urls (
        url, namespace, crawl_config, is_active,
        crawl_status, pages_indexed
      ) VALUES (
        ${config.url}, ${config.namespace}, ${JSON.stringify(config.crawlConfig)},
        ${config.isActive}, ${config.crawlStatus || 'pending'}, ${config.pagesIndexed || 0}
      )
      RETURNING id, created_at, updated_at
    `;
  });

  const newConfig: RagUrlConfig = {
    ...config,
    id: result.rows[0].id,
    createdAt: result.rows[0].created_at,
    updatedAt: result.rows[0].updated_at
  };

  // Clear cache and write audit log
  clearCache('rag_url');
  await writeAuditLog(
    adminEmail,
    'url_create',
    'rag_url',
    newConfig.id.toString(),
    null,
    newConfig
  );

  return newConfig;
}

/**
 * Update RAG URL configuration
 */
export async function updateRagUrl(
  id: number,
  updates: Partial<Omit<RagUrlConfig, 'id' | 'createdAt' | 'updatedAt'>>,
  adminEmail: string
): Promise<RagUrlConfig> {
  // Get current config for audit log
  const currentResult = await sql`
    SELECT * FROM rag_urls WHERE id = ${id}
  `;
  
  if (currentResult.rows.length === 0) {
    throw new Error('RAG URL configuration not found');
  }

  const result = await withRetry(async () => {
    // Build UPDATE query using the safe query builder
    const updateQuery = createUpdateQuery<RagUrlConfig>('rag_urls')
      .set('url', updates.url)
      .set('namespace', updates.namespace)
      .set('crawl_config', updates.crawlConfig, (config) => 
        config ? JSON.stringify(config) : undefined
      )
      .set('is_active', updates.isActive)
      .set('last_crawled', updates.lastCrawled)
      .set('crawl_status', updates.crawlStatus)
      .set('pages_indexed', updates.pagesIndexed)
      .set('error_message', updates.errorMessage)
      .where('id = $1', [id]);

    return await updateQuery.execute(sql);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = result.rows[0] as any;
  const updatedConfig: RagUrlConfig = {
    id: row.id,
    url: row.url,
    namespace: row.namespace,
    crawlConfig: typeof row.crawl_config === 'string' 
      ? JSON.parse(row.crawl_config)
      : row.crawl_config,
    isActive: row.is_active,
    lastCrawled: row.last_crawled,
    crawlStatus: row.crawl_status as CrawlStatus,
    pagesIndexed: row.pages_indexed,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  // Clear cache and write audit log
  clearCache('rag_url');
  await writeAuditLog(
    adminEmail,
    'url_update',
    'rag_url',
    id.toString(),
    currentResult.rows[0],
    updatedConfig
  );

  return updatedConfig;
}

/**
 * Delete RAG URL configuration
 */
export async function deleteRagUrl(id: number, adminEmail: string): Promise<void> {
  // Get current config for audit log
  const currentResult = await sql`
    SELECT * FROM rag_urls WHERE id = ${id}
  `;
  
  if (currentResult.rows.length === 0) {
    throw new Error('RAG URL configuration not found');
  }

  await withRetry(async () => {
    await sql`DELETE FROM rag_urls WHERE id = ${id}`;
  });

  // Clear cache and write audit log
  clearCache('rag_url');
  await writeAuditLog(
    adminEmail,
    'url_delete',
    'rag_url',
    id.toString(),
    currentResult.rows[0],
    null
  );
}

/**
 * Safe SELECT query builder for dynamic WHERE clauses
 */
class SelectQueryBuilder {
  private conditions: string[] = [];
  private values: unknown[] = [];
  private paramIndex = 1;

  /**
   * Add a WHERE condition if the value is defined
   */
  whereEqual(column: string, value: unknown): this {
    if (value !== undefined && value !== null) {
      this.conditions.push(`${column} = $${this.paramIndex++}`);
      this.values.push(value);
    }
    return this;
  }

  /**
   * Add a WHERE condition with custom operator
   */
  where(condition: string, value: unknown): this {
    if (value !== undefined && value !== null) {
      this.conditions.push(condition.replace('?', `$${this.paramIndex++}`));
      this.values.push(value);
    }
    return this;
  }

  /**
   * Build the WHERE clause
   */
  buildWhereClause(): { whereClause: string; values: unknown[] } {
    const whereClause = this.conditions.length > 0 ? `WHERE ${this.conditions.join(' AND ')}` : '';
    return { whereClause, values: this.values };
  }
}

/**
 * Get configuration audit log entries
 */
export async function getAuditLog(
  filters: {
    adminEmail?: string;
    resourceType?: 'ai_model' | 'rag_url' | 'system';
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ entries: ConfigAuditEntry[]; totalCount: number }> {
  // Build WHERE clause using the safe query builder
  const queryBuilder = new SelectQueryBuilder()
    .whereEqual('admin_email', filters.adminEmail)
    .whereEqual('resource_type', filters.resourceType)
    .whereEqual('action', filters.action)
    .where('created_at >= ?', filters.startDate)
    .where('created_at <= ?', filters.endDate);

  const { whereClause, values } = queryBuilder.buildWhereClause();
  
  const limit = Math.min(filters.limit || 100, 1000); // Cap at 1000
  const offset = filters.offset || 0;

  // Get total count using secure query execution
  const countQuery = `SELECT COUNT(*) as total FROM config_audit ${whereClause}`;
  const countResult = await SecureQuery.select(
    (query, params) => sql.query(query, params),
    countQuery,
    values,
    { auditContext: 'audit_log_count' }
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalCount = parseInt((countResult.rows[0] as any).total);

  // Get entries using secure query execution
  const entriesQuery = `
    SELECT * FROM config_audit 
    ${whereClause}
    ORDER BY created_at DESC 
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;
  const entriesValues = [...values, limit, offset];
  
  const entriesResult = await SecureQuery.select(
    (query, params) => sql.query(query, params),
    entriesQuery,
    entriesValues,
    { auditContext: 'audit_log_entries' }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: ConfigAuditEntry[] = entriesResult.rows.map((row: any) => ({
    id: row.id,
    adminEmail: row.admin_email,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    oldValue: row.old_value,
    newValue: row.new_value,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at
  }));

  return { entries, totalCount };
}

/**
 * Re-export database stats for admin config dashboard
 */
export const getDatabaseStats = getDbStats;