/**
 * Enhanced Database Query Security Module
 * 
 * Provides comprehensive SQL injection protection, input validation,
 * and query structure verification for all database operations.
 */

import crypto from 'crypto';

// Security constants
export const QUERY_TIMEOUT_MS = 30000; // 30 seconds max per query
export const MAX_QUERY_LENGTH = 10000; // Maximum query length
export const MAX_PARAMETER_COUNT = 100; // Maximum parameters per query
export const MAX_PARAMETER_LENGTH = 10000; // Maximum parameter value length

// Comprehensive SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  // Classic injection patterns
  /;\s*DROP\s+/i,
  /;\s*DELETE\s+/i,
  /;\s*INSERT\s+/i,
  /;\s*UPDATE\s+/i,
  /;\s*CREATE\s+/i,
  /;\s*ALTER\s+/i,
  /;\s*TRUNCATE\s+/i,
  /;\s*EXEC\s+/i,
  /;\s*EXECUTE\s+/i,
  
  // Union-based injection
  /UNION\s+SELECT/i,
  /UNION\s+ALL\s+SELECT/i,
  
  // Comment-based injection
  /--/,
  /\/\*/,
  /\*\//,
  /#/,
  
  // Boolean-based injection
  /\s+OR\s+1\s*=\s*1/i,
  /\s+AND\s+1\s*=\s*1/i,
  /\s+OR\s+.*=.*OR/i,
  
  // Time-based injection
  /SLEEP\s*\(/i,
  /WAITFOR\s+DELAY/i,
  /BENCHMARK\s*\(/i,
  
  // Information schema attacks
  /information_schema\./i,
  /pg_catalog\./i,
  /pg_user/i,
  
  // File system attacks
  /LOAD_FILE\s*\(/i,
  /INTO\s+OUTFILE/i,
  /INTO\s+DUMPFILE/i,
  
  // Function-based attacks
  /CHAR\s*\(/i,
  /ASCII\s*\(/i,
  /SUBSTRING\s*\(/i,
  /CONCAT\s*\(/i,
  
  // PostgreSQL specific
  /pg_sleep\s*\(/i,
  /copy\s+.*from/i,
  /copy\s+.*to/i,
  
  // Dangerous characters and sequences
  /\x00/, // NULL byte
  /\x1a/, // Substitute character
  /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/, // Control characters
];

// Allowed SQL keywords in WHERE clauses
const ALLOWED_WHERE_KEYWORDS = new Set([
  'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'ILIKE',
  'IS', 'NULL', 'TRUE', 'FALSE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'CURRENT_TIMESTAMP', 'NOW()', 'EXTRACT', 'DATE', 'INTERVAL'
]);

// Allowed comparison operators
const ALLOWED_OPERATORS = new Set([
  '=', '!=', '<>', '<', '>', '<=', '>=', 'LIKE', 'ILIKE', 'IN', 'NOT IN',
  'IS', 'IS NOT', 'BETWEEN', 'NOT BETWEEN'
]);

/**
 * Comprehensive input sanitization and validation
 */
export class InputSanitizer {
  /**
   * Validate and sanitize table name
   */
  static validateTableName(tableName: string): string {
    if (!tableName || typeof tableName !== 'string') {
      throw new Error('Table name must be a non-empty string');
    }
    
    const sanitized = tableName.trim();
    
    // Check length
    if (sanitized.length === 0 || sanitized.length > 63) {
      throw new Error('Table name must be between 1 and 63 characters');
    }
    
    // Check allowed characters (PostgreSQL identifier rules)
    if (!/^[a-z_][a-z0-9_]*$/.test(sanitized)) {
      throw new Error('Table name can only contain lowercase letters, numbers, and underscores, starting with a letter or underscore');
    }
    
    // Check against SQL keywords
    const upperName = sanitized.toUpperCase();
    const reservedKeywords = [
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER',
      'GRANT', 'REVOKE', 'UNION', 'WHERE', 'ORDER', 'GROUP', 'HAVING'
    ];
    
    if (reservedKeywords.includes(upperName)) {
      throw new Error(`Table name cannot be a reserved SQL keyword: ${sanitized}`);
    }
    
    return sanitized;
  }
  
  /**
   * Validate and sanitize column name
   */
  static validateColumnName(columnName: string): string {
    if (!columnName || typeof columnName !== 'string') {
      throw new Error('Column name must be a non-empty string');
    }
    
    const sanitized = columnName.trim();
    
    // Check length
    if (sanitized.length === 0 || sanitized.length > 63) {
      throw new Error('Column name must be between 1 and 63 characters');
    }
    
    // Check allowed characters
    if (!/^[a-z_][a-z0-9_]*$/.test(sanitized)) {
      throw new Error('Column name can only contain lowercase letters, numbers, and underscores, starting with a letter or underscore');
    }
    
    return sanitized;
  }
  
  /**
   * Validate WHERE clause structure
   */
  static validateWhereClause(whereClause: string): void {
    if (!whereClause || typeof whereClause !== 'string') {
      return; // Empty WHERE clause is allowed
    }
    
    const trimmed = whereClause.trim();
    if (trimmed.length === 0) {
      return;
    }
    
    // Check maximum length
    if (trimmed.length > 1000) {
      throw new Error('WHERE clause too long (maximum 1000 characters)');
    }
    
    // Check for SQL injection patterns
    for (const pattern of SQL_INJECTION_PATTERNS) {
      if (pattern.test(trimmed)) {
        throw new Error(`WHERE clause contains potentially dangerous SQL: ${pattern.toString()}`);
      }
    }
    
    // Validate that all keywords in WHERE clause are allowed
    const tokens = trimmed.split(/\s+/).map(token => token.toUpperCase());
    for (const token of tokens) {
      // Skip parameters and values
      if (token.startsWith('$') || /^\d+$/.test(token) || /^'.*'$/.test(token)) {
        continue;
      }
      
      // Check if token contains allowed operators or keywords
      const isAllowed = ALLOWED_WHERE_KEYWORDS.has(token) ||
                       ALLOWED_OPERATORS.has(token) ||
                       /^[a-z_][a-z0-9_]*$/i.test(token); // Valid identifier
      
      if (!isAllowed) {
        console.warn(`Potentially unsafe token in WHERE clause: ${token}`);
      }
    }
  }
  
  /**
   * Validate parameter value
   */
  static validateParameterValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }
    
    // Check for dangerous string values
    if (typeof value === 'string') {
      if (value.length > MAX_PARAMETER_LENGTH) {
        throw new Error(`Parameter value too long (maximum ${MAX_PARAMETER_LENGTH} characters)`);
      }
      
      // Check for NULL bytes and control characters
      if (/\x00/.test(value)) {
        throw new Error('NULL bytes not allowed in parameter values');
      }
      
      if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/.test(value)) {
        throw new Error('Control characters not allowed in parameter values');
      }
      
      // Check for SQL injection patterns in string values
      for (const pattern of SQL_INJECTION_PATTERNS) {
        if (pattern.test(value)) {
          throw new Error(`Parameter value contains potentially dangerous SQL: ${pattern.toString()}`);
        }
      }
    }
    
    // Validate numeric values
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new Error('Numeric parameter values must be finite');
      }
      
      if (Math.abs(value) > Number.MAX_SAFE_INTEGER) {
        throw new Error('Numeric parameter value exceeds safe integer range');
      }
    }
    
    // Validate arrays
    if (Array.isArray(value)) {
      if (value.length > 1000) {
        throw new Error('Array parameter too large (maximum 1000 elements)');
      }
      
      return value.map(item => this.validateParameterValue(item));
    }
    
    // Validate objects
    if (typeof value === 'object') {
      const jsonString = JSON.stringify(value);
      if (jsonString.length > MAX_PARAMETER_LENGTH) {
        throw new Error(`Object parameter too large (maximum ${MAX_PARAMETER_LENGTH} characters when serialized)`);
      }
    }
    
    return value;
  }
}

/**
 * Query structure validator
 */
export class QueryValidator {
  /**
   * Validate that parameter placeholders match provided values
   */
  static validateParameterPlaceholders(query: string, values: unknown[]): void {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }
    
    // Extract parameter placeholders ($1, $2, etc.)
    const placeholderMatches = query.match(/\$\d+/g) || [];
    const uniquePlaceholders = new Set(placeholderMatches);
    
    // Check parameter count
    if (values.length > MAX_PARAMETER_COUNT) {
      throw new Error(`Too many parameters (maximum ${MAX_PARAMETER_COUNT})`);
    }
    
    if (uniquePlaceholders.size !== values.length) {
      throw new Error(
        `Parameter count mismatch: query has ${uniquePlaceholders.size} unique placeholders, but ${values.length} values provided`
      );
    }
    
    // Validate parameter numbering is sequential
    const placeholderNumbers = Array.from(uniquePlaceholders)
      .map(placeholder => parseInt(placeholder.substring(1)))
      .sort((a, b) => a - b);
    
    for (let i = 0; i < placeholderNumbers.length; i++) {
      if (placeholderNumbers[i] !== i + 1) {
        throw new Error(`Parameter placeholders must be sequential starting from $1, found gap at $${i + 1}`);
      }
    }
    
    // Validate all parameter values
    values.forEach((value, index) => {
      try {
        InputSanitizer.validateParameterValue(value);
      } catch (error) {
        throw new Error(`Parameter $${index + 1}: ${error instanceof Error ? error.message : 'Validation failed'}`);
      }
    });
  }
  
  /**
   * Validate query structure matches expected patterns
   */
  static validateQueryStructure(query: string, expectedType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'): void {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }
    
    const normalizedQuery = query.trim().toUpperCase();
    
    // Check query length
    if (normalizedQuery.length > MAX_QUERY_LENGTH) {
      throw new Error(`Query too long (maximum ${MAX_QUERY_LENGTH} characters)`);
    }
    
    // Check query starts with expected type
    if (!normalizedQuery.startsWith(expectedType)) {
      throw new Error(`Expected ${expectedType} query, but got: ${normalizedQuery.substring(0, 20)}...`);
    }
    
    // Validate query structure based on type
    switch (expectedType) {
      case 'SELECT':
        this.validateSelectStructure(normalizedQuery);
        break;
      case 'INSERT':
        this.validateInsertStructure(normalizedQuery);
        break;
      case 'UPDATE':
        this.validateUpdateStructure(normalizedQuery);
        break;
      case 'DELETE':
        this.validateDeleteStructure(normalizedQuery);
        break;
    }
  }
  
  private static validateSelectStructure(query: string): void {
    // Must have FROM clause
    if (!query.includes(' FROM ')) {
      throw new Error('SELECT query must include FROM clause');
    }
    
    // Should not have dangerous operations
    const dangerousPatterns = [
      /INTO\s+OUTFILE/i,
      /INTO\s+DUMPFILE/i,
      /LOAD_FILE/i
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        throw new Error(`SELECT query contains dangerous operation: ${pattern.toString()}`);
      }
    }
  }
  
  private static validateInsertStructure(query: string): void {
    // Must have INTO clause
    if (!query.includes(' INTO ')) {
      throw new Error('INSERT query must include INTO clause');
    }
    
    // Must have VALUES or SELECT
    if (!query.includes(' VALUES ') && !query.includes(' SELECT ')) {
      throw new Error('INSERT query must include VALUES or SELECT clause');
    }
  }
  
  private static validateUpdateStructure(query: string): void {
    // Must have SET clause
    if (!query.includes(' SET ')) {
      throw new Error('UPDATE query must include SET clause');
    }
    
    // Should have WHERE clause for safety
    if (!query.includes(' WHERE ')) {
      console.warn('UPDATE query without WHERE clause - potential safety issue');
    }
  }
  
  private static validateDeleteStructure(query: string): void {
    // Must have FROM clause
    if (!query.includes(' FROM ')) {
      throw new Error('DELETE query must include FROM clause');
    }
    
    // Should have WHERE clause for safety
    if (!query.includes(' WHERE ')) {
      throw new Error('DELETE query must include WHERE clause for safety');
    }
  }
}

