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
# Required - AI and Authentication
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here

# Required - Admin Configuration
ADMIN_EMAILS=admin@company.com,manager@company.com

# Optional - for Google AI models and embeddings:
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Optional - for full functionality (enables knowledge base):
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX=your_pinecone_index_name

# Optional - Rate Limiting and Performance
RATE_LIMIT_MODE=redis
REDIS_URL=redis://localhost:6379
MAX_INVITATIONS_PER_MINUTE=5
MAX_INVITATIONS_PER_HOUR=20
MAX_CRAWL_PAGES=100
MAX_CRAWL_DEPTH=3
CRAWL_TIMEOUT_MS=600000
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

## AI Provider System

### Multi-Model Support
- **OpenAI**: GPT-4o-mini for chat, text-embedding-3-small for embeddings
- **Google**: Gemini 1.5 Flash for chat, embedding-001 for embeddings
- **Model Selection**: Users can switch between providers via UI
- **Automatic Matching**: Chat model selection determines embedding provider

### Embedding Provider Features
- **OpenAI Embeddings**: 1024 dimensions, high quality semantic search
- **Google Embeddings**: 768 dimensions, fast and cost-effective
- **Fallback System**: Google embeddings fallback to OpenAI if needed
- **Dynamic Dimensions**: Index creation matches embedding provider dimensions

## Advanced Crawling System

### Configurable Crawl Modes
- **Single Page**: Crawl only the specified URL (~30 seconds)
- **Limited Crawl**: Crawl a specific number of pages (1-50 pages, ~1-10 minutes)
- **Deep Crawl**: Multi-level site crawling (2-3 levels deep, ~5-10 minutes)

### Enhanced Error Tracking
- **Partial Success Handling**: Continue crawling even when some pages fail
- **Comprehensive Error Reporting**: Track failed URLs and detailed error messages
- **Smart Retry Logic**: Automatic retry for transient errors (timeouts, 5xx responses, network issues)
- **User Feedback**: Clear distinction between complete success, partial success, and failure

### Timeout Management
- **Synchronized Timeouts**: API and crawler timeouts properly coordinated
- **Mode-Specific Timeouts**: Different timeout values based on crawl complexity
- **Graceful Degradation**: Crawler timeout is 90% of API timeout for cleanup

### Rate Limiting
- **Mode-Specific Limits**: Different rate limits for each crawl mode
  - Single: 60 crawls/hour
  - Limited: 10 crawls/hour  
  - Deep: 3 crawls/hour
- **Admin Bypass**: Administrators can bypass crawl rate limits
- **Distributed Rate Limiting**: Redis-backed rate limiting with memory fallback

## Core Components

### API Architecture (`src/app/api/`)
- **`/api/chat`** - Main streaming chat endpoint using Vercel AI SDK with multi-provider support
- **`/api/context`** - Context retrieval endpoint for frontend display
- **`/api/crawl`** - Web crawling and indexing endpoint with embedding provider selection
- **`/api/health`** - Health check endpoint with configuration validation
- **`/api/admin/config`** - Detailed configuration status (admin-only)
- **`/api/admin/rate-limit-status`** - Rate limiting status and recommendations (admin-only)
- **`/api/invitations`** - Invitation management with distributed rate limiting

### Context System (`src/utils/context.ts`)
The heart of the application. Key functions:
- `getContext()` - Main context retrieval with embedding provider selection
- `getMatchesFromEmbeddings()` - Pinecone vector search with automatic fallback
- Automatic index creation when missing (404 errors)
- Demo context served when Pinecone unavailable

### Frontend Components (`src/components/`)
- **Chat.tsx** - Main chat interface with form handling
- **Messages.tsx** - Message display with streaming support
- **ContextPanel.tsx** - Shows relevant sources with relevance scores
- **CrawlForm.tsx** - Admin interface for adding knowledge base content with embedding provider selection
- **ClerkProvider.tsx** - Authentication provider with error boundaries
- **Header.tsx** - Navigation with enhanced user menu visibility

### Loading Components (`src/app/*/loading.tsx`)
All loading components include comprehensive accessibility features:
- **ARIA Attributes**: `aria-live`, `aria-atomic`, `role="status"`
- **Screen Reader Support**: Dynamic announcements and semantic markup
- **Progressive Loading**: Multi-phase loading with status updates
- **Timeout Handling**: Graceful timeout messages with retry options

