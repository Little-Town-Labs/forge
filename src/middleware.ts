import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/chat(.*)',
  '/admin(.*)',
  '/api/chat(.*)',
  '/api/context(.*)',
  '/api/crawl(.*)',
  '/api/invitations(.*)',
]);

// Global initialization tracking
let initializationStarted = false;
let initializationComplete = false;
let initializationError: string | null = null;

/**
 * Perform lazy initialization on first request
 */
async function ensureInitialization(): Promise<void> {
  if (initializationComplete) {
    return; // Already initialized successfully
  }
  
  if (initializationStarted) {
    // Initialization in progress - wait a bit and check again
    await new Promise(resolve => setTimeout(resolve, 100));
    return ensureInitialization();
  }
  
  initializationStarted = true;
  
  try {
    // Import startup module dynamically
    const { ensureApplicationInitialized } = await import('./lib/startup');
    
    console.log('[MIDDLEWARE] Starting application initialization...');
    const result = await ensureApplicationInitialized();
    
    if (result.success) {
      console.log('[MIDDLEWARE] ✅ Application initialization completed');
      initializationComplete = true;
      initializationError = null;
    } else {
      const error = `Initialization failed: DB=${!result.database.initialized}, Env=${!result.environment.valid}`;
      console.error('[MIDDLEWARE] ❌ Application initialization failed:', error);
      initializationError = error;
      
      // Don't mark as complete so we can retry
      initializationStarted = false;
    }
  } catch (error) {
    console.error('[MIDDLEWARE] ❌ Initialization error:', error);
    initializationError = error instanceof Error ? error.message : 'Unknown error';
    initializationStarted = false; // Allow retry
  }
}

/**
 * Check if request should trigger initialization
 */
function shouldInitialize(pathname: string): boolean {
  // Skip initialization for static assets and Next.js internal routes
  const skipPatterns = [
    '/_next',
    '/favicon.ico',
    '/api/health', // Health check should work without full init
    '/api/ping',   // Ping should work without full init
    '/public',
    '/static'
  ];
  
  return !skipPatterns.some(pattern => pathname.startsWith(pattern));
}

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  
  // Ensure application is initialized before processing requests
  if (shouldInitialize(pathname)) {
    try {
      await ensureInitialization();
      
      // If initialization failed, return a service unavailable response
      // for critical API endpoints (except system status endpoints)
      if (!initializationComplete && initializationError) {
        if (pathname.startsWith('/api/') && 
            !pathname.includes('/system') && 
            !pathname.includes('/health')) {
          
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Service temporarily unavailable - system initialization in progress',
              details: initializationError,
              timestamp: new Date().toISOString()
            }),
            {
              status: 503,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': '30'
              }
            }
          );
        }
      }
    } catch (error) {
      console.error('[MIDDLEWARE] Initialization error:', error);
      
      // For API routes, return error response
      if (pathname.startsWith('/api/') && 
          !pathname.includes('/system') && 
          !pathname.includes('/health')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Service temporarily unavailable',
            timestamp: new Date().toISOString()
          }),
          {
            status: 503,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60'
            }
          }
        );
      }
    }
  }
  
  // Protect the defined routes with Clerk authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};