/**
 * Query integrity checker
 */
export class QueryIntegrityChecker {
  /**
   * Generate hash of query for integrity verification
   */
  static generateQueryHash(query: string, values: unknown[]): string {
    const queryData = {
      query: query.trim(),
      valueTypes: values.map(value => typeof value),
      valueHashes: values.map(value => {
        if (value === null || value === undefined) {
          return 'null';
        }
        const serialized = JSON.stringify(value);
        return crypto.createHash('sha256').update(serialized).digest('hex').substring(0, 16);
      })
    };
    
    const dataString = JSON.stringify(queryData);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }
  
  /**
   * Verify query hasn't been tampered with
   */
  static verifyQueryIntegrity(
    query: string, 
    values: unknown[], 
    expectedHash: string
  ): boolean {
    const actualHash = this.generateQueryHash(query, values);
    return actualHash === expectedHash;
  }
}

/**
 * Comprehensive SQL injection prevention wrapper
 */
export class SecureQueryExecutor {
  /**
   * Execute a secure database query with full validation
   */
  static async executeSecureQuery(
    queryFunction: (query: string, values: unknown[]) => Promise<{ rows: unknown[] }>,
    query: string,
    values: unknown[],
    options: {
      expectedType?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
      timeout?: number;
      auditContext?: string;
    } = {}
  ): Promise<{ rows: unknown[] }> {
    const {
      expectedType,
      timeout = QUERY_TIMEOUT_MS,
      auditContext
    } = options;
    
    const startTime = Date.now();
    const queryHash = QueryIntegrityChecker.generateQueryHash(query, values);
    
    try {
      // 1. Validate query structure
      if (expectedType) {
        QueryValidator.validateQueryStructure(query, expectedType);
      }
      
      // 2. Validate parameters
      QueryValidator.validateParameterPlaceholders(query, values);
      
      // 3. Additional SQL injection checks
      for (const pattern of SQL_INJECTION_PATTERNS) {
        if (pattern.test(query)) {
          throw new Error(`Query contains potentially dangerous SQL: ${pattern.toString()}`);
        }
      }
      
      // 4. Execute with timeout
      const executeWithTimeout = async (): Promise<{ rows: unknown[] }> => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`Query execution timeout after ${timeout}ms`));
          }, timeout);
          
          queryFunction(query, values)
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
      
      const result = await executeWithTimeout();
      const executionTime = Date.now() - startTime;
      
      // 5. Audit logging
      console.log(`[SECURE QUERY SUCCESS] Type: ${expectedType || 'UNKNOWN'}, Time: ${executionTime}ms, Rows: ${result.rows.length}, Hash: ${queryHash.substring(0, 8)}${auditContext ? `, Context: ${auditContext}` : ''}`);
      
      return result;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Security audit logging
      console.error(`[SECURE QUERY FAILED] Type: ${expectedType || 'UNKNOWN'}, Time: ${executionTime}ms, Hash: ${queryHash.substring(0, 8)}, Error: ${error instanceof Error ? error.message : 'Unknown'}${auditContext ? `, Context: ${auditContext}` : ''}`);
      
      // Re-throw with additional context
      if (error instanceof Error) {
        throw new Error(`Secure query execution failed: ${error.message}`);
      } else {
        throw new Error('Secure query execution failed: Unknown error');
      }
    }
  }
}

