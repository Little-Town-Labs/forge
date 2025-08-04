/**
 * Rate Limiting Utility for Forge Application
 * 
 * Supports multiple backends:
 * - Redis (production recommended)
 * - In-memory (development only)
 * - Disabled (relies on Clerk's built-in limits)
 */

import { createClient, RedisClientType } from 'redis';

// Safe defaults for rate limiting
const DEFAULT_MAX_PER_MINUTE = 5;
const DEFAULT_MAX_PER_HOUR = 20;

// Reasonable bounds for rate limiting
const MIN_PER_MINUTE = 1;
const MAX_PER_MINUTE = 100;
const MIN_PER_HOUR = 1;
const MAX_PER_HOUR = 1000;

/**
 * Validate and parse rate limiting environment variables
 */
function validateRateLimitConfig(): {
  maxPerMinute: number;
  maxPerHour: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  let maxPerMinute = DEFAULT_MAX_PER_MINUTE;
  let maxPerHour = DEFAULT_MAX_PER_HOUR;

  // Validate MAX_INVITATIONS_PER_MINUTE
  const perMinuteEnv = process.env.MAX_INVITATIONS_PER_MINUTE;
  if (perMinuteEnv) {
    const parsed = parseInt(perMinuteEnv, 10);
    if (isNaN(parsed) || !isFinite(parsed)) {
      warnings.push(`Invalid MAX_INVITATIONS_PER_MINUTE: "${perMinuteEnv}" is not a valid number. Using default: ${DEFAULT_MAX_PER_MINUTE}`);
    } else if (parsed < MIN_PER_MINUTE) {
      warnings.push(`MAX_INVITATIONS_PER_MINUTE: ${parsed} is too low (minimum: ${MIN_PER_MINUTE}). Using minimum: ${MIN_PER_MINUTE}`);
      maxPerMinute = MIN_PER_MINUTE;
    } else if (parsed > MAX_PER_MINUTE) {
      warnings.push(`MAX_INVITATIONS_PER_MINUTE: ${parsed} is too high (maximum: ${MAX_PER_MINUTE}). Using maximum: ${MAX_PER_MINUTE}`);
      maxPerMinute = MAX_PER_MINUTE;
    } else {
      maxPerMinute = parsed;
    }
  }

  // Validate MAX_INVITATIONS_PER_HOUR
  const perHourEnv = process.env.MAX_INVITATIONS_PER_HOUR;
  if (perHourEnv) {
    const parsed = parseInt(perHourEnv, 10);
    if (isNaN(parsed) || !isFinite(parsed)) {
      warnings.push(`Invalid MAX_INVITATIONS_PER_HOUR: "${perHourEnv}" is not a valid number. Using default: ${DEFAULT_MAX_PER_HOUR}`);
    } else if (parsed < MIN_PER_HOUR) {
      warnings.push(`MAX_INVITATIONS_PER_HOUR: ${parsed} is too low (minimum: ${MIN_PER_HOUR}). Using minimum: ${MIN_PER_HOUR}`);
      maxPerHour = MIN_PER_HOUR;
    } else if (parsed > MAX_PER_HOUR) {
      warnings.push(`MAX_INVITATIONS_PER_HOUR: ${parsed} is too high (maximum: ${MAX_PER_HOUR}). Using maximum: ${MAX_PER_HOUR}`);
      maxPerHour = MAX_PER_HOUR;
    } else {
      maxPerHour = parsed;
    }
  }

  // Validate logical relationship between per-minute and per-hour limits
  if (maxPerMinute * 60 > maxPerHour) {
    warnings.push(`Rate limit configuration issue: ${maxPerMinute}/minute * 60 = ${maxPerMinute * 60}/hour exceeds ${maxPerHour}/hour limit. Consider adjusting the values.`);
  }

  return { maxPerMinute, maxPerHour, warnings };
}

// Validate and set rate limiting configuration
const rateLimitConfig = validateRateLimitConfig();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_INVITATIONS_PER_WINDOW = rateLimitConfig.maxPerMinute;
const MAX_INVITATIONS_PER_HOUR = rateLimitConfig.maxPerHour;
const HOURLY_WINDOW_MS = 60 * 60 * 1000; // 1 hour window

// Log any validation warnings
if (rateLimitConfig.warnings.length > 0) {
  console.warn('⚠️  Rate limiting configuration warnings:');
  rateLimitConfig.warnings.forEach(warning => console.warn(`   ${warning}`));
}

// Rate limiting mode configuration
type RateLimitMode = 'redis' | 'memory' | 'disabled';

const getRateLimitMode = (): RateLimitMode => {
  const mode = process.env.RATE_LIMIT_MODE?.toLowerCase() as RateLimitMode;
  
  // Auto-detect based on environment
  if (!mode) {
    if (process.env.REDIS_URL) {
      return 'redis';
    } else if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️  PRODUCTION WARNING: No Redis configured, rate limiting disabled. Consider setting REDIS_URL for proper rate limiting.');
      return 'disabled';
    } else {
      return 'memory';
    }
  }
  
  return ['redis', 'memory', 'disabled'].includes(mode) ? mode : 'memory';
};

