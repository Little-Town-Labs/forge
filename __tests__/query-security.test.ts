/**
 * Comprehensive Unit Tests for Database Query Security
 * 
 * Tests SQL injection prevention, input validation, and query structure validation
 * with extensive malicious input scenarios.
 */

import {
  InputSanitizer,
  QueryValidator,
  QueryIntegrityChecker,
  SecureQueryExecutor,
  SecureQuery
} from '../src/lib/query-security';

describe('InputSanitizer', () => {
  describe('validateTableName', () => {
    it('should accept valid table names', () => {
      const validNames = ['users', 'ai_model_config', 'rag_urls', 'config_audit', 'table123'];
      validNames.forEach(name => {
        expect(() => InputSanitizer.validateTableName(name)).not.toThrow();
        expect(InputSanitizer.validateTableName(name)).toBe(name);
      });
    });
    
    it('should reject empty or invalid table names', () => {
      const invalidNames = ['', ' ', null, undefined, 123, {}, []];
      invalidNames.forEach(name => {
        expect(() => InputSanitizer.validateTableName(name as string)).toThrow();
      });
    });
    
    it('should reject table names with SQL injection attempts', () => {
      const maliciousNames = [
        'users; DROP TABLE users; --',
        'users UNION SELECT * FROM passwords',
        'users/**/OR/**/1=1',
        'users--',
        'users#comment',
        "users'; DROP TABLE users; --",
        'users OR 1=1',
        'users AND 1=1',
        'SELECT * FROM users'
      ];
      
      maliciousNames.forEach(name => {
        expect(() => InputSanitizer.validateTableName(name)).toThrow();
      });
    });
    
    it('should reject table names with invalid characters', () => {
      const invalidNames = [
        'users-table',
        'users table',
        'users.table',
        'users@table',
        'users$table',
        'USERS', // uppercase not allowed
        '123users', // can't start with number
        'users!',
        'users%',
        'users()',
        'users[]'
      ];
      
      invalidNames.forEach(name => {
        expect(() => InputSanitizer.validateTableName(name)).toThrow(`Table name can only contain lowercase letters`);
      });
    });
    
    it('should reject reserved SQL keywords as table names', () => {
      const keywords = ['select', 'insert', 'update', 'delete', 'create', 'drop', 'union', 'where'];
      keywords.forEach(keyword => {
        expect(() => InputSanitizer.validateTableName(keyword)).toThrow('reserved SQL keyword');
      });
    });
    
    it('should reject table names that are too long', () => {
      const longName = 'a'.repeat(64);
      expect(() => InputSanitizer.validateTableName(longName)).toThrow('between 1 and 63 characters');
    });
  });
  
  describe('validateColumnName', () => {
    it('should accept valid column names', () => {
      const validNames = ['id', 'user_name', 'created_at', 'is_active', 'api_key_encrypted'];
      validNames.forEach(name => {
        expect(() => InputSanitizer.validateColumnName(name)).not.toThrow();
        expect(InputSanitizer.validateColumnName(name)).toBe(name);
      });
    });
    
    it('should reject column names with SQL injection attempts', () => {
      const maliciousNames = [
        'id; DROP TABLE users; --',
        'id UNION SELECT password FROM users',
        'id/**/OR/**/1=1',
        'id--',
        'id#comment',
        "id'; DROP TABLE users; --",
        'id OR 1=1'
      ];
      
      maliciousNames.forEach(name => {
        expect(() => InputSanitizer.validateColumnName(name)).toThrow();
      });
    });
  });
  
  describe('validateWhereClause', () => {
    it('should accept valid WHERE clauses', () => {
      const validClauses = [
        'id = $1',
        'user_id = $1 AND active = $2',
        'created_at >= $1 AND created_at <= $2',
        'status IN ($1, $2, $3)',
        'name LIKE $1',
        'deleted_at IS NULL'
      ];
      
      validClauses.forEach(clause => {
        expect(() => InputSanitizer.validateWhereClause(clause)).not.toThrow();
      });
    });
    
    it('should reject WHERE clauses with SQL injection attempts', () => {
      const maliciousClauses = [
        'id = 1; DROP TABLE users; --',
        'id = 1 UNION SELECT * FROM passwords',
        'id = 1 OR 1=1',
        'id = 1/**/OR/**/1=1',
        'id = 1-- comment',
        'id = 1# comment',
        "id = 1'; DROP TABLE users; --",
        'id = 1; DELETE FROM users',
        'id = 1; INSERT INTO logs VALUES (1)',
        'id = 1; UPDATE users SET password = null',
        'id = 1; CREATE TABLE temp AS SELECT * FROM users',
        'id = 1; ALTER TABLE users ADD COLUMN hacked TEXT',
        'id = SLEEP(10)',
        'id = BENCHMARK(1000000, MD5(1))',
        'id = LOAD_FILE("/etc/passwd")'
      ];
      
      maliciousClauses.forEach(clause => {
        expect(() => InputSanitizer.validateWhereClause(clause)).toThrow('dangerous SQL');
      });
    });
    
    it('should reject WHERE clauses that are too long', () => {
      const longClause = 'id = $1 AND ' + 'name = $2 AND '.repeat(100) + 'active = $3';
      expect(() => InputSanitizer.validateWhereClause(longClause)).toThrow('too long');
    });
  });
  
  describe('validateParameterValue', () => {
    it('should accept valid parameter values', () => {
      const validValues = [
        'normal string',
        123,
        true,
        false,
        null,
        undefined,
        { key: 'value' },
        [1, 2, 3],
        new Date(),
        0,
        -1,
        3.14159
      ];
      
      validValues.forEach(value => {
        expect(() => InputSanitizer.validateParameterValue(value)).not.toThrow();
      });
    });
    
    it('should reject parameter values with SQL injection attempts', () => {
      const maliciousValues = [
        "'; DROP TABLE users; --",
        '1 OR 1=1',
        '1 UNION SELECT * FROM passwords',
        '1/**/OR/**/1=1',
        'SLEEP(10)',
        'BENCHMARK(1000000, MD5(1))',
        "1'; DELETE FROM users; --",
        'pg_sleep(10)',
        'information_schema.tables'
      ];
      
      maliciousValues.forEach(value => {
        expect(() => InputSanitizer.validateParameterValue(value)).toThrow('dangerous SQL');
      });
    });
    
    it('should reject parameter values with null bytes and control characters', () => {
      const dangerousValues = [
        'string\\x00with\\x00nulls',
        'string\x00with\x00nulls',
        'string\x1awith\x1acontrol',
        'string\x7fwith\x7fcontrol',
        'string\x9fwith\x9fcontrol'
      ];
      
      dangerousValues.forEach(value => {
        expect(() => InputSanitizer.validateParameterValue(value)).toThrow();
      });
    });
    
    it('should reject parameter values that are too long', () => {
      const longString = 'a'.repeat(10001);
      expect(() => InputSanitizer.validateParameterValue(longString)).toThrow('too long');
    });
    
    it('should reject arrays that are too large', () => {
      const largeArray = new Array(1001).fill('item');
      expect(() => InputSanitizer.validateParameterValue(largeArray)).toThrow('too large');
    });
    
    it('should reject objects that are too large when serialized', () => {
      const largeObject = { data: 'x'.repeat(10001) };
      expect(() => InputSanitizer.validateParameterValue(largeObject)).toThrow('too large');
    });
    
    it('should reject invalid numeric values', () => {
      const invalidNumbers = [Infinity, -Infinity, NaN, Number.MAX_SAFE_INTEGER + 1];
      invalidNumbers.forEach(value => {
        expect(() => InputSanitizer.validateParameterValue(value)).toThrow();
      });
    });
  });
});

