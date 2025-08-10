# Forge Deployment Guide

This comprehensive guide covers deploying Forge, an AI-powered knowledge base chat application, from development to production.

## Prerequisites

- Node.js 18+ and npm/yarn
- Git for version control
- Accounts for required services (see Environment Setup)

## Environment Setup

### 1. Project Setup

First, clone and navigate to the correct directory:

```bash
git clone <your-repo>
cd forge/  # Important: Navigate to the forge subdirectory
```

### 2. Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

**Important**: The `.env.local` file must be created in the `forge/` directory, not the root.

### 3. Required Environment Variables

Edit `.env.local` and configure the following variables:

#### Clerk Authentication (Required)

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**Setup Instructions:**
1. Create account at [clerk.com](https://clerk.com)
2. Create new application
3. Copy keys from Dashboard → API Keys
4. Configure allowed domains in Dashboard → Domain Settings
5. Set redirect URLs for your deployment domain

**Domain Configuration:**
- Development: `http://localhost:3000`
- Production: `https://your-domain.com`

#### OpenAI API (Required)

```env
OPENAI_API_KEY=sk-...
```

**Setup Instructions:**
1. Create account at [platform.openai.com](https://platform.openai.com)
2. Navigate to API Keys section
3. Create new secret key
4. Set usage limits and billing alerts

**Usage Notes:**
- GPT-5-nano model used for chat responses
- text-embedding-3-small for semantic search
- Monitor usage in OpenAI dashboard

#### Admin Configuration (Required)

```env
ADMIN_EMAILS=admin@company.com,manager@company.com
```

**Setup Instructions:**
- Use comma-separated list of admin email addresses
- Must match email addresses in Clerk authentication
- Case-insensitive matching
- Maximum 10 admin emails for security

#### Knowledge Base Configuration (Optional)

```env
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX=your-index-name
```

**Setup Instructions:**
1. Create account at [pinecone.io](https://pinecone.io)
2. Create new index with these specifications:
   - **Dimensions**: 1024 (must match OpenAI embeddings)
   - **Metric**: cosine
   - **Pod Type**: s1.x1 (starter) or p1.x1 (performance)
3. Copy API key from dashboard

**Fallback Behavior:**
- Without Pinecone: Uses demo context responses
- Application fully functional in demo mode
- Can add Pinecone later without code changes

#### Rate Limiting Configuration (Optional)

```env
# Redis (Production Recommended)
REDIS_URL=redis://localhost:6379
RATE_LIMIT_MODE=redis

# Memory (Development Only)
RATE_LIMIT_MODE=memory

# Disabled (Relies on Clerk limits)
RATE_LIMIT_MODE=disabled

# Rate Limits
MAX_INVITATIONS_PER_MINUTE=5
MAX_INVITATIONS_PER_HOUR=20
```

**Setup Options:**
- **Redis**: Best for production, supports multiple instances
- **Memory**: Development only, resets on restart
- **Disabled**: Uses Clerk's built-in rate limiting only

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### 3. Development Testing

1. Visit `http://localhost:3000`
2. Test authentication flow (sign up/sign in)
3. Access chat interface at `/chat`
4. Test admin access at `/admin` (if configured as admin)
5. Try crawling a URL to test knowledge base functionality

### 4. Common Development Issues

**Environment Variables Not Loading:**
- Ensure `.env.local` is in `forge/` directory
- Restart development server after changes
- Check for UTF-8 encoding, no null characters

**Clerk Authentication Errors:**
- Verify publishable key starts with `pk_test_`
- Check domain settings in Clerk dashboard
- Ensure localhost:3000 is allowed

**Pinecone Errors:**
- Verify index dimensions are 1024
- Check API key permissions
- Application works without Pinecone (demo mode)

## Vercel Deployment

### 1. One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo&project-name=forge&repository-name=forge&env=NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,CLERK_SECRET_KEY,OPENAI_API_KEY,ADMIN_EMAILS&envDescription=Required%20environment%20variables%20for%20Forge&envLink=https://github.com/your-repo/blob/main/.env.example&root-directory=forge)

### 2. Project Configuration

#### Vercel Project Settings

**Build & Development Settings:**
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "outputDirectory": ".next",
  "rootDirectory": "forge"
}
```

**Framework Preset:** Next.js (Auto-detected)

**Node.js Version:** 18.x (Recommended for Next.js 15)

**Build Settings:**
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (Auto-detected)
- **Install Command**: `npm install --frozen-lockfile`
- **Root Directory**: `forge/` (Critical for monorepo setup)

#### Next.js 15 Specific Configuration

Create or update `vercel.json` in the `forge/` directory:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/chat/route.ts": {
      "maxDuration": 60
    },
    "app/api/crawl/route.ts": {
      "maxDuration": 300
    },
    "app/api/context/route.ts": {
      "maxDuration": 30
    },
    "app/api/invitations/route.ts": {
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/healthz",
      "destination": "/api/health"
    }
  ]
}
```

### 3. Function Configuration

#### API Route Timeout Settings

**Chat Streaming Endpoint (`/api/chat`):**
```typescript
// app/api/chat/route.ts
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for streaming responses
export const dynamic = 'force-dynamic';
```

**Crawling Endpoint (`/api/crawl`):**
```typescript
// app/api/crawl/route.ts
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for web crawling
export const dynamic = 'force-dynamic';
```

**Context Search (`/api/context`):**
```typescript
// app/api/context/route.ts
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds for vector search
export const dynamic = 'force-dynamic';
```

**Admin Invitations (`/api/invitations`):**
```typescript
// app/api/invitations/route.ts
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds for admin operations
export const dynamic = 'force-dynamic';
```

#### Function Memory Configuration

For Pro and Enterprise plans, configure memory allocation:

```json
{
  "functions": {
    "app/api/chat/route.ts": {
      "maxDuration": 60,
      "memory": 1024
    },
    "app/api/crawl/route.ts": {
      "maxDuration": 300,
      "memory": 3008
    },
    "app/api/context/route.ts": {
      "maxDuration": 30,
      "memory": 512
    }
  }
}
```

### 4. Edge Runtime Configuration

#### Edge-Compatible API Routes

For lightweight operations, consider Edge Runtime:

```typescript
// app/api/health/route.ts
export const runtime = 'edge';

export async function GET() {
  return new Response(JSON.stringify({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    region: process.env.VERCEL_REGION || 'unknown'
  }), {
    headers: { 'content-type': 'application/json' },
  });
}
```

#### Edge Middleware Configuration

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

export function middleware(request: NextRequest) {
  // Add security headers
  const response = NextResponse.next();
  
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.com; style-src 'self' 'unsafe-inline';"
  );
  
  return response;
}
```

### 5. Environment Variable Configuration

#### Environment Variable Management

**Vercel Environment Variable Scopes:**
- **Production**: Used for production deployments
- **Preview**: Used for preview deployments (branches)
- **Development**: Used for local development (`vercel dev`)

**Required Environment Variables:**

**Authentication (Clerk):**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

**OpenAI Integration:**
```env
OPENAI_API_KEY=sk-...
```

**Admin Configuration:**
```env
ADMIN_EMAILS=admin@yourcompany.com,manager@yourcompany.com
```

**Optional Services:**
```env
PINECONE_API_KEY=your-production-key
PINECONE_INDEX=your-production-index
REDIS_URL=your-redis-url
RATE_LIMIT_MODE=redis
MAX_INVITATIONS_PER_MINUTE=5
MAX_INVITATIONS_PER_HOUR=20
```

**Vercel-Specific Variables:**
```env
VERCEL_URL=auto-populated
VERCEL_ENV=production|preview|development
VERCEL_GIT_COMMIT_SHA=auto-populated
VERCEL_GIT_COMMIT_MESSAGE=auto-populated
VERCEL_GIT_COMMIT_AUTHOR_LOGIN=auto-populated
```

**Security & Performance:**
```env
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

#### Environment Variable Best Practices

**Security:**
- Use Vercel's encrypted environment variables
- Never expose secrets in client-side code
- Rotate API keys regularly
- Use different keys for production/preview environments

**Organization:**
- Group related variables with prefixes
- Use consistent naming conventions
- Document all custom environment variables
- Set appropriate scopes (Production/Preview/Development)

### 6. Next.js 15 App Router Configuration

#### Route Configuration

**Static Route Generation:**
```typescript
// app/sitemap.ts
export default function sitemap() {
  return [
    {
      url: 'https://your-domain.com',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    {
      url: 'https://your-domain.com/chat',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
```

**Metadata Configuration:**
```typescript
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000'),
  title: {
    default: 'Forge - AI Knowledge Base',
    template: '%s | Forge'
  },
  description: 'AI-powered knowledge base and chat interface',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: './',
    siteName: 'Forge',
  },
  twitter: {
    card: 'summary_large_image',
  },
};
```

#### Performance Optimizations

**Image Optimization:**
```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    optimizePackageImports: ['@clerk/nextjs', 'lucide-react'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### 7. Vercel Analytics & Monitoring

#### Web Analytics Setup

**Enable Analytics:**
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

**Custom Event Tracking:**
```typescript
// utils/analytics.ts
import { track } from '@vercel/analytics';

export function trackChatMessage(messageType: 'user' | 'assistant') {
  track('chat_message', { type: messageType });
}

export function trackUrlCrawl(success: boolean, url: string) {
  track('url_crawl', { 
    success, 
    domain: new URL(url).hostname 
  });
}

export function trackAdminAction(action: string) {
  track('admin_action', { action });
}
```

#### Real User Monitoring (RUM)

**Core Web Vitals Monitoring:**
```typescript
// app/analytics.tsx
'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Send to analytics service
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
      });
    }
  });

  return null;
}
```

### 8. Deployment Automation

#### GitHub Actions Integration

```yaml
# .github/workflows/vercel.yml
name: Vercel Production Deployment
env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
on:
  push:
    branches:
      - main