const RATE_LIMIT_MODE = getRateLimitMode();

// Rate limit result interface
export interface RateLimitResult {
  allowed: boolean;
  error?: string;
  retryAfter?: number;
  remaining?: number;
  hourlyRemaining?: number;
  resetTime?: number;
  backend: RateLimitMode;
}

// In-memory store for development
interface RateLimitRecord {
  count: number;
  windowStart: number;
  hourlyCount: number;
  hourlyWindowStart: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// Redis client (lazily initialized)
let redisClient: RedisClientType | null = null;

/**
 * Initialize Redis client if needed
 */
async function getRedisClient(): Promise<RedisClientType | null> {
  if (RATE_LIMIT_MODE !== 'redis') {
    return null;
  }
  
  if (redisClient) {
    return redisClient;
  }
  
  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.error('❌ Redis rate limiting enabled but REDIS_URL not configured');
      return null;
    }
    
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        lazyConnect: true
      }
    });
    
    redisClient.on('error', (err) => {
      console.error('Redis client error:', err);
    });
    
    redisClient.on('connect', () => {
      console.log('✅ Redis connected for rate limiting');
    });
    
    await redisClient.connect();
    return redisClient;
    
  } catch (error) {
    console.error('❌ Failed to initialize Redis client:', error);
    return null;
  }
}

/**
 * Redis-based rate limiting
 */
async function checkRateLimitRedis(userId: string): Promise<RateLimitResult> {
  const client = await getRedisClient();
  
  if (!client) {
    // Fallback to disabled mode if Redis fails
    console.warn('⚠️  Redis unavailable, falling back to disabled rate limiting');
    return {
      allowed: true,
      backend: 'disabled'
    };
  }
  
  const now = Date.now();
  const minuteKey = `rate_limit:${userId}:minute:${Math.floor(now / RATE_LIMIT_WINDOW_MS)}`;
  const hourKey = `rate_limit:${userId}:hour:${Math.floor(now / HOURLY_WINDOW_MS)}`;
  
  try {
    // Use Redis pipeline for atomic operations
    const pipeline = client.multi();
    pipeline.incr(minuteKey);
    pipeline.expire(minuteKey, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
    pipeline.incr(hourKey);
    pipeline.expire(hourKey, Math.ceil(HOURLY_WINDOW_MS / 1000));
    
    const results = await pipeline.exec() as [null, number][];
    const minuteCount = results[0][1];
    const hourlyCount = results[2][1];
    
    // Check hourly limit first
    if (hourlyCount > MAX_INVITATIONS_PER_HOUR) {
      const retryAfter = Math.ceil(HOURLY_WINDOW_MS / 1000);
      return {
        allowed: false,
        error: `Hourly limit exceeded. You can send ${MAX_INVITATIONS_PER_HOUR} invitations per hour. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
        retryAfter,
        backend: 'redis'
      };
    }
    
    // Check per-minute limit
    if (minuteCount > MAX_INVITATIONS_PER_WINDOW) {
      const retryAfter = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
      return {
        allowed: false,
        error: `Rate limit exceeded. You can send ${MAX_INVITATIONS_PER_WINDOW} invitations per minute. Try again in ${retryAfter} seconds.`,
        retryAfter,
        backend: 'redis'
      };
    }
    
    return {
      allowed: true,
      remaining: Math.max(0, MAX_INVITATIONS_PER_WINDOW - minuteCount),
      hourlyRemaining: Math.max(0, MAX_INVITATIONS_PER_HOUR - hourlyCount),
      resetTime: Math.ceil((now + RATE_LIMIT_WINDOW_MS) / 1000),
      backend: 'redis'
    };
    
  } catch (error) {
    console.error('Redis rate limiting error:', error);
    // Fallback to allowing request on Redis errors
    return {
      allowed: true,
      backend: 'disabled',
      error: 'Rate limiting temporarily unavailable'
    };
  }
}

/**
 * In-memory rate limiting (development only)
 */
function checkRateLimitMemory(userId: string): RateLimitResult {
  const now = Date.now();
  const record = memoryStore.get(userId);
  
  if (!record) {
    // First request - create new record
    memoryStore.set(userId, {
      count: 1,
      windowStart: now,
      hourlyCount: 1,
      hourlyWindowStart: now,
    });
    return { 
      allowed: true,
      remaining: MAX_INVITATIONS_PER_WINDOW - 1,
      hourlyRemaining: MAX_INVITATIONS_PER_HOUR - 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
      backend: 'memory'
    };
  }
  
  // Check hourly limit
  if (now - record.hourlyWindowStart < HOURLY_WINDOW_MS) {
    if (record.hourlyCount >= MAX_INVITATIONS_PER_HOUR) {
      const retryAfter = Math.ceil((HOURLY_WINDOW_MS - (now - record.hourlyWindowStart)) / 1000);
      return { 
        allowed: false, 
        error: `Hourly limit exceeded. You can send ${MAX_INVITATIONS_PER_HOUR} invitations per hour. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
        retryAfter,
        backend: 'memory'
      };
    }
  } else {
    // Reset hourly window
    record.hourlyCount = 0;
    record.hourlyWindowStart = now;
  }
  
  // Check per-minute limit
  if (now - record.windowStart < RATE_LIMIT_WINDOW_MS) {
    if (record.count >= MAX_INVITATIONS_PER_WINDOW) {
      const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - record.windowStart)) / 1000);
      return { 
        allowed: false, 
        error: `Rate limit exceeded. You can send ${MAX_INVITATIONS_PER_WINDOW} invitations per minute. Try again in ${retryAfter} seconds.`,
        retryAfter,
        backend: 'memory'
      };
    }
    record.count++;
  } else {
    // Reset minute window
    record.count = 1;
    record.windowStart = now;
  }
  
  // Increment hourly counter
  record.hourlyCount++;
  
  return { 
    allowed: true,
    remaining: MAX_INVITATIONS_PER_WINDOW - record.count,
    hourlyRemaining: MAX_INVITATIONS_PER_HOUR - record.hourlyCount,
    resetTime: record.windowStart + RATE_LIMIT_WINDOW_MS,
    backend: 'memory'
  };
}