describe('QueryValidator', () => {
  describe('validateParameterPlaceholders', () => {
    it('should accept queries with matching parameters', () => {
      const validQueries = [
        { query: 'SELECT * FROM users WHERE id = $1', values: [123] },
        { query: 'SELECT * FROM users WHERE id = $1 AND name = $2', values: [123, 'John'] },
        { query: 'INSERT INTO users (name, email) VALUES ($1, $2)', values: ['John', 'john@example.com'] },
        { query: 'UPDATE users SET name = $1 WHERE id = $2', values: ['Jane', 456] }
      ];
      
      validQueries.forEach(({ query, values }) => {
        expect(() => QueryValidator.validateParameterPlaceholders(query, values)).not.toThrow();
      });
    });
    
    it('should reject queries with parameter count mismatch', () => {
      const invalidQueries = [
        { query: 'SELECT * FROM users WHERE id = $1', values: [] },
        { query: 'SELECT * FROM users WHERE id = $1', values: [1, 2] },
        { query: 'SELECT * FROM users WHERE id = $1 AND name = $2', values: [1] },
        { query: 'SELECT * FROM users', values: [1] }
      ];
      
      invalidQueries.forEach(({ query, values }) => {
        expect(() => QueryValidator.validateParameterPlaceholders(query, values)).toThrow('mismatch');
      });
    });
    
    it('should reject queries with non-sequential parameters', () => {
      const invalidQueries = [
        { query: 'SELECT * FROM users WHERE id = $2', values: [123] },
        { query: 'SELECT * FROM users WHERE id = $1 AND name = $3', values: [1, 'John'] },
        { query: 'SELECT * FROM users WHERE id = $0', values: [123] }
      ];
      
      invalidQueries.forEach(({ query, values }) => {
        expect(() => QueryValidator.validateParameterPlaceholders(query, values)).toThrow();
      });
    });
    
    it('should reject queries with too many parameters', () => {
      const tooManyParams = new Array(101).fill('value');
      const query = 'SELECT * FROM users WHERE id IN (' + tooManyParams.map((_, i) => `$${i + 1}`).join(', ') + ')';
      
      expect(() => QueryValidator.validateParameterPlaceholders(query, tooManyParams)).toThrow('Too many parameters');
    });
  });
  
  describe('validateQueryStructure', () => {
    it('should accept valid queries of each type', () => {
      const validQueries = [
        { query: 'SELECT * FROM users WHERE id = $1', type: 'SELECT' as const },
        { query: 'INSERT INTO users (name) VALUES ($1)', type: 'INSERT' as const },
        { query: 'UPDATE users SET name = $1 WHERE id = $2', type: 'UPDATE' as const },
        { query: 'DELETE FROM users WHERE id = $1', type: 'DELETE' as const }
      ];
      
      validQueries.forEach(({ query, type }) => {
        expect(() => QueryValidator.validateQueryStructure(query, type)).not.toThrow();
      });
    });
    
    it('should reject queries that don\'t match expected type', () => {
      const invalidQueries = [
        { query: 'SELECT * FROM users', type: 'INSERT' as const },
        { query: 'INSERT INTO users VALUES (1)', type: 'SELECT' as const },
        { query: 'UPDATE users SET name = "John"', type: 'DELETE' as const },
        { query: 'DELETE FROM users', type: 'UPDATE' as const }
      ];
      
      invalidQueries.forEach(({ query, type }) => {
        expect(() => QueryValidator.validateQueryStructure(query, type)).toThrow(`Expected ${type} query`);
      });
    });
    
    it('should reject queries that are too long', () => {
      const longQuery = 'SELECT ' + 'column_name, '.repeat(1000) + 'id FROM users';
      expect(() => QueryValidator.validateQueryStructure(longQuery, 'SELECT')).toThrow('too long');
    });
    
    it('should reject malformed query structures', () => {
      const malformedQueries = [
        { query: 'SELECT column_name', type: 'SELECT' as const }, // Missing FROM
        { query: 'INSERT users VALUES (1)', type: 'INSERT' as const }, // Missing INTO
        { query: 'UPDATE users WHERE id = 1', type: 'UPDATE' as const }, // Missing SET
        { query: 'DELETE users WHERE id = 1', type: 'DELETE' as const } // Missing FROM
      ];
      
      malformedQueries.forEach(({ query, type }) => {
        expect(() => QueryValidator.validateQueryStructure(query, type)).toThrow();
      });
    });
    
    it('should warn about dangerous SELECT operations', () => {
      const dangerousSelects = [
        'SELECT * FROM users INTO OUTFILE "/tmp/users.txt"',
        'SELECT LOAD_FILE("/etc/passwd") FROM users'
      ];
      
      dangerousSelects.forEach(query => {
        expect(() => QueryValidator.validateQueryStructure(query, 'SELECT')).toThrow('dangerous operation');
      });
    });
    
    it('should require WHERE clause for DELETE queries', () => {
      expect(() => QueryValidator.validateQueryStructure('DELETE FROM users', 'DELETE')).toThrow('must include WHERE clause');
    });
  });
});

