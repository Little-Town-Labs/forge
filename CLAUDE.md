# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Database Management
- `npm run setup-db` - Setup database with schema and seed data
- `npm run db:setup` - Alias for setup-db
- `npm run test-setup` - Test database connectivity
- `npm run validate-db-system` - Validate database validation system
- `npm run verify-models` - Verify model configuration consistency
- `npm run test-db-validation` - Test database validation implementation

### Environment Setup
Create `.env.local` with:
```
# Required - AI and Authentication
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here

# Required - Admin Configuration
ADMIN_EMAILS=admin@company.com,manager@company.com

# Required - Database Configuration
POSTGRES_URL=postgresql://username:password@hostname:port/database

# Optional - Database Configuration Encryption
CONFIG_ENCRYPTION_KEY=your_32_character_encryption_key_here

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

# Optional - Emergency Admin Access (fallback mechanism)
# Comma-separated list of Clerk user IDs for admin bypass when email lookup fails
# EMERGENCY_ADMIN_USER_IDS=user_abc123,user_def456
```

## Architecture Overview

**Forge** is a Next.js 15 chatbot application with context-aware responses using semantic search and database-driven configuration. The system operates with graceful degradation across multiple modes:

### Operation Modes

#### Full Operation Mode
- Database fully configured with admin configuration system
- AI models managed through database-driven configuration
- RAG crawling with database-backed URL management
- Complete audit logging and monitoring

#### Demo Mode (Graceful Degradation)
- Works without database or Pinecone configuration
- Returns hardcoded demo context in `src/utils/context.ts`
- Uses fallback AI model configurations
- Perfect for testing interface and functionality
- Automatic fallback when database connection fails

#### Readonly Mode (Partial Functionality)
- Database connected but some schema components missing
- Limited configuration modifications
- Read-only access to existing data

#### Disabled Mode (Service Unavailable)
- Critical database or configuration errors
- Minimal functionality available
- Clear error messages and setup instructions

## AI Provider System

### Multi-Model Support
- **OpenAI**: GPT-5-nano for chat, text-embedding-3-small for embeddings
- **Google**: Gemini 2.5 Flash for chat, embedding-001 for embeddings
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
- **Admin Bypass**: Administrators can bypass crawl rate limits with comprehensive logging
- **Distributed Rate Limiting**: Redis-backed rate limiting with memory fallback
- **Enhanced Error Handling**: Comprehensive admin access diagnostics and fallback mechanisms
- **Memory Store Management**: Smart cleanup for both invitation and crawl rate limit keys

## Core Components

### API Architecture (`src/app/api/`)
- **`/api/chat`** - Main streaming chat endpoint using Vercel AI SDK with database-driven model configuration
- **`/api/context`** - Context retrieval endpoint for frontend display
- **`/api/crawl`** - Web crawling and indexing endpoint with database-backed URL management
- **`/api/health`** - Health check endpoint with database validation and configuration status
- **`/api/admin/config`** - Comprehensive admin configuration management system
  - **`/api/admin/config/models`** - AI model configuration management
  - **`/api/admin/config/knowledge-base`** - RAG URL configuration management
  - **`/api/admin/config/models/test`** - AI model connection testing
- **`/api/admin/rate-limit-status`** - Rate limiting status, memory store statistics, and manual cleanup (admin-only)
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
- **crawler.ts** - Web scraping with Cheerio, enhanced error tracking, and database status integration
- **documents.ts** - Text chunking and processing
- **seed.ts** - Knowledge base seeding operations with embedding provider support
- **admin.ts** - Admin utility functions and validation
- **startup.ts** - Comprehensive application startup validation with database health checks
- **degradation.ts** - Graceful degradation mode management and feature availability detection
- **rateLimiter.ts** - Distributed rate limiting with Redis/memory/disabled modes and admin access diagnostics
- **errorTracking.ts** - Centralized error tracking with privacy controls
- **apiResponse.ts** - Standardized API response utilities with error handling

### Database Layer (`src/lib/`)
- **database.ts** - Database connectivity, schema validation, and health monitoring
- **config-service.ts** - Database-driven configuration management with encryption and audit logging
- **encryption.ts** - Field-level encryption for sensitive configuration data

## Key Dependencies
- **Vercel AI SDK** (`ai`) - Streaming chat responses
- **OpenAI SDK** (`@ai-sdk/openai`) - GPT-5-nano model and embeddings
- **Google AI SDK** (`@ai-sdk/google`) - Gemini models and embeddings
- **Vercel Postgres** (`@vercel/postgres`) - Database operations and configuration management
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

## Database Validation & Startup System

**Forge** includes a comprehensive database validation and startup system with graceful degradation:

### Database Validation Features
- **Connectivity Testing**: Tests database connection health with response time measurement
- **Schema Validation**: Validates presence of required tables, indexes, and triggers
- **Data Integrity Checking**: Ensures essential data like default AI models exist
- **Graceful Degradation**: Automatic fallback to demo mode when database unavailable

### Startup Validation
- Runs comprehensive validation during application startup
- Validates admin configuration, environment variables, rate limiting, and database
- Supports graceful degradation modes: `none`, `demo`, `readonly`, `disabled`
- Provides clear setup instructions for different failure scenarios
- Exits application in production only for critical errors

### Health Check Endpoints
- **`/api/health`** - Public health check with database validation status
- **`/api/admin/config`** - Detailed configuration information (admin-only)
- Returns appropriate HTTP status codes based on application health
- Includes degradation mode information and feature availability