/**
 * Clean up old in-memory records (development only)
 */
function cleanupMemoryStore() {
  if (RATE_LIMIT_MODE !== 'memory') return;
  
  const now = Date.now();
  for (const [userId, record] of memoryStore.entries()) {
    // Remove records older than 1 hour
    if (now - record.hourlyWindowStart > HOURLY_WINDOW_MS && now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
      memoryStore.delete(userId);
    }
  }
}

// Set up cleanup interval for in-memory store
if (RATE_LIMIT_MODE === 'memory') {
  setInterval(cleanupMemoryStore, 5 * 60 * 1000); // Clean up every 5 minutes
}

/**
 * Main rate limiting function
 */
export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  switch (RATE_LIMIT_MODE) {
    case 'redis':
      return await checkRateLimitRedis(userId);
    
    case 'memory':
      return checkRateLimitMemory(userId);
    
    case 'disabled':
    default:
      return {
        allowed: true,
        backend: 'disabled'
      };
  }
}

/**
 * Get current rate limiting configuration and status
 */
export function getRateLimitInfo() {
  return {
    mode: RATE_LIMIT_MODE,
    config: {
      maxPerMinute: MAX_INVITATIONS_PER_WINDOW,
      maxPerHour: MAX_INVITATIONS_PER_HOUR,
      windowMs: RATE_LIMIT_WINDOW_MS,
      hourlyWindowMs: HOURLY_WINDOW_MS
    },
    environment: {
      redisConfigured: !!process.env.REDIS_URL,
      nodeEnv: process.env.NODE_ENV,
      rateLimitModeEnv: process.env.RATE_LIMIT_MODE
    },
    validation: {
      warnings: rateLimitConfig.warnings,
      isValid: rateLimitConfig.warnings.length === 0
    }
  };
}

/**
 * Get rate limiting configuration validation results
 * Useful for API endpoints that need to report configuration issues
 */
export function getRateLimitValidation() {
  return {
    warnings: rateLimitConfig.warnings,
    isValid: rateLimitConfig.warnings.length === 0,
    config: {
      maxPerMinute: MAX_INVITATIONS_PER_WINDOW,
      maxPerHour: MAX_INVITATIONS_PER_HOUR,
      defaults: {
        maxPerMinute: DEFAULT_MAX_PER_MINUTE,
        maxPerHour: DEFAULT_MAX_PER_HOUR
      },
      bounds: {
        minPerMinute: MIN_PER_MINUTE,
        maxPerMinute: MAX_PER_MINUTE,
        minPerHour: MIN_PER_HOUR,
        maxPerHour: MAX_PER_HOUR
      }
    }
  };
}

// Log rate limiting configuration on startup
const rateLimitInfo = getRateLimitInfo();
const emoji = RATE_LIMIT_MODE === 'redis' ? '🔴' : RATE_LIMIT_MODE === 'memory' ? '🟡' : '⚪';

console.log(`${emoji} Rate limiting: ${RATE_LIMIT_MODE.toUpperCase()} mode`);
console.log(`   Limits: ${MAX_INVITATIONS_PER_WINDOW}/minute, ${MAX_INVITATIONS_PER_HOUR}/hour per admin`);

if (RATE_LIMIT_MODE === 'memory' && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  PRODUCTION WARNING: Using in-memory rate limiting. This will not work with multiple instances!');
  console.warn('   Consider setting REDIS_URL or RATE_LIMIT_MODE=disabled for production.');
}

if (RATE_LIMIT_MODE === 'disabled') {
  console.warn('⚠️  Rate limiting disabled - relying on Clerk\'s built-in limits only.');
}

/**
 * Gracefully close Redis connection
 */
export async function closeRateLimitConnections() {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    console.log('✅ Redis rate limiting connection closed');
  }
}