describe('QueryIntegrityChecker', () => {
  describe('generateQueryHash', () => {
    it('should generate consistent hashes for same query and values', () => {
      const query = 'SELECT * FROM users WHERE id = $1';
      const values = [123];
      
      const hash1 = QueryIntegrityChecker.generateQueryHash(query, values);
      const hash2 = QueryIntegrityChecker.generateQueryHash(query, values);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex format
    });
    
    it('should generate different hashes for different queries', () => {
      const query1 = 'SELECT * FROM users WHERE id = $1';
      const query2 = 'SELECT * FROM users WHERE name = $1';
      const values = [123];
      
      const hash1 = QueryIntegrityChecker.generateQueryHash(query1, values);
      const hash2 = QueryIntegrityChecker.generateQueryHash(query2, values);
      
      expect(hash1).not.toBe(hash2);
    });
    
    it('should generate different hashes for different values', () => {
      const query = 'SELECT * FROM users WHERE id = $1';
      const values1 = [123];
      const values2 = [456];
      
      const hash1 = QueryIntegrityChecker.generateQueryHash(query, values1);
      const hash2 = QueryIntegrityChecker.generateQueryHash(query, values2);
      
      expect(hash1).not.toBe(hash2);
    });
  });
  
  describe('verifyQueryIntegrity', () => {
    it('should verify matching queries as valid', () => {
      const query = 'SELECT * FROM users WHERE id = $1';
      const values = [123];
      const hash = QueryIntegrityChecker.generateQueryHash(query, values);
      
      expect(QueryIntegrityChecker.verifyQueryIntegrity(query, values, hash)).toBe(true);
    });
    
    it('should detect tampered queries', () => {
      const originalQuery = 'SELECT * FROM users WHERE id = $1';
      const tamperedQuery = 'SELECT * FROM users WHERE id = $1 OR 1=1';
      const values = [123];
      const hash = QueryIntegrityChecker.generateQueryHash(originalQuery, values);
      
      expect(QueryIntegrityChecker.verifyQueryIntegrity(tamperedQuery, values, hash)).toBe(false);
    });
    
    it('should detect tampered values', () => {
      const query = 'SELECT * FROM users WHERE id = $1';
      const originalValues = [123];
      const tamperedValues = [456];
      const hash = QueryIntegrityChecker.generateQueryHash(query, originalValues);
      
      expect(QueryIntegrityChecker.verifyQueryIntegrity(query, tamperedValues, hash)).toBe(false);
    });
  });
});

