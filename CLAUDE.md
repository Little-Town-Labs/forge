# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Environment Setup
Create `.env.local` with:
```
OPENAI_API_KEY=your_openai_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX=your_pinecone_index_name
```

## Architecture Overview

**Forge** is a Next.js 15 chatbot application with context-aware responses using semantic search. The system operates in two modes:

### Demo Mode (Default)
- Works without Pinecone configuration
- Returns hardcoded demo context in `src/utils/context.ts:11-30`
- Perfect for testing interface and functionality

### Full Knowledge Base Mode
- Requires Pinecone configuration
- Enables web crawling and vector storage
- Provides real context-aware responses

## Core Components

### API Architecture (`src/app/api/`)
- **`/api/chat`** - Main streaming chat endpoint using Vercel AI SDK
- **`/api/context`** - Context retrieval endpoint for frontend display
- **`/api/crawl`** - Web crawling and indexing endpoint
- **`/api/health`** - Health check endpoint with configuration validation
- **`/api/admin/config`** - Detailed configuration status (admin-only)
- **`/api/admin/rate-limit-status`** - Rate limiting status and recommendations (admin-only)
- **`/api/invitations`** - Invitation management with distributed rate limiting

### Context System (`src/utils/context.ts`)
The heart of the application. Key functions:
- `getContext()` - Main context retrieval with fallback to demo mode
- `getMatchesFromEmbeddings()` - Pinecone vector search with automatic fallback
- Automatic index creation when missing (404 errors)
- Demo context served when Pinecone unavailable

### Frontend Components (`src/components/`)
- **Chat.tsx** - Main chat interface with form handling
- **Messages.tsx** - Message display with streaming support
- **ContextPanel.tsx** - Shows relevant sources with relevance scores
- **CrawlForm.tsx** - Admin interface for adding knowledge base content
- **ClerkProvider.tsx** - Authentication provider with error boundaries
- **Header.tsx** - Navigation with enhanced user menu visibility

### Loading Components (`src/app/*/loading.tsx`)
All loading components include comprehensive accessibility features:
- **ARIA Attributes**: `aria-live`, `aria-atomic`, `role="status"`
- **Screen Reader Support**: Dynamic announcements and semantic markup
- **Progressive Loading**: Multi-phase loading with status updates
- **Timeout Handling**: Graceful timeout messages with retry options

### Utilities (`src/utils/`)
- **embeddings.ts** - OpenAI embedding generation
- **crawler.ts** - Web scraping with Cheerio
- **documents.ts** - Text chunking and processing
- **seed.ts** - Knowledge base seeding operations
- **admin.ts** - Admin utility functions and validation
- **startup.ts** - Application startup validation and health checks
- **rateLimiter.ts** - Distributed rate limiting with Redis/memory/disabled modes
- **errorTracking.ts** - Centralized error tracking with privacy controls
- **apiResponse.ts** - Standardized API response utilities with error handling

## Key Dependencies
- **Vercel AI SDK** (`ai`) - Streaming chat responses
- **OpenAI SDK** (`@ai-sdk/openai`) - GPT-4o-mini model and embeddings
- **Pinecone** (`@pinecone-database/pinecone`) - Vector database (optional)
- **Clerk** (`@clerk/nextjs`, `@clerk/backend`) - Authentication and user management
- **LangChain** (`langchain`) - Document processing and chunking
- **Cheerio** (`cheerio`) - Web scraping

## Embedding Configuration
- **Model**: `text-embedding-3-small` with `dimensions: 1024`
- **Important**: Pinecone index must be created with 1024 dimensions to match
- Vector dimension mismatch will cause crawling failures

## Error Handling Patterns

### Pinecone Fallback Strategy
The application gracefully handles Pinecone unavailability:
1. Missing API keys → Demo mode
2. Index not found (404) → Demo mode  
3. Any Pinecone error → Empty context or demo mode

### Context Retrieval
- `minScore` filtering (default 0.3) for relevance - lowered from 0.7 for better 1024-dim performance
- Token truncation (default 3000) for context size
- Dual return modes: text-only or full ScoredVector objects
- **Troubleshooting**: If "No relevant context found", lower minScore in both `/api/context` and `getContext()`