/**
 * Enhanced secure query helpers
 */
export const SecureQuery = {
  /**
   * Execute secure SELECT query
   */
  select: async (
    queryFunction: (query: string, values: unknown[]) => Promise<{ rows: unknown[] }>,
    query: string,
    values: unknown[] = [],
    options: { timeout?: number; auditContext?: string } = {}
  ) => {
    return SecureQueryExecutor.executeSecureQuery(
      queryFunction,
      query,
      values,
      { ...options, expectedType: 'SELECT' }
    );
  },
  
  /**
   * Execute secure INSERT query
   */
  insert: async (
    queryFunction: (query: string, values: unknown[]) => Promise<{ rows: unknown[] }>,
    query: string,
    values: unknown[] = [],
    options: { timeout?: number; auditContext?: string } = {}
  ) => {
    return SecureQueryExecutor.executeSecureQuery(
      queryFunction,
      query,
      values,
      { ...options, expectedType: 'INSERT' }
    );
  },
  
  /**
   * Execute secure UPDATE query
   */
  update: async (
    queryFunction: (query: string, values: unknown[]) => Promise<{ rows: unknown[] }>,
    query: string,
    values: unknown[] = [],
    options: { timeout?: number; auditContext?: string } = {}
  ) => {
    return SecureQueryExecutor.executeSecureQuery(
      queryFunction,
      query,
      values,
      { ...options, expectedType: 'UPDATE' }
    );
  },
  
  /**
   * Execute secure DELETE query
   */
  delete: async (
    queryFunction: (query: string, values: unknown[]) => Promise<{ rows: unknown[] }>,
    query: string,
    values: unknown[] = [],
    options: { timeout?: number; auditContext?: string } = {}
  ) => {
    return SecureQueryExecutor.executeSecureQuery(
      queryFunction,
      query,
      values,
      { ...options, expectedType: 'DELETE' }
    );
  }
};