jobs:
  Deploy-Production:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: ./forge
      - name: Build Project Artifacts
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: ./forge
      - name: Deploy Project Artifacts to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: ./forge
```

#### Preview Deployments

**Automatic Preview Deployments:**
- Every push to branches creates preview deployment
- Pull request comments include deployment URL
- Environment variables scoped to preview
- Separate Clerk instance for testing

**Preview Environment Configuration:**
```env
# Preview-specific environment variables
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
PINECONE_INDEX=forge-preview
```

### 9. Vercel-Specific Performance Optimization

#### Edge Network Configuration

**Regional Deployment:**
```json
{
  "regions": ["iad1", "sfo1", "fra1"],
  "functions": {
    "app/api/chat/route.ts": {
      "regions": ["iad1", "sfo1"]
    },
    "app/api/context/route.ts": {
      "regions": ["iad1", "sfo1", "fra1"]
    }
  }
}
```

**Static File Optimization:**
```typescript
// next.config.js
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

#### Bundle Optimization

**Dynamic Imports:**
```typescript
// Lazy load heavy components
const AdminDashboard = dynamic(() => import('@/components/AdminDashboard'), {
  loading: () => <AdminLoading />,
  ssr: false,
});

const ContextPanel = dynamic(() => import('@/components/ContextPanel'), {
  loading: () => <div>Loading context...</div>,
});
```

