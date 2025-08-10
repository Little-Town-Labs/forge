/**
 * Field-Level Encryption Utilities for Sensitive Configuration Data
 * 
 * Provides secure encryption/decryption for API keys and other sensitive
 * configuration data stored in the Vercel Postgres database.
 */

// @ts-expect-error - Package will be installed during deployment
import * as bcrypt from 'bcryptjs';
import { createHash, createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const PBKDF2_ITERATIONS = 100000;

// Encrypted data format version for future compatibility
const ENCRYPTION_VERSION = '1';
const ENCRYPTED_PREFIX = `enc:${ENCRYPTION_VERSION}:`;

/**
 * Get or generate encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const keyString = process.env.CONFIG_ENCRYPTION_KEY;
  
  if (!keyString) {
    throw new Error('CONFIG_ENCRYPTION_KEY environment variable is required for encryption');
  }
  
  if (keyString.length < 32) {
    throw new Error('CONFIG_ENCRYPTION_KEY must be at least 32 characters long');
  }
  
  // Use PBKDF2 to derive a consistent key from the environment variable
  // Security: Use a random salt derived from the key itself for consistency
  const saltSource = createHash('sha512').update(keyString + 'forge-salt-v2').digest();
  const salt = saltSource.slice(0, SALT_LENGTH);
  return pbkdf2Sync(keyString, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Generate a random salt for key derivation
 */
function generateSalt(): Buffer {
  return randomBytes(SALT_LENGTH);
}

/**
 * Generate a random initialization vector
 */
function generateIV(): Buffer {
  return randomBytes(IV_LENGTH);
}

/**
 * Encrypt sensitive data like API keys
 */
export function encryptApiKey(plaintext: string): string {
  let key: Buffer | null = null;
  let derivedKey: Buffer | null = null;
  
  try {
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Invalid plaintext: must be a non-empty string');
    }
    
    key = getEncryptionKey();
    const iv = generateIV();
    const salt = generateSalt();
    
    // Derive key with unique salt for additional security
    derivedKey = pbkdf2Sync(key, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
    
    const cipher = createCipheriv(ALGORITHM, derivedKey, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const tag = cipher.getAuthTag();
    
    // Combine salt, iv, tag, and encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'base64')
    ]);
    
    return ENCRYPTED_PREFIX + combined.toString('base64');
  } catch (error) {
    // Security: Log detailed error server-side but return generic message
    console.error('Encryption failed:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Encryption operation failed');
  } finally {
    // Security: Clear sensitive key material from memory
    if (key) key.fill(0);
    if (derivedKey) derivedKey.fill(0);
  }
}

/**
 * Decrypt sensitive data like API keys
 */
export function decryptApiKey(encryptedData: string): string {
  let key: Buffer | null = null;
  let derivedKey: Buffer | null = null;
  
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Invalid encrypted data: must be a non-empty string');
    }
    
    if (!encryptedData.startsWith(ENCRYPTED_PREFIX)) {
      throw new Error('Invalid encrypted data format: missing prefix');
    }
    
    key = getEncryptionKey();
    const dataWithoutPrefix = encryptedData.slice(ENCRYPTED_PREFIX.length);
    const combined = Buffer.from(dataWithoutPrefix, 'base64');
    
    if (combined.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1) {
      throw new Error('Invalid encrypted data format: insufficient length');
    }
    
    // Extract components
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Derive key with the same salt used for encryption
    derivedKey = pbkdf2Sync(key, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
    
    const decipher = createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // Security: Log detailed error server-side but return generic message
    console.error('Decryption failed:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Decryption operation failed');
  } finally {
    // Security: Clear sensitive key material from memory
    if (key) key.fill(0);
    if (derivedKey) derivedKey.fill(0);
  }
}

/**
 * Check if data is encrypted (has the encryption prefix)
 */
export function isEncrypted(data: string): boolean {
  return typeof data === 'string' && data.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Safely encrypt data only if it's not already encrypted
 */
export function encryptIfNeeded(data: string): string {
  if (isEncrypted(data)) {
    return data; // Already encrypted
  }
  return encryptApiKey(data);
}

/**
 * Safely decrypt data only if it's encrypted
 */
export function decryptIfNeeded(data: string): string {
  if (!isEncrypted(data)) {
    return data; // Not encrypted, return as-is
  }
  return decryptApiKey(data);
}

/**
 * Generate a secure random encryption key for CONFIG_ENCRYPTION_KEY
 * This is a utility function for initial setup
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validate encryption key format
 */
export function validateEncryptionKey(key?: string): {
  isValid: boolean;
  error?: string;
} {
  if (!key) {
    return {
      isValid: false,
      error: 'CONFIG_ENCRYPTION_KEY is not set'
    };
  }
  
  if (typeof key !== 'string') {
    return {
      isValid: false,
      error: 'CONFIG_ENCRYPTION_KEY must be a string'
    };
  }
  
  if (key.length < 32) {
    return {
      isValid: false,
      error: 'CONFIG_ENCRYPTION_KEY must be at least 32 characters long'
    };
  }
  
  return { isValid: true };
}

/**
 * Hash sensitive data for comparison (one-way)
 * Used for additional security checks and auditing
 */
export async function hashSensitiveData(data: string): Promise<string> {
  const saltRounds = 12;
  try {
    return await bcrypt.hash(data, saltRounds);
  } catch (error) {
    console.error('Hashing failed:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Hash operation failed');
  }
}

/**
 * Compare hashed sensitive data
 */
export async function compareHashedData(data: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(data, hash);
  } catch (error) {
    console.error('Hash comparison failed:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Hash comparison failed');
  }
}

/**
 * Mask sensitive data for logging and display
 */
export function maskApiKey(apiKey: string, visibleChars: number = 4): string {
  if (!apiKey || typeof apiKey !== 'string') {
    return '[INVALID]';
  }
  
  if (isEncrypted(apiKey)) {
    return '[ENCRYPTED]';
  }
  
  if (apiKey.length <= visibleChars * 2) {
    return '*'.repeat(apiKey.length);
  }
  
  const start = apiKey.substring(0, visibleChars);
  const end = apiKey.substring(apiKey.length - visibleChars);
  const middle = '*'.repeat(Math.max(8, apiKey.length - visibleChars * 2));
  
  return `${start}${middle}${end}`;
}

/**
 * Test encryption/decryption functionality
 * Used for system health checks
 */
export function testEncryption(): {
  success: boolean;
  error?: string;
  roundTripTime: number;
} {
  const startTime = Date.now();
  const testData = 'test-api-key-12345';
  
  try {
    const encrypted = encryptApiKey(testData);
    const decrypted = decryptApiKey(encrypted);
    
    if (decrypted !== testData) {
      return {
        success: false,
        error: 'Decrypted data does not match original',
        roundTripTime: Date.now() - startTime
      };
    }
    
    return {
      success: true,
      roundTripTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown encryption test error',
      roundTripTime: Date.now() - startTime
    };
  }
}