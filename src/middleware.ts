import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { getEdgeStartupStatus } from './lib/startup-edge';

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
let initializationChecked = false;
let startupStatus: ReturnType<typeof getEdgeStartupStatus> | null = null;

/**
 * Perform lightweight Edge-compatible startup validation
 */
function checkStartupStatus(): ReturnType<typeof getEdgeStartupStatus> {
  if (!startupStatus) {
    startupStatus = getEdgeStartupStatus();
  }
  return startupStatus;
}

/**
 * Check if request should trigger startup validation
 */
function shouldCheckStartup(pathname: string): boolean {
  // Skip validation for static assets and Next.js internal routes
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
  
  // Perform lightweight startup validation for relevant requests
  if (shouldCheckStartup(pathname)) {
    try {
      if (!initializationChecked) {
        console.log('[MIDDLEWARE] Checking startup requirements...');
        initializationChecked = true;
      }
      
      const status = checkStartupStatus();
      
      // If startup validation failed, return a service unavailable response
      // for critical API endpoints (except system status endpoints)
      if (!status.success && pathname.startsWith('/api/') && 
          !pathname.includes('/system') && 
          !pathname.includes('/health')) {
        
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Service temporarily unavailable - startup validation failed',
            details: {
              missingVariables: status.environment.missingVariables,
              warnings: status.environment.warnings
            },
            timestamp: status.basic.timestamp
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
      
      // Log warnings if any
      if (status.environment.warnings.length > 0) {
        console.warn('[MIDDLEWARE] Startup warnings:', status.environment.warnings);
      }
      
    } catch (error) {
      console.error('[MIDDLEWARE] Startup validation error:', error);
      
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