## Data Flow
1. User message → Chat component
2. Message sent to `/api/chat` 
3. Context retrieved via `getContext()`
4. OpenAI streaming response with injected context
5. Frontend displays message + context panel

## Type Definitions (`src/types/index.ts`)
- **Page** - Crawled web page structure
- **SeedOptions** - Document chunking configuration  
- **Metadata** - Vector metadata structure
- **ScoredVector** - Search result with relevance score

## Startup Validation

**Forge** includes comprehensive startup validation to catch configuration issues early:

### Automatic Validation
- Runs during application startup (server-side only)
- Validates admin configuration, environment variables, and rate limiting
- Exits application in production if critical errors found
- Displays colored console output with detailed results

### Health Check Endpoints
- **`/api/health`** - Public health check with basic validation status
- **`/api/admin/config`** - Detailed configuration information (admin-only)
- Returns HTTP 503 if configuration issues detected
- Useful for monitoring and debugging

### Validation Components
1. **Admin Configuration**: Validates `ADMIN_EMAILS` format, count, and security
2. **Environment Variables**: Checks required and optional variables
3. **Rate Limiting**: Validates rate limiting configuration values

### Configuration
```typescript
runStartupValidation({
  exitOnError: process.env.NODE_ENV === 'production',
  skipOnProduction: false,
  logLevel: 'info'
});
```

## Rate Limiting System

**Forge** includes a sophisticated rate limiting system with multiple backends:

### Rate Limiting Modes
1. **Redis Mode** (Production Recommended)
   - Distributed rate limiting across multiple instances
   - Persistent storage with automatic expiration
   - Set `REDIS_URL` environment variable
   - Mode: `RATE_LIMIT_MODE=redis`

2. **Memory Mode** (Development Only)
   - In-memory rate limiting with cleanup intervals
   - **Warning**: Does not work with multiple instances
   - Automatic fallback for development environments
   - Mode: `RATE_LIMIT_MODE=memory`

3. **Disabled Mode** (Clerk Only)
   - No application-level rate limiting
   - Relies on Clerk's built-in invitation limits
   - Mode: `RATE_LIMIT_MODE=disabled`

### Environment Configuration
```bash
# Rate limiting mode (auto-detected if not set)
RATE_LIMIT_MODE=redis  # redis, memory, or disabled

# Redis connection (production)
REDIS_URL=redis://localhost:6379

# Rate limits per admin user
MAX_INVITATIONS_PER_MINUTE=5
MAX_INVITATIONS_PER_HOUR=20
```

### Auto-Detection Logic
- Has `REDIS_URL` → Redis mode
- Production without Redis → Disabled mode (with warning)
- Development without Redis → Memory mode

### Production Warnings
The system automatically warns about:
- In-memory mode in production environments
- Missing Redis configuration
- Disabled rate limiting

### Rate Limiting Headers
```http
X-RateLimit-Backend: redis
X-RateLimit-Remaining: 4
X-RateLimit-Hourly-Remaining: 19
X-RateLimit-Reset: 1704067200
Retry-After: 60  # When rate limited
```

## Clerk Backend SDK Integration

**Forge** uses the proper Clerk Backend SDK for server-side operations:

### Invitation API Implementation
- **Backend SDK**: Uses `@clerk/backend` with `createClerkClient()`
- **Authentication**: Still uses `@clerk/nextjs/server` for `auth()` and `currentUser()`
- **Server-side Operations**: Invitation creation, listing, and revocation via Backend SDK
- **Client Initialization**: `createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })`

### Available Methods
- `clerk.invitations.createInvitation()` - Create new invitation
- `clerk.invitations.getInvitationList()` - List invitations with filtering
- `clerk.invitations.revokeInvitation()` - Revoke existing invitation
- **Note**: Single invitation retrieval uses `getInvitationList()` with filtering

### Environment Variables
```bash
CLERK_SECRET_KEY=sk_live_...  # Required for Backend SDK
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...  # Required for frontend
```