### Validation Components
1. **Database Configuration**: Tests connectivity, schema completeness, and data integrity
2. **Admin Configuration**: Validates `ADMIN_EMAILS` format, count, and security
3. **Environment Variables**: Checks required and optional variables including database URLs
4. **Rate Limiting**: Validates rate limiting configuration and Redis setup
5. **AI Provider Status**: Reports OpenAI and Google AI configuration status

### Setup Commands
- `npm run setup-db` - Automated database schema and seed data setup
- `npm run validate-db-system` - Validate database validation system implementation
- `npm run verify-models` - Check model configuration consistency between seed data and fallbacks

## Admin Access & Troubleshooting

### Enhanced Admin Detection
- **Comprehensive Error Logging**: Detailed diagnostics when admin email lookup fails
- **Fallback Mechanisms**: Emergency admin bypass using `EMERGENCY_ADMIN_USER_IDS`
- **Service Health Monitoring**: Automatic detection of Clerk service issues
- **Configuration Diagnostics**: Automated troubleshooting of admin access problems

### Admin Access Troubleshooting
When admin users cannot bypass rate limits, the system provides:
1. **Diagnostic Information**: Checks `CLERK_SECRET_KEY` and `ADMIN_EMAILS` configuration
2. **Network Issue Detection**: Identifies connectivity problems with Clerk API
3. **Service Status Monitoring**: Reports Clerk API availability and rate limiting
4. **Emergency Bypass Options**: Fallback mechanism using Clerk user IDs

### Memory Store Management
- **Smart Cleanup**: Handles both invitation and crawl rate limit keys correctly
- **Statistics Monitoring**: Tracks memory usage, key counts, and entry age
- **Manual Cleanup**: Admin endpoint for forcing memory store cleanup
- **Performance Monitoring**: Memory usage estimation and cleanup logging

### Rate Limiting Diagnostics
- **Memory Store Statistics**: Real-time monitoring of in-memory rate limit data
- **Cleanup Reporting**: Logs cleanup activity with key type breakdown
- **Performance Recommendations**: Warns about high memory usage or key counts
- **Manual Controls**: Admin tools for testing and debugging rate limits

## Recent Updates

### Production Deployment & Initialization System (Latest)
- ✅ **Automatic Database Initialization**: Production-ready automatic schema and seed data setup on first startup
- ✅ **Middleware Integration**: Database initialization integrated into Next.js middleware for seamless startup
- ✅ **Startup Validation System**: Comprehensive environment validation, encryption setup, and system health checks
- ✅ **Service Health Monitoring**: Graceful error handling with appropriate HTTP status codes when initialization fails
- ✅ **Initialization API Endpoints**: Admin endpoints (`/api/admin/system/init`) for monitoring and controlling initialization status
- ✅ **Memory Safety Enhancements**: Improved encryption with explicit key material cleanup and async operations
- ✅ **Type System Improvements**: Resolved all TypeScript inconsistencies between database schema and interfaces
- ✅ **Database-Integrated Crawling**: Crawler now properly uses `Crawler.fromDatabaseConfig()` method with status tracking
- ✅ **Enhanced Security**: Improved encryption implementation with better error handling and security practices
- ✅ **Code Quality**: All TypeScript and ESLint errors resolved, ensuring type safety throughout the application

### Database-Driven Configuration System
- ✅ Complete admin configuration system with database-backed AI model management
- ✅ RAG URL configuration with database persistence and crawl status tracking
- ✅ Field-level encryption for sensitive configuration data (API keys)
- ✅ Comprehensive audit logging for all configuration changes
- ✅ Database schema with proper constraints, indexes, and triggers
- ✅ Transaction support with rollback capabilities for data integrity

### Database Validation & Startup System
- ✅ Comprehensive database validation system with connectivity, schema, and data integrity checks
- ✅ Graceful degradation modes: `none`, `demo`, `readonly`, `disabled`
- ✅ Startup validation orchestration with clear error messages and setup instructions
- ✅ Runtime degradation detection and monitoring with automatic fallback
- ✅ Database health monitoring with response time measurement
- ✅ Integration examples and middleware for API route protection

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
- ✅ Database integration for crawl status updates and progress tracking

### Security & Configuration
- ✅ Removed misleading robots.txt configuration
- ✅ Added comprehensive input validation and sanitization
- ✅ Enhanced admin dashboard with real-time configuration display
- ✅ Server-side environment variable access for security
- ✅ Improved error messages and user feedback
- ✅ Database setup automation with verification and rollback capabilities

### Admin Access & Rate Limiting Enhancements
- ✅ Enhanced admin access diagnostics with comprehensive error logging
- ✅ Emergency admin bypass fallback mechanism using `EMERGENCY_ADMIN_USER_IDS`
- ✅ Fixed memory store cleanup to handle both invitation and crawl rate limit keys
- ✅ Added memory store statistics monitoring and manual cleanup tools
- ✅ Comprehensive troubleshooting for admin privilege detection failures
- ✅ Smart rate limiting cleanup with proper TTL handling for different key types

### Enhanced Features
- ✅ Model selector in chat interface with database-driven configuration
- ✅ Embedding provider selector in crawl form
- ✅ Provider-specific dimension handling
- ✅ Comprehensive error handling and fallbacks
- ✅ Updated documentation and validation
- ✅ Partial success warnings and detailed error displays
- ✅ Database-driven fallback model configurations for resilient operation