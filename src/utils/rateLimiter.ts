/**
 * Rate Limiting Utility for Forge Application
 * 
 * Supports multiple backends:
 * - Redis (production recommended)
 * - In-memory (development only)
 * - Disabled (relies on Clerk's built-in limits)
 */

import { createClient, RedisClientType } from 'redis';
import { createClerkClient } from "@clerk/backend";
import { isAdmin } from '@/utils/admin';

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
        connectTimeout: 5000
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
    
    const results = await pipeline.exec() as unknown as [null, number][];
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
 * Handles both invitation rate limit keys (userId) and crawl rate limit keys (crawl_limit:userId:mode:hour)
 */
function cleanupMemoryStore() {
  if (RATE_LIMIT_MODE !== 'memory') return;
  
  const now = Date.now();
  let invitationKeysCleanedUp = 0;
  let crawlKeysCleanedUp = 0;
  
  for (const [key, record] of memoryStore.entries()) {
    let shouldDelete = false;
    
    if (key.startsWith('crawl_limit:')) {
      // Handle crawl rate limit keys: crawl_limit:userId:crawlMode:hour
      // These only use hourly windows, so check hourlyWindowStart only
      if (now - record.hourlyWindowStart > HOURLY_WINDOW_MS) {
        shouldDelete = true;
        crawlKeysCleanedUp++;
      }
    } else {
      // Handle invitation rate limit keys (simple userId format)
      // These use both minute and hourly windows, so check both
      const minuteWindowExpired = now - record.windowStart > RATE_LIMIT_WINDOW_MS;
      const hourlyWindowExpired = now - record.hourlyWindowStart > HOURLY_WINDOW_MS;
      
      if (minuteWindowExpired && hourlyWindowExpired) {
        shouldDelete = true;
        invitationKeysCleanedUp++;
      }
    }
    
    if (shouldDelete) {
      memoryStore.delete(key);
    }
  }
  
  // Log cleanup activity for debugging (only if something was cleaned up)
  if (invitationKeysCleanedUp > 0 || crawlKeysCleanedUp > 0) {
    console.log(`🧹 Memory store cleanup: ${invitationKeysCleanedUp} invitation keys, ${crawlKeysCleanedUp} crawl keys removed`);
  }
}

/**
 * Get memory store statistics for monitoring and debugging
 */
function getMemoryStoreStats(): {
  totalKeys: number;
  invitationKeys: number;
  crawlKeys: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  memoryUsageKB: number;
} {
  if (RATE_LIMIT_MODE !== 'memory') {
    return {
      totalKeys: 0,
      invitationKeys: 0,
      crawlKeys: 0,
      oldestEntry: null,
      newestEntry: null,
      memoryUsageKB: 0
    };
  }

  const now = Date.now();
  let invitationKeys = 0;
  let crawlKeys = 0;
  let oldestEntry: number | null = null;
  let newestEntry: number | null = null;

  for (const [key, record] of memoryStore.entries()) {
    if (key.startsWith('crawl_limit:')) {
      crawlKeys++;
    } else {
      invitationKeys++;
    }

    // Track oldest and newest entries
    const entryAge = Math.min(
      record.windowStart || now,
      record.hourlyWindowStart || now
    );

    if (oldestEntry === null || entryAge < oldestEntry) {
      oldestEntry = entryAge;
    }
    if (newestEntry === null || entryAge > newestEntry) {
      newestEntry = entryAge;
    }
  }

  // Rough memory usage estimation (each record ~200-300 bytes)
  const estimatedMemoryKB = Math.round(memoryStore.size * 0.25);

  return {
    totalKeys: memoryStore.size,
    invitationKeys,
    crawlKeys,
    oldestEntry,
    newestEntry,
    memoryUsageKB: estimatedMemoryKB
  };
}