describe('SecureQueryExecutor', () => {
  describe('executeSecureQuery', () => {
    const mockQueryFunction = jest.fn();
    
    beforeEach(() => {
      mockQueryFunction.mockClear();
      mockQueryFunction.mockResolvedValue({ rows: [{ id: 1, name: 'test' }] });
    });
    
    it('should execute valid queries successfully', async () => {
      const query = 'SELECT * FROM users WHERE id = $1';
      const values = [123];
      
      const result = await SecureQueryExecutor.executeSecureQuery(
        mockQueryFunction,
        query,
        values,
        { expectedType: 'SELECT' }
      );
      
      expect(result).toEqual({ rows: [{ id: 1, name: 'test' }] });
      expect(mockQueryFunction).toHaveBeenCalledWith(query, values);
    });
    
    it('should reject queries with SQL injection attempts', async () => {
      const maliciousQuery = 'SELECT * FROM users WHERE id = $1; DROP TABLE users; --';
      const values = [123];
      
      await expect(SecureQueryExecutor.executeSecureQuery(
        mockQueryFunction,
        maliciousQuery,
        values,
        { expectedType: 'SELECT' }
      )).rejects.toThrow('dangerous SQL');
      
      expect(mockQueryFunction).not.toHaveBeenCalled();
    });
    
    it('should enforce query timeout', async () => {
      mockQueryFunction.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 2000)));
      
      const query = 'SELECT * FROM users WHERE id = $1';
      const values = [123];
      
      await expect(SecureQueryExecutor.executeSecureQuery(
        mockQueryFunction,
        query,
        values,
        { expectedType: 'SELECT', timeout: 100 }
      )).rejects.toThrow('timeout');
    });
    
    it('should validate parameter placeholders', async () => {
      const query = 'SELECT * FROM users WHERE id = $1 AND name = $2';
      const values = [123]; // Missing second parameter
      
      await expect(SecureQueryExecutor.executeSecureQuery(
        mockQueryFunction,
        query,
        values,
        { expectedType: 'SELECT' }
      )).rejects.toThrow('Parameter count mismatch');
      
      expect(mockQueryFunction).not.toHaveBeenCalled();
    });
  });
});