**Package Optimization:**
```json
{
  "experimental": {
    "optimizePackageImports": [
      "@clerk/nextjs",
      "lucide-react",
      "@ai-sdk/openai",
      "cheerio"
    ],
    "bundlePagesRouterDependencies": true,
    "serverComponentsExternalPackages": [
      "@pinecone-database/pinecone",
      "cheerio"
    ]
  }
}
```

### 10. Security Configuration

#### Content Security Policy

**Production CSP:**
```typescript
// middleware.ts
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.com https://*.clerk.accounts.dev;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data: https://images.clerk.dev https://img.clerk.com;
  font-src 'self' https://fonts.gstatic.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', Buffer.from(crypto.randomUUID()).toString('base64'));

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('Content-Security-Policy', cspHeader.replace(/\s{2,}/g, ' ').trim());
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}
```

#### API Route Security

**Rate Limiting Middleware:**
```typescript
// utils/rateLimiting.ts
import { NextRequest } from 'next/server';

const rateLimit = new Map();

export function checkRateLimit(request: NextRequest, limit: number = 10, windowMs: number = 60000) {
  const ip = request.ip ?? 'unknown';
  const now = Date.now();
  const windowStart = now - windowMs;

  const requests = rateLimit.get(ip) || [];
  const validRequests = requests.filter((timestamp: number) => timestamp > windowStart);
  
  if (validRequests.length >= limit) {
    return false;
  }

  validRequests.push(now);
  rateLimit.set(ip, validRequests);
  return true;
}
```