### Utilities (`src/utils/`)
- **embeddings.ts** - Multi-provider embedding generation (OpenAI & Google)
- **crawler.ts** - Web scraping with Cheerio
- **documents.ts** - Text chunking and processing
- **seed.ts** - Knowledge base seeding operations with embedding provider support
- **admin.ts** - Admin utility functions and validation
- **startup.ts** - Application startup validation and health checks
- **rateLimiter.ts** - Distributed rate limiting with Redis/memory/disabled modes
- **errorTracking.ts** - Centralized error tracking with privacy controls
- **apiResponse.ts** - Standardized API response utilities with error handling

## Key Dependencies
- **Vercel AI SDK** (`ai`) - Streaming chat responses
- **OpenAI SDK** (`@ai-sdk/openai`) - GPT-4o-mini model and embeddings
- **Google AI SDK** (`@ai-sdk/google`) - Gemini models and embeddings
- **Pinecone** (`@pinecone-database/pinecone`) - Vector database (optional)
- **Clerk** (`@clerk/nextjs`, `@clerk/backend`) - Authentication and user management
- **LangChain** (`langchain`) - Document processing and chunking
- **Cheerio** (`cheerio`) - Web scraping

## Embedding Configuration

### OpenAI Embeddings
- **Model**: `text-embedding-3-small` with `dimensions: 1024`
- **Quality**: High-quality semantic search
- **Use Case**: Primary embedding provider

### Google Embeddings
- **Model**: `embedding-001` with `dimensions: 768`
- **Quality**: Fast and cost-effective
- **Use Case**: Alternative provider with fallback

### Dynamic Index Creation
- **Automatic Dimensions**: Index created with correct dimensions based on provider
- **Provider Matching**: Embedding provider selection during crawling
- **Fallback Handling**: Graceful degradation when providers fail

## Error Handling Patterns

### Multi-Provider Fallback Strategy
The application gracefully handles provider unavailability:
1. **Google API fails** → Fallback to OpenAI embeddings
2. **Google API key missing** → Use OpenAI embeddings
3. **Any Google error** → Automatic OpenAI fallback
4. **Pinecone unavailable** → Demo mode

### Context Retrieval
- `minScore` filtering (default 0.3) for relevance
- Token truncation (default 3000) for context size
- Dual return modes: text-only or full ScoredVector objects
- **Provider Matching**: Chat model selection determines embedding provider
- **Troubleshooting**: If "No relevant context found", lower minScore in both `/api/context` and `getContext()`

## Data Flow
1. User message → Chat component
2. Model selection → Embedding provider selection
3. Message sent to `/api/chat` with model parameter
4. Context retrieved via `getContext()` with matching embedding provider
5. AI streaming response with injected context
6. Frontend displays message + context panel

## Type Definitions (`src/types/index.ts`)
- **Page** - Crawled web page structure
- **SeedOptions** - Document chunking configuration  
- **Metadata** - Vector metadata structure
- **ScoredVector** - Search result with relevance score
- **EmbeddingProvider** - Provider selection type ('openai' | 'google')

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
2. **Environment Variables**: Checks required and optional variables including Google AI
3. **Rate Limiting**: Validates rate limiting configuration and Redis setup
4. **AI Provider Status**: Reports OpenAI and Google AI configuration status

## Recent Updates

### Multi-Provider AI System
- ✅ Added Google AI SDK support
- ✅ Multi-model chat interface with model selection
- ✅ Embedding provider selection for crawling
- ✅ Automatic provider matching (chat model → embedding provider)
- ✅ Fallback system for Google embeddings
- ✅ Dynamic index creation with correct dimensions
- ✅ Enhanced UI with provider selection controls

### Advanced Crawling Enhancements
- ✅ Configurable crawl modes (single, limited, deep)
- ✅ Comprehensive error tracking and partial success handling
- ✅ Smart retry logic for transient errors (timeouts, 5xx, network)
- ✅ Synchronized timeout management between API and crawler
- ✅ Enhanced crawl configuration validation with security bounds
- ✅ Rich UI error reporting with failed pages and error details
- ✅ Mode-specific rate limiting with admin bypass functionality
- ✅ Proper getUserEmail() integration with Clerk authentication

### Security & Configuration
- ✅ Removed misleading robots.txt configuration
- ✅ Added comprehensive input validation and sanitization
- ✅ Enhanced admin dashboard with real-time configuration display
- ✅ Server-side environment variable access for security
- ✅ Improved error messages and user feedback

### Enhanced Features
- ✅ Model selector in chat interface
- ✅ Embedding provider selector in crawl form
- ✅ Provider-specific dimension handling
- ✅ Comprehensive error handling and fallbacks
- ✅ Updated documentation and validation
- ✅ Partial success warnings and detailed error displays