describe('SecureQuery Helpers', () => {
  const mockQueryFunction = jest.fn();
  
  beforeEach(() => {
    mockQueryFunction.mockClear();
    mockQueryFunction.mockResolvedValue({ rows: [{ id: 1, name: 'test' }] });
  });
  
  it('should execute secure SELECT queries', async () => {
    const query = 'SELECT * FROM users WHERE id = $1';
    const values = [123];
    
    const result = await SecureQuery.select(mockQueryFunction, query, values);
    
    expect(result).toEqual({ rows: [{ id: 1, name: 'test' }] });
    expect(mockQueryFunction).toHaveBeenCalledWith(query, values);
  });
  
  it('should execute secure INSERT queries', async () => {
    const query = 'INSERT INTO users (name) VALUES ($1) RETURNING id';
    const values = ['John'];
    
    const result = await SecureQuery.insert(mockQueryFunction, query, values);
    
    expect(result).toEqual({ rows: [{ id: 1, name: 'test' }] });
    expect(mockQueryFunction).toHaveBeenCalledWith(query, values);
  });
  
  it('should execute secure UPDATE queries', async () => {
    const query = 'UPDATE users SET name = $1 WHERE id = $2 RETURNING *';
    const values = ['Jane', 123];
    
    const result = await SecureQuery.update(mockQueryFunction, query, values);
    
    expect(result).toEqual({ rows: [{ id: 1, name: 'test' }] });
    expect(mockQueryFunction).toHaveBeenCalledWith(query, values);
  });
  
  it('should execute secure DELETE queries', async () => {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
    const values = [123];
    
    const result = await SecureQuery.delete(mockQueryFunction, query, values);
    
    expect(result).toEqual({ rows: [{ id: 1, name: 'test' }] });
    expect(mockQueryFunction).toHaveBeenCalledWith(query, values);
  });
  
  it('should reject queries that don\'t match the expected type', async () => {
    const insertQuery = 'INSERT INTO users (name) VALUES ($1)';
    const values = ['John'];
    
    // Try to execute INSERT query with SELECT helper
    await expect(SecureQuery.select(mockQueryFunction, insertQuery, values)).rejects.toThrow('Expected SELECT query');
    
    expect(mockQueryFunction).not.toHaveBeenCalled();
  });
});

// Performance and stress tests
describe('Security Performance Tests', () => {
  it('should handle large parameter arrays efficiently', () => {
    const largeValues = new Array(100).fill('test');
    const query = 'SELECT * FROM users WHERE id IN (' + largeValues.map((_, i) => `$${i + 1}`).join(', ') + ')';
    
    const startTime = Date.now();
    expect(() => QueryValidator.validateParameterPlaceholders(query, largeValues)).not.toThrow();
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
  });
  
  it('should handle complex WHERE clauses efficiently', () => {
    const complexWhere = 'id = $1 AND name LIKE $2 AND created_at >= $3 AND updated_at <= $4 AND status IN ($5, $6, $7) AND deleted_at IS NULL';
    
    const startTime = Date.now();
    expect(() => InputSanitizer.validateWhereClause(complexWhere)).not.toThrow();
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(50); // Should complete in under 50ms
  });
  
  it('should generate hashes consistently and quickly', () => {
    const query = 'SELECT * FROM users WHERE id = $1';
    const values = [123];
    
    const startTime = Date.now();
    const hashes = new Array(100).fill(null).map(() => 
      QueryIntegrityChecker.generateQueryHash(query, values)
    );
    const endTime = Date.now();
    
    // All hashes should be identical
    expect(new Set(hashes).size).toBe(1);
    
    // Should complete 100 hash generations in under 100ms
    expect(endTime - startTime).toBeLessThan(100);
  });
});