### 11. Monitoring & Logging

#### Custom Logging

**Structured Logging:**
```typescript
// utils/logger.ts
export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },
  error: (message: string, error?: Error, meta?: Record<string, any>) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },
  warn: (message: string, meta?: Record<string, any>) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },
};
```

#### Health Check Endpoint

```typescript
// app/api/health/route.ts
export const runtime = 'edge';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime?.() || 0,
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown',
    region: process.env.VERCEL_REGION || 'unknown',
    environment: process.env.VERCEL_ENV || 'unknown',
  };

  return Response.json(health, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
```

### 12. Vercel CLI Commands

#### Useful CLI Commands

**Local Development:**
```bash
# Start local development with Vercel environment
vercel dev

# Pull environment variables
vercel env pull .env.local

# Link local project to Vercel project
vercel link
```

**Deployment Management:**
```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# List deployments
vercel ls

# View deployment logs
vercel logs [deployment-url]

# Promote preview to production
vercel promote [deployment-url]
```

**Environment Management:**
```bash
# Add environment variable
vercel env add VARIABLE_NAME

# List environment variables
vercel env ls

# Remove environment variable
vercel env rm VARIABLE_NAME

# Pull latest environment variables
vercel env pull
```

### 13. Troubleshooting Guide

#### Common Vercel Issues

**Function Timeout Errors:**
```bash
# Error: Function execution timeout
# Solution: Increase maxDuration in vercel.json or route config
export const maxDuration = 300; // 5 minutes
```

**Memory Limit Exceeded:**
```bash
# Error: Function memory limit exceeded
# Solution: Optimize memory usage or increase limit (Pro/Enterprise)
{
  "functions": {
    "app/api/crawl/route.ts": {
      "memory": 3008
    }
  }
}
```

**Build Size Limits:**
```bash
# Error: Build output exceeds limit
# Solutions:
# 1. Optimize bundle size
# 2. Use dynamic imports
# 3. Exclude unnecessary files
# 4. Configure serverComponentsExternalPackages
```

**Environment Variable Issues:**
```bash
# Issue: Variables not loading
# Solutions:
# 1. Check variable names (case-sensitive)
# 2. Verify scope (Production/Preview/Development)
# 3. Redeploy after changes
# 4. Use vercel env pull to sync locally
```

#### Performance Debugging

**Cold Start Optimization:**
```typescript
// Minimize cold start time
export const runtime = 'nodejs';
export const preferredRegion = 'iad1'; // Choose closest region
export const dynamic = 'force-dynamic';

// Pre-warm connections
if (globalThis.connections === undefined) {
  globalThis.connections = new Map();
}
```

**Function Monitoring:**
```typescript
// Add timing to API routes
export async function POST(request: Request) {
  const start = Date.now();
  
  try {
    // Your API logic here
    const result = await processRequest(request);
    
    const duration = Date.now() - start;
    console.log(`API completed in ${duration}ms`);
    
    return Response.json(result);
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`API failed after ${duration}ms`, error);
    throw error;
  }
}
```

### 14. Build and Deployment Troubleshooting

**Build Failures:**
- Check all environment variables are set
- Verify TypeScript compilation (`npm run build` locally)
- Check Node.js version compatibility

**Runtime Errors:**
- Monitor Vercel function logs
- Check environment variable values
- Verify external service connectivity

**Performance Issues:**
- Enable Vercel Analytics
- Monitor Core Web Vitals
- Optimize images and assets

## Testing and Verification

### 1. Authentication Flow Testing

**Unauthenticated Users:**
- [ ] Landing page loads correctly
- [ ] Sign-in redirects work
- [ ] Social login options function
- [ ] Email verification works

**Authenticated Users:**
- [ ] Successful sign-in redirects to chat
- [ ] User profile information displays
- [ ] Sign-out functionality works
- [ ] Session persistence across page reloads

**Admin Users:**
- [ ] Admin access granted to `/admin`
- [ ] Invitation management works
- [ ] Non-admin users blocked from admin routes
- [ ] Admin email configuration functions

### 2. Application Functionality

**Chat Interface:**
- [ ] Chat interface loads and renders
- [ ] Message sending and receiving
- [ ] Context panel displays relevant sources
- [ ] Error handling for API failures

**Knowledge Base:**
- [ ] URL crawling functionality
- [ ] Document indexing and search
- [ ] Contextual responses from knowledge base
- [ ] Fallback to demo mode when Pinecone unavailable

**API Endpoints:**
- [ ] `/api/chat` streaming responses
- [ ] `/api/context` search functionality
- [ ] `/api/crawl` document processing
- [ ] `/api/invitations` admin management

### 3. Error Handling Testing

**Network Errors:**
- [ ] Offline functionality and error messages
- [ ] Service unavailable handling
- [ ] Timeout recovery mechanisms

**Authentication Errors:**
- [ ] Invalid credentials handling
- [ ] Session expiration recovery
- [ ] Service unavailable fallbacks

**Application Errors:**
- [ ] Global error boundary activation
- [ ] Component-level error recovery
- [ ] User-friendly error messages

## Production Considerations

### 1. Security Best Practices

**Environment Variables:**
- Use production API keys and secrets
- Never commit secrets to version control
- Rotate keys regularly
- Use Vercel's encrypted environment variables

**Authentication:**
- Enable MFA for admin accounts
- Configure session timeouts appropriately
- Monitor failed authentication attempts
- Use production Clerk instance

**API Security:**
- Enable rate limiting in production
- Monitor API usage and abuse
- Implement proper CORS policies
- Use HTTPS everywhere

### 2. Monitoring and Logging

**Application Monitoring:**
- Set up Vercel Analytics
- Monitor Core Web Vitals
- Track user journeys and conversions
- Set up error tracking (Sentry, LogRocket)

**Performance Monitoring:**
- Monitor API response times
- Track database query performance (Pinecone)
- Set up alerts for high error rates
- Monitor resource usage

**Logging Strategy:**
- Centralized logging for all services
- Log levels appropriate for production
- Avoid logging sensitive information
- Set up log retention policies

### 3. Backup and Disaster Recovery

**Data Backup:**
- Regular backups of user data (Clerk)
- Vector database backups (Pinecone)
- Configuration and environment backups
- Test restore procedures regularly

**Disaster Recovery:**
- Document recovery procedures
- Test failover scenarios
- Maintain staging environment for testing
- Plan for service outages

### 4. Scaling Considerations

**Performance Optimization:**
- Enable CDN for static assets
- Implement caching strategies
- Optimize database queries
- Use edge functions where appropriate

**Scaling Strategy:**
- Monitor resource usage trends
- Plan for traffic spikes
- Consider service limits (OpenAI, Pinecone)
- Implement graceful degradation

## Common Issues and Solutions

### Deployment Issues

**"Module not found" errors:**
- Ensure all dependencies in package.json
- Clear node_modules and reinstall
- Check import paths and case sensitivity

**Environment variable issues:**
- Verify all required variables are set in Vercel
- Check for typos in variable names
- Ensure UTF-8 encoding, no special characters

**Build timeouts:**
- Optimize build process
- Consider upgrading Vercel plan
- Check for infinite loops in build scripts

### Runtime Issues

**Authentication failures:**
- Verify Clerk domain configuration
- Check production vs development keys
- Ensure HTTPS for production domains

**API errors:**
- Monitor external service status (OpenAI, Pinecone)
- Check API key quotas and limits
- Implement proper error handling and retries

**Performance issues:**
- Enable Vercel Analytics for insights
- Optimize large dependencies
- Implement code splitting
- Use appropriate caching headers

### Configuration Issues

**Admin access not working:**
- Verify admin email addresses match Clerk accounts
- Check case sensitivity in email configuration
- Ensure proper environment variable formatting

**Knowledge base not working:**
- Verify Pinecone index configuration (1024 dimensions)
- Check API key permissions
- Test with demo mode first

## Support and Resources

- **Documentation**: [Your documentation URL]
- **Issues**: [Your issues URL]
- **Support Email**: support@yourcompany.com
- **Status Page**: [Your status page URL]

For deployment assistance or issues not covered in this guide, please reach out through the support channels above.