// Set up cleanup interval for in-memory store
if (RATE_LIMIT_MODE === 'memory') {
  setInterval(cleanupMemoryStore, 5 * 60 * 1000); // Clean up every 5 minutes
  
  // Log initial memory store setup
  console.log('🟡 Memory-based rate limiting initialized');
  console.log('   Cleanup interval: 5 minutes');
  console.log('   Supports: invitation limits + crawl limits');
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
  const baseInfo = {
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

  // Add memory store statistics if in memory mode
  if (RATE_LIMIT_MODE === 'memory') {
    return {
      ...baseInfo,
      memoryStore: getMemoryStoreStats()
    };
  }

  return baseInfo;
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
 * Check crawl rate limits based on crawl mode
 */
export async function checkCrawlRateLimit(userId: string, crawlMode: string): Promise<RateLimitResult> {
  // Get environment variables for crawl rate limits
  const maxSingleCrawlsPerHour = parseInt(process.env.MAX_SINGLE_CRAWLS_PER_HOUR || '60');
  const maxLimitedCrawlsPerHour = parseInt(process.env.MAX_LIMITED_CRAWLS_PER_HOUR || '10');
  const maxDeepCrawlsPerHour = parseInt(process.env.MAX_DEEP_CRAWLS_PER_HOUR || '3');
  
  // Define limits based on crawl mode
  const crawlLimits = {
    single: { perHour: maxSingleCrawlsPerHour },
    limited: { perHour: maxLimitedCrawlsPerHour },
    deep: { perHour: maxDeepCrawlsPerHour }
  };
  
  const limits = crawlLimits[crawlMode as keyof typeof crawlLimits];
  if (!limits) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: Date.now(),
      error: `Invalid crawl mode: ${crawlMode}`,
      backend: RATE_LIMIT_MODE
    };
  }

  // Check if user is admin (admins can bypass crawl limits)
  // Use enhanced diagnostics for better troubleshooting
  const emailResult = await getUserEmailWithDiagnostics(userId);
  
  if (emailResult.email === null) {
    // getUserEmail returned null - this could indicate various issues
    console.warn(`⚠️  Email lookup failed for user ${userId} during crawl rate limit check.`);
    
    if (!emailResult.diagnosticsRan) {
      // Run additional diagnostics if they weren't already run
      console.warn('   This may affect admin privilege detection. Potential causes:');
      console.warn('   - User not found in Clerk');
      console.warn('   - Clerk service unavailable');
      console.warn('   - Network connectivity issues');
      console.warn('   - Invalid CLERK_SECRET_KEY configuration');
    }
    
    // Check for emergency admin bypass as fallback
    if (process.env.EMERGENCY_ADMIN_USER_IDS) {
      const emergencyIds = process.env.EMERGENCY_ADMIN_USER_IDS.split(',').map(id => id.trim()).filter(Boolean);
      if (emergencyIds.includes(userId)) {
        console.warn(`🚨 EMERGENCY BYPASS: User ${userId} found in EMERGENCY_ADMIN_USER_IDS - bypassing rate limits`);
        console.warn('   → This is a fallback mechanism when normal admin detection fails');
        console.warn('   → Consider fixing the underlying email lookup issue for proper admin detection');
        return {
          allowed: true,
          remaining: 999,
          resetTime: Date.now() + 3600000,
          backend: RATE_LIMIT_MODE
        };
      }
    }
    
    console.warn('   → Proceeding with standard rate limits (admin bypass unavailable)');
    
    // Continue with standard rate limiting since we can't verify admin status
    // This is safer than failing the entire request
  } else if (emailResult.email && isAdmin(emailResult.email)) {
    console.log(`✅ Admin user ${emailResult.email} bypassing ${crawlMode} crawl rate limits`);
    return {
      allowed: true,
      remaining: 999,
      resetTime: Date.now() + 3600000,
      backend: RATE_LIMIT_MODE
    };
  } else if (emailResult.email) {
    // Email found but user is not an admin
    console.log(`🔒 Standard rate limits applied for user: ${emailResult.email} (${crawlMode} crawl)`);
  }

  // If rate limiting is disabled, allow all crawls
  if (RATE_LIMIT_MODE === 'disabled') {
    return {
      allowed: true,
      remaining: 999,
      resetTime: Date.now() + 3600000,
      backend: 'disabled'
    };
  }

  const hourlyKey = `crawl_limit:${userId}:${crawlMode}:hour`;
  const now = Date.now();
  const hourStart = now - (now % HOURLY_WINDOW_MS);

  try {
    if (RATE_LIMIT_MODE === 'redis' && redisClient) {
      await ensureRedisConnection();
      
      const pipeline = redisClient.multi();
      pipeline.incr(hourlyKey);
      pipeline.expire(hourlyKey, Math.ceil(HOURLY_WINDOW_MS / 1000));
      
      const results = await pipeline.exec() as unknown as [null, number][];
      const hourlyCount = results[0][1];
      
      if (hourlyCount > limits.perHour) {
        return {
          allowed: false,
          remaining: 0,
          hourlyRemaining: Math.max(0, limits.perHour - hourlyCount),
          resetTime: hourStart + HOURLY_WINDOW_MS,
          retryAfter: Math.ceil((hourStart + HOURLY_WINDOW_MS - now) / 1000),
          error: `Crawl rate limit exceeded for ${crawlMode} mode. Max ${limits.perHour}/hour allowed.`,
          backend: 'redis'
        };
      }
      
      return {
        allowed: true,
        remaining: Math.max(0, limits.perHour - hourlyCount),
        hourlyRemaining: Math.max(0, limits.perHour - hourlyCount),
        resetTime: hourStart + HOURLY_WINDOW_MS,
        backend: 'redis'
      };
    } else {
      // Memory-based rate limiting for crawls
      const hourlyCount = getMemoryCount(hourlyKey);
      setMemoryCount(hourlyKey, hourlyCount + 1, HOURLY_WINDOW_MS);
      
      if (hourlyCount >= limits.perHour) {
        return {
          allowed: false,
          remaining: 0,
          hourlyRemaining: Math.max(0, limits.perHour - hourlyCount),
          resetTime: hourStart + HOURLY_WINDOW_MS,
          retryAfter: Math.ceil((hourStart + HOURLY_WINDOW_MS - now) / 1000),
          error: `Crawl rate limit exceeded for ${crawlMode} mode. Max ${limits.perHour}/hour allowed.`,
          backend: 'memory'
        };
      }
      
      return {
        allowed: true,
        remaining: Math.max(0, limits.perHour - hourlyCount - 1),
        hourlyRemaining: Math.max(0, limits.perHour - hourlyCount - 1),
        resetTime: hourStart + HOURLY_WINDOW_MS,
        backend: 'memory'
      };
    }
  } catch (error) {
    console.error('Crawl rate limit check failed:', error);
    return {
      allowed: true,
      remaining: limits.perHour,
      resetTime: Date.now() + 3600000,
      backend: RATE_LIMIT_MODE,
      error: 'Rate limit check failed, allowing request'
    };
  }
}