## Error Tracking System

**Forge** includes a comprehensive error tracking system with privacy controls:

### Centralized Error Tracking (`src/utils/errorTracking.ts`)
- **Privacy-First**: Sanitizes sensitive data in production
- **Multi-Service Support**: Sentry, Bugsnag, LogRocket, Google Analytics, PostHog, etc.
- **Structured Logging**: Consistent error data format across services
- **Environment Aware**: Different privacy levels for development vs production

### Error Tracking Services
Supports integration with multiple services (configured via window globals):
- **Sentry**: `window.Sentry` - Production error tracking
- **Bugsnag**: `window.Bugsnag` - Error monitoring with context
- **LogRocket**: `window.LogRocket` - Session replay with error capture
- **Analytics**: Google Analytics, PostHog, Mixpanel for error events

### Usage Examples
```typescript
// Track application errors
trackError(error, {
  errorType: 'application',
  severity: 'high',
  tags: { boundary: 'chat', component: 'MessageForm' }
});

// Track authentication errors  
trackAuthError(error, {
  errorBoundary: 'ClerkProvider',
  isSignedIn: false
});

// Track network errors
trackNetworkError(error, {
  endpoint: '/api/chat',
  method: 'POST',
  statusCode: 500
});
```

### Privacy Controls
- **Production Mode**: Limits stack traces, removes query parameters, masks user data
- **Development Mode**: Full error details for debugging
- **Data Sanitization**: Automatic removal of sensitive information
- **User Context**: Privacy-safe user identification (authenticated/anonymous)

## Common Issues & Solutions

### Environment Variables
- **Issue**: `PINECONE_INDEX value: undefined`
- **Solution**: Create `.env.local` with proper UTF-8 encoding (no null characters)

### Vector Dimensions
- **Issue**: "Vector dimension 1536 does not match the dimension of the index 1024"
- **Solution**: Ensure `dimensions: 1024` parameter in `src/utils/embeddings.ts`

### No Context Found
- **Issue**: "No relevant context found" message
- **Solution**: Lower `minScore` from 0.7 to 0.3 in both context endpoints
- **Root cause**: 1024-dimensional embeddings have different similarity score ranges

### Startup Validation Errors
- **Issue**: Application exits with configuration errors
- **Solution**: Check console output for specific issues and fix environment variables
- **Debug**: Use `/api/health` endpoint to check current validation status

### Deployment Issues

#### TypeScript Compilation Errors
- **Issue**: Next.js 15 App Router route parameter types causing build failures
- **Solution**: Dynamic routes must use `Promise<{ param: string }>` interface and `await params`
- **Example**: `{ params }: { params: Promise<{ invitationId: string }> }`

#### ESLint Build Failures
Common ESLint errors that block Vercel deployment:

1. **Unescaped Apostrophes in JSX**
   - **Error**: `'` characters in JSX strings
   - **Fix**: Replace with `&apos;` or use proper escaping

2. **TypeScript `any` Type Violations**
   - **Error**: `@typescript-eslint/no-explicit-any`
   - **Fix**: Use specific types or add `// eslint-disable-next-line @typescript-eslint/no-explicit-any`

3. **Unused Variables/Imports**
   - **Error**: `@typescript-eslint/no-unused-vars`
   - **Fix**: Remove unused code or comment out with `// const userId = authResult.userId!;`

4. **Type Assertions and Message Properties**
   - **Error**: `Property 'includes' does not exist on type '{}'`
   - **Fix**: Use type guards: `(typeof obj.message === 'string' && obj.message.includes('text'))`

#### Lock File Conflicts
- **Issue**: Multiple `package-lock.json` files causing warnings
- **Solution**: Keep only the project-level lockfile, remove parent directory lockfiles
- **Command**: `rm /parent/directory/package-lock.json`

### Build Validation
Before deploying, ensure these commands pass:
```bash
npm run build    # Must complete successfully
npm run lint     # Should have minimal warnings only
npx tsc --noEmit # Check for TypeScript errors
```