/**
 * Get user email from Clerk using userId
 * @param userId - Clerk user ID
 * @returns User's primary email address or null if not found
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    // Validate input
    if (!userId || typeof userId !== 'string') {
      console.warn('Invalid userId provided to getUserEmail');
      return null;
    }

    // Check if Clerk secret key is configured
    if (!process.env.CLERK_SECRET_KEY) {
      console.warn('CLERK_SECRET_KEY not configured, cannot fetch user email');
      return null;
    }

    // Create Clerk client
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    
    // Fetch user data from Clerk
    const user = await clerk.users.getUser(userId);
    
    // Extract primary email address
    const primaryEmail = user.emailAddresses.find(email => email.id === user.primaryEmailAddressId);
    
    if (primaryEmail) {
      return primaryEmail.emailAddress;
    }
    
    // Fallback to first email if no primary email is set
    if (user.emailAddresses.length > 0) {
      console.warn(`User ${userId} has no primary email set, using first email address`);
      return user.emailAddresses[0].emailAddress;
    }
    
    console.warn(`User ${userId} has no email addresses`);
    return null;
    
  } catch (error: unknown) {
    // Enhanced error handling with admin context warnings
    const errorContext = `getUserEmail(${userId})`;
    
    // Type-safe error checking
    const errorObj = error as { status?: number; code?: string; message?: string; stack?: string };
    
    if (errorObj.status === 404) {
      console.warn(`${errorContext}: User not found in Clerk`);
      console.warn('   → If this user should be an admin, verify they exist in Clerk dashboard');
      return null;
    }
    
    if (errorObj.status === 403 || errorObj.status === 401) {
      console.error(`${errorContext}: Clerk authentication error - check CLERK_SECRET_KEY configuration`);
      console.error('   ⚠️  CRITICAL: Admin privilege detection is compromised!');
      console.error('   → Admin users will not be able to bypass rate limits');
      console.error('   → Verify CLERK_SECRET_KEY in environment variables');
      return null;
    }
    
    // Handle rate limiting from Clerk itself
    if (errorObj.status === 429) {
      console.error(`${errorContext}: Clerk API rate limit exceeded`);
      console.error('   ⚠️  WARNING: Admin privilege detection temporarily unavailable');
      console.error('   → Admin users will be subject to standard rate limits');
      return null;
    }
    
    // Handle network/timeout errors
    if (errorObj.code === 'ECONNREFUSED' || errorObj.code === 'ETIMEDOUT') {
      console.error(`${errorContext}: Network error connecting to Clerk - ${errorObj.message || 'Unknown error'}`);
      console.error('   ⚠️  WARNING: Admin privilege detection unavailable due to connectivity');
      console.error('   → Admin users will be subject to standard rate limits until connectivity is restored');
      return null;
    }
    
    // Handle service unavailable
    if (errorObj.status === 503 || errorObj.status === 502 || errorObj.status === 500) {
      console.error(`${errorContext}: Clerk service unavailable (HTTP ${errorObj.status})`);
      console.error('   ⚠️  WARNING: Admin privilege detection temporarily unavailable');
      console.error('   → Admin users will be subject to standard rate limits');
      return null;
    }
    
    // Log unexpected errors with more context
    console.error(`${errorContext}: Unexpected error fetching user email from Clerk:`, {
      message: errorObj.message || 'Unknown error',
      status: errorObj.status || 'No status',
      code: errorObj.code || 'No code',
      stack: errorObj.stack?.substring(0, 200) || 'No stack trace'
    });
    console.error('   ⚠️  WARNING: Admin privilege detection failed due to unexpected error');
    console.error('   → Admin users may be subject to standard rate limits');
    return null;
  }
}


/**
 * Create diagnostic summary for admin access troubleshooting
 * This helps identify why admin privilege detection might be failing
 */
function createAdminAccessDiagnostics(userId: string): {
  diagnostics: string[];
  possibleSolutions: string[];
} {
  const diagnostics: string[] = [];
  const possibleSolutions: string[] = [];
  
  // Check environment configuration
  if (!process.env.CLERK_SECRET_KEY) {
    diagnostics.push('❌ CLERK_SECRET_KEY is not configured');
    possibleSolutions.push('Set CLERK_SECRET_KEY in your .env.local file');
  } else {
    diagnostics.push('✅ CLERK_SECRET_KEY is configured');
  }
  
  if (!process.env.ADMIN_EMAILS) {
    diagnostics.push('❌ ADMIN_EMAILS is not configured');
    possibleSolutions.push('Set ADMIN_EMAILS in your .env.local file (comma-separated list)');
  } else {
    const adminEmails = process.env.ADMIN_EMAILS.split(',').map(e => e.trim()).filter(Boolean);
    diagnostics.push(`✅ ADMIN_EMAILS configured with ${adminEmails.length} email(s)`);
    
    // Check for example emails that need to be replaced
    if (process.env.ADMIN_EMAILS.includes('admin@company.com') || 
        process.env.ADMIN_EMAILS.includes('manager@company.com')) {
      diagnostics.push('⚠️  ADMIN_EMAILS contains example values that should be replaced');
      possibleSolutions.push('Replace example admin emails with real admin email addresses');
    }
  }
  
  // Check network connectivity context
  diagnostics.push(`🔍 Attempting email lookup for userId: ${userId}`);
  
  // Check for emergency admin bypass
  if (process.env.EMERGENCY_ADMIN_USER_IDS) {
    const emergencyIds = process.env.EMERGENCY_ADMIN_USER_IDS.split(',').map(id => id.trim()).filter(Boolean);
    if (emergencyIds.includes(userId)) {
      diagnostics.push('🚨 User is in EMERGENCY_ADMIN_USER_IDS list');
      possibleSolutions.push('User will bypass rate limits via emergency admin mechanism');
    } else {
      diagnostics.push('ℹ️  EMERGENCY_ADMIN_USER_IDS is configured but user is not included');
    }
  } else {
    diagnostics.push('ℹ️  EMERGENCY_ADMIN_USER_IDS not configured (optional fallback mechanism)');
    possibleSolutions.push('Consider setting EMERGENCY_ADMIN_USER_IDS as a temporary workaround if needed');
  }
  
  return { diagnostics, possibleSolutions };
}

/**
 * Enhanced version of getUserEmail with fallback diagnostics
 * Provides comprehensive logging for troubleshooting admin access issues
 */
async function getUserEmailWithDiagnostics(userId: string): Promise<{
  email: string | null;
  diagnosticsRan: boolean;
}> {
  const result = await getUserEmail(userId);
  
  // If email lookup failed, run diagnostics to help with troubleshooting
  if (result === null) {
    const { diagnostics, possibleSolutions } = createAdminAccessDiagnostics(userId);
    
    console.warn('🔧 Running admin access diagnostics due to failed email lookup:');
    diagnostics.forEach(diagnostic => console.warn(`   ${diagnostic}`));
    
    if (possibleSolutions.length > 0) {
      console.warn('💡 Possible solutions:');
      possibleSolutions.forEach(solution => console.warn(`   → ${solution}`));
    }
    
    return { email: null, diagnosticsRan: true };
  }
  
  return { email: result, diagnosticsRan: false };
}

/**
 * Ensure Redis connection is active
 */
async function ensureRedisConnection(): Promise<void> {
  if (!redisClient || !redisClient.isOpen) {
    redisClient = await getRedisClient();
  }
}

/**
 * Get count from memory store
 */
function getMemoryCount(key: string): number {
  const entry = memoryStore.get(key);
  if (!entry) return 0;
  
  const now = Date.now();
  // Check if the entry has expired (1 hour TTL for crawl limits)
  if (now - entry.hourlyWindowStart > HOURLY_WINDOW_MS) {
    memoryStore.delete(key);
    return 0;
  }
  
  return entry.hourlyCount || 0;
}

/**
 * Set count in memory store with TTL
 */
function setMemoryCount(key: string, count: number, _ttl: number): void {
  const now = Date.now();
  memoryStore.set(key, {
    count: 0, // Not used for crawl limits
    windowStart: now,
    hourlyCount: count,
    hourlyWindowStart: now,
  });
}

/**
 * Get memory store statistics (exported for debugging/monitoring)
 */
export function getMemoryStoreStatistics() {
  return getMemoryStoreStats();
}

/**
 * Force cleanup of memory store (exported for testing/debugging)
 */
export function forceMemoryStoreCleanup(): { cleaned: number; remaining: number } {
  const sizeBefore = memoryStore.size;
  cleanupMemoryStore();
  const sizeAfter = memoryStore.size;
  
  return {
    cleaned: sizeBefore - sizeAfter,
    remaining: sizeAfter
  };
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