# Forge

**FORGE - Framework Operations & Resource Guidance Engine**

A Next.js chatbot application with database-driven configuration, multi-provider AI support, and context-aware responses using semantic search.

## Features

### Database-Driven Configuration
- **Admin Configuration System**: Complete database-backed AI model and RAG URL management
- **Field-Level Encryption**: Secure storage of sensitive configuration data (API keys)
- **Audit Logging**: Comprehensive logging of all configuration changes with admin attribution
- **Graceful Degradation**: Automatic fallback to demo mode when database unavailable
- **Database Validation**: Comprehensive startup validation with clear setup instructions

### AI & Intelligence
- **Multi-Provider AI Support**: Database-configured OpenAI and Google AI models with admin controls
- **Multi-Provider Embeddings**: OpenAI and Google embeddings with automatic fallback
- **Context-Aware Responses**: Semantic search with relevant source display
- **Real-Time Chat**: Streaming responses with modern UI
- **Dynamic Model Selection**: Runtime model switching with database persistence

### Advanced Crawling System
- **Database-Backed RAG URLs**: Persistent crawl configuration and status tracking
- **Configurable Crawl Modes**: Single page, limited crawl (1-50 pages), or deep crawl (2-3 levels)
- **Comprehensive Error Tracking**: Partial success handling with detailed error reporting
- **Smart Retry Logic**: Automatic retry for transient errors (timeouts, 5xx responses)
- **Synchronized Timeout Management**: Coordinated API and crawler timeouts

### Security & Administration
- **Clerk Authentication**: Secure user management with admin controls
- **Database Security**: Transaction-based operations with rollback capabilities
- **Admin Dashboard**: Real-time configuration monitoring and management
- **Integrated Admin Panel**: Access admin functions directly from the chat interface
- **Distributed Rate Limiting**: Redis-backed rate limiting with memory fallback
- **Input Validation**: Comprehensive security bounds and sanitization

### User Experience  
- **Modern Design**: Responsive design with dark mode support
- **Rich Error Feedback**: Clear success/warning/error states with detailed information
- **Progressive UI**: Loading states, accessibility features, and intuitive controls
- **Demo Mode**: Works immediately without configuration for testing
- **Health Monitoring**: Built-in health checks with degradation mode indicators
- **Integrated Admin Access**: Seamless admin panel integration within the chat interface

## Integrated Admin Panel

The Forge application now features an **integrated admin panel** that provides seamless access to administrative functions directly from the chat interface. This eliminates the need to navigate between different pages while maintaining your chat context.

### Features

- **Slide-out Panel Design**: Collapsible admin panel that overlays the chat interface
- **Real-time Model Configuration**: Update AI model settings and immediately see changes in chat
- **Knowledge Base Management**: Manage RAG URLs and crawling without leaving the chat
- **System Health Monitoring**: Real-time system status and performance metrics
- **Audit Log Access**: View configuration change history and admin actions
- **Responsive Design**: Full-screen modal on mobile, side panel on desktop

### Access Methods

1. **Header Button**: Click the Admin button in the chat page header
2. **Keyboard Shortcuts**: 
   - `Ctrl+Shift+A` to toggle the admin panel
   - `Esc` to close the panel
3. **Floating Toggle**: Admin button changes appearance when panel is open

### Integration Benefits

- **Context Preservation**: Maintain chat history and context while configuring
- **Immediate Feedback**: See model changes reflected instantly in chat
- **Workflow Efficiency**: No need to switch between admin and chat pages
- **Real-time Updates**: Knowledge base changes immediately affect chat context
- **Unified Experience**: Single interface for both chat and administration

### Security

The integrated admin panel maintains the same security standards as the standalone admin dashboard:
- **Admin-only access through Clerk authentication**
- **Email-based admin verification**
- **Comprehensive audit logging of all changes**
- **Secure API key management with encryption**
- **Client-side security**: Sensitive environment variables like `ADMIN_EMAILS` are never exposed to the client
- **Server-side validation**: All admin validation happens through secure API endpoints
- **Protected components**: Client components use API calls instead of direct environment variable access

## Admin Setup

### Standalone Admin Dashboard
Access the full admin interface at `/admin` for comprehensive system configuration:
- AI Model management with API key encryption
- Knowledge base URL configuration and crawling
- System health monitoring and performance metrics
- Comprehensive audit logging and change history

### Integrated Admin Panel
Access admin functions directly from the chat interface:
- Click the Admin button in the chat page header
- Use keyboard shortcuts: `Ctrl+Shift+A` to toggle, `Esc` to close
- Real-time model configuration that immediately affects chat
- Knowledge base management with instant context updates

### Admin Configuration
1. Set `ADMIN_EMAILS` in your environment variables
2. Sign in with a Clerk account using one of the admin emails
3. Access admin functions through either interface
4. Configure AI models and knowledge base URLs
5. Monitor system health and audit logs

## Security Architecture

### Client-Side Security
The application implements a secure architecture that protects sensitive information:

- **Environment Variable Protection**: Sensitive variables like `ADMIN_EMAILS` are never exposed to client-side code
- **API-Based Validation**: All admin validation happens through secure server-side API endpoints
- **Secure Components**: Client components (Header, AdminGuard, etc.) use API calls instead of direct environment variable access
- **No Client-Side Admin Logic**: All admin validation logic remains server-side for maximum security

### Admin Access Control
Admin functionality is secured through multiple layers:

- **Authentication**: Clerk handles user authentication and session management
- **Authorization**: Server-side API endpoints validate admin privileges using environment variables
- **API Security**: Admin status checking through `/api/admin/status` endpoint
- **Component Protection**: AdminGuard component wraps admin-only content with secure validation
- **Audit Logging**: All admin actions are logged for security monitoring

### Security Best Practices
- **Server-Side Only**: Never expose sensitive environment variables to client-side code
- **API-Based Access**: Use API endpoints for any server-side data that clients need
- **Secure Validation**: Keep all validation logic server-side
- **Client-Side Safety**: Client components should only make API calls, never access `process.env` directly

## Getting Started

### Prerequisites

- Node.js 18+ 
- **Database**: Vercel Postgres (required for configuration management)
- **AI Provider**: OpenAI API key (required for AI models and embeddings)
- **Authentication**: Clerk account and API keys (required for user management)
- **Admin Access**: Admin email address (required for configuration access)
- **Admin Interface**: Both standalone admin dashboard (`/admin`) and integrated admin panel available
- Google AI API key (optional - for Gemini models and embeddings)
- Pinecone API key and index (optional - enables knowledge base features)
- Redis instance (optional - for distributed rate limiting)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file in the root directory:
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
# Use only when normal admin detection fails due to service issues
EMERGENCY_ADMIN_USER_IDS=user_abc123,user_def456
```

3. Set up the database:
```bash
npm run setup-db
```

4. Verify the setup:
```bash
npm run validate-db-system
npm run verify-models
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Operation Modes

The application operates with automatic graceful degradation:

#### Full Operation Mode
- Database fully configured and connected
- Admin configuration system accessible
- AI models managed through database
- Complete RAG functionality with audit logging

#### Demo Mode (Graceful Degradation)
- Activates automatically if database connection fails
- Uses hardcoded demo context and fallback AI configurations
- Perfect for testing the interface and functionality
- All core chat features remain functional

#### Readonly Mode
- Database connected but some components missing
- Limited configuration modifications
- Read-only access to existing data

### Admin Configuration Management

1. **Setup Database**: Run `npm run setup-db` to initialize (or automatic on first startup)
2. **Access Admin Panel**: Sign in with admin credentials (email in `ADMIN_EMAILS`)
3. **Configure AI Models**: Access `/admin/config` to manage model configurations
4. **Manage Knowledge Base**: Configure RAG URLs and crawl settings
5. **Monitor System Health**: Check application status and degradation mode
6. **Initialization Control**: Use `/api/admin/system/init` for initialization status and control

### Automatic Production Deployment

The application features automatic initialization for production environments:

- **First Startup**: Database schema and seed data are automatically created on first run
- **Health Monitoring**: Middleware ensures system is properly initialized before processing requests
- **Graceful Degradation**: Service returns appropriate HTTP status codes during initialization
- **Admin Control**: Monitor and control initialization through dedicated API endpoints
- **Environment Validation**: Comprehensive checks for required configuration

### Knowledge Base Management

1. **Database Setup**: Ensure database is configured and running
2. **Admin Access**: Sign in with admin credentials
3. **Configure RAG URLs**: Navigate to admin configuration panel
4. **Add Knowledge Sources**:
   - **Single Page**: Crawl just the specified URL (~30 seconds)
   - **Limited Crawl**: Crawl 1-50 pages from the site (~1-10 minutes)
   - **Deep Crawl**: Multi-level crawling 2-3 levels deep (~5-10 minutes)
5. **Monitor Progress**: Track crawl status and error handling
6. **Context-Aware Responses**: Chat system automatically uses indexed content

### AI Model Selection

- **Database-Driven Models**: Models configured through admin panel
- **Runtime Selection**: Switch models using radio buttons above chat interface
- **Provider Support**: OpenAI (GPT-5-nano) and Google (Gemini 2.5 Flash) models
- **Configuration Management**: Admin can modify model parameters, API keys, and defaults
- **Automatic Matching**: Chat model selection determines embedding provider

### Embedding Provider Selection

- **OpenAI Embeddings**: 1024 dimensions, high quality semantic search
- **Google Embeddings**: 768 dimensions, fast and cost-effective
- Select embedding provider when crawling websites
- Automatic fallback to OpenAI if Google embeddings fail
- **Smart Matching**: Google chat model uses Google embeddings, OpenAI uses OpenAI embeddings

### Chatting with Context

- The chatbot automatically retrieves relevant context for your questions
- The context panel shows the sources being used with relevance scores
- Responses are based on both the indexed content and general knowledge
- Context is displayed in a clean, scrollable panel

## Project Structure

- `src/components/` - React components for the chat interface
- `src/app/api/` - API routes for chat, context, and crawling
- `src/utils/` - Utility functions for crawling, embeddings, and context
- `src/types/` - TypeScript type definitions

## Technologies Used

### Core Framework
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS

### AI & Machine Learning
- Vercel AI SDK
- **Multi-Provider AI**: OpenAI & Google AI Models
- **Multi-Provider Embeddings**: OpenAI & Google Embeddings
- Pinecone Vector Database (optional)
- LangChain (document processing)

### Authentication & Security
- Clerk (authentication and user management)
- Input validation and sanitization
- Distributed rate limiting with memory store management
- Admin access controls with enhanced diagnostics
- Emergency admin bypass mechanisms
- Comprehensive error logging and troubleshooting

### Infrastructure
- **Vercel Postgres** (database operations and configuration management)
- Redis (rate limiting, optional)
- Cheerio (web scraping)
- Node.js server-side operations

## API Endpoints

### Public Endpoints
- `/api/chat` - Main chat endpoint with database-driven model configuration
- `/api/context` - Retrieve relevant context for queries
- `/api/health` - Health check with database validation and degradation mode status

### Admin Endpoints (Authentication Required)
- `/api/admin/config` - Comprehensive admin configuration management system
  - `/api/admin/config/models` - AI model configuration management
  - `/api/admin/config/knowledge-base` - RAG URL configuration management
  - `/api/admin/config/models/test` - AI model connection testing
- `/api/crawl` - Crawl and index website content with database-backed configuration
- `/api/invitations` - Manage user invitations with rate limiting
- `/api/admin/rate-limit-status` - Rate limiting status, memory store statistics, and manual cleanup

## Current Implementation Status

### ✅ Completed
- **Component Architecture & Communication Improvements** (Latest)
  - **Callback-Based Communication**: Replaced global event system with proper callback props for better component communication
  - **Lazy Loading Fixes**: Corrected admin component lazy loading imports ensuring all components load properly
  - **Grid Layout Improvements**: Enhanced chat page grid layout for seamless admin panel integration
  - **Event Listener Integration**: Added automatic model refresh when admin changes are made
  - **Component Separation**: Clean separation of utility functions and React hooks for better server/client compatibility
  - **Type Safety Enhancements**: Resolved all TypeScript errors and improved type definitions throughout the codebase
  - **Import Path Corrections**: Fixed component import paths and export patterns for consistent architecture
  - **Responsive Design**: Improved grid layout responsiveness across different screen sizes
- **Production Deployment & Initialization System**
  - **Automatic Database Initialization**: Schema and seed data setup on first startup
  - **Middleware Integration**: Seamless initialization through Next.js middleware
  - **Startup Validation System**: Environment, encryption, and system health checks
  - **Service Health Monitoring**: Graceful error handling with proper HTTP status codes
  - **Memory Safety Enhancements**: Improved encryption with key cleanup and async operations
  - **Type System Improvements**: All TypeScript inconsistencies resolved
  - **Database-Integrated Crawling**: Proper `Crawler.fromDatabaseConfig()` integration
  - **Enhanced Security**: Better encryption implementation and error handling
  - **Code Quality**: Zero TypeScript/ESLint errors, full type safety
- **Database-driven configuration system** with admin management interface
- **Multi-provider AI system** (OpenAI & Google) with database persistence
- **Multi-provider embeddings** (OpenAI & Google)
- **Database validation and startup system** with graceful degradation
- **Advanced crawling system** with configurable modes and database integration
- **Comprehensive error tracking** and partial success handling
- **Field-level encryption** for sensitive configuration data
- **Audit logging system** with comprehensive change tracking
- **Clerk authentication** with admin controls
- **Distributed rate limiting** with Redis support and smart memory store management
- **Admin dashboard** with real-time configuration monitoring and memory statistics
- Context-aware chat interface with streaming responses
- Context panel with source display and relevance scores
- Web crawling infrastructure with smart retry logic and database status updates
- Embeddings generation with automatic fallback
- **Graceful degradation modes** (none, demo, readonly, disabled)
- **Database health monitoring** with response time measurement
- **Full Pinecone integration** with dynamic index creation
- Input validation and security sanitization
- Synchronized timeout management
- Rich UI feedback with detailed error reporting
- **Enhanced admin access diagnostics** with comprehensive error logging
- **Emergency admin bypass mechanisms** for service failure scenarios
- **Memory store cleanup** with proper handling of invitation and crawl rate limit keys
- **Transaction support** with rollback capabilities for data integrity

### 🔄 Ready for Enhancement
- Advanced context retrieval algorithms
- Multi-modal support (images, documents)
- Additional AI providers (Anthropic, etc.)
- Robots.txt checking implementation
- Advanced conversation memory
- Performance optimizations and caching

## Next Steps

This is Step 3 of the Forge development. The next steps will include:
- Advanced conversation features and memory
- Multi-modal support (images, documents)
- Enhanced context retrieval algorithms
- User authentication and personalization
- Performance optimizations and scaling

## Troubleshooting

### Client-Side Environment Variable Issues ✅ RESOLVED
**Problem**: Console shows `ADMIN_EMAILS environment variable not set` error
**Status**: ✅ **FIXED** - This issue has been completely resolved
**What Was Fixed**:
- Client components no longer access `process.env.ADMIN_EMAILS` directly
- Admin validation now happens through secure server-side API endpoints
- New `/api/admin/status` endpoint provides secure admin status checking
- All admin functionality remains intact but is now secure

**Components Updated**:
- Header component now uses API calls instead of client-side validation
- AdminGuard component uses server-side admin validation
- useAdminStatus hook securely checks admin status through API

### Admin Panel 503 Errors ✅ RESOLVED
**Problem**: `/api/admin/config/models` returns 503 Service Unavailable
**Status**: ✅ **FIXED** - This was caused by client-side admin validation failures
**What Was Fixed**:
- Admin status checking moved to server-side API endpoints
- Client components use secure API calls instead of direct environment variable access
- Admin panel should now load correctly without 503 errors

### Database Setup Issues
- **Database Connection Failed**: Check `POSTGRES_URL` environment variable
- **Schema Setup Failed**: Run `npm run setup-db` to create required tables
- **Validation Errors**: Use `npm run validate-db-system` to check system status
- **Model Inconsistency**: Run `npm run verify-models` to check configuration consistency

### Application Degradation
- **Demo Mode**: Application falls back when database unavailable - check database connection
- **Readonly Mode**: Partial database setup - run schema setup commands
- **Health Check**: Visit `/api/health` to see current application status and degradation mode

### Authentication Issues
- Ensure `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are set correctly
- Verify your email is included in the `ADMIN_EMAILS` environment variable
- Check Clerk dashboard for user management and settings

### Admin Access Issues
When admin users cannot bypass rate limits or access admin features:

1. **Email Lookup Failures**: Check server logs for detailed diagnostics
   - Verify `CLERK_SECRET_KEY` is correctly configured
   - Ensure admin email exists in Clerk dashboard
   - Check for Clerk service connectivity issues

2. **Emergency Admin Bypass**: Use as temporary workaround
   ```bash
   # Add your Clerk user ID to emergency admin list
   EMERGENCY_ADMIN_USER_IDS=user_abc123,user_def456
   ```
   - Find your user ID in Clerk dashboard or browser dev tools
   - Only use when normal email lookup fails
   - Remove after fixing the underlying issue

3. **Service Diagnostics**: Check `/api/admin/rate-limit-status` for detailed status
   - Reports admin configuration issues
   - Shows Clerk API connectivity status
   - Provides actionable troubleshooting steps

4. **Admin Status API**: Check `/api/admin/status` endpoint for admin privilege validation
   - Secure server-side admin status checking
   - No client-side environment variable access
   - Proper error handling and authentication validation

### Context Not Loading
- Check that your OpenAI API key is set correctly
- If using Pinecone, ensure your API key and index name are configured
- The demo context will show if Pinecone is not configured
- Check the `/api/health` endpoint for configuration status

### Crawling Issues
- **Rate Limiting**: Check if you've exceeded crawl limits (visible in admin dashboard)
- **Partial Failures**: Review the detailed error report in the crawl results
- **Timeouts**: Try a simpler crawl mode (single page vs deep crawl)
- **Network Issues**: The system will automatically retry transient errors
- **Permissions**: Ensure the website allows web scraping
- **URL Accessibility**: Verify the website URL is publicly accessible

### Rate Limiting & Memory Store Issues
When using memory-based rate limiting (development mode):

1. **Memory Store Statistics**: Check `/api/admin/rate-limit-status` for memory usage
   - Shows invitation vs crawl rate limit key counts
   - Reports estimated memory usage
   - Tracks oldest and newest entries

2. **Manual Cleanup**: Force cleanup via admin endpoint
   ```bash
   # POST to admin endpoint to force cleanup
   curl -X POST /api/admin/rate-limit-status
   ```
   - Removes expired rate limit entries
   - Reports cleanup statistics
   - Helps with debugging memory issues

3. **Performance Recommendations**: 
   - Switch to Redis for production (`RATE_LIMIT_MODE=redis`)
   - Monitor memory usage warnings in admin dashboard
   - Consider cleanup if memory usage exceeds 5MB

### Pinecone Setup Issues

#### Common Error: "PineconeNotFoundError" or "404"
This error occurs when the Pinecone index doesn't exist. The application will automatically create the index if it doesn't exist, but you need to ensure:

1. **Valid API Key**: Check that your `PINECONE_API_KEY` is correct
   ```bash
   # In your .env.local file
   PINECONE_API_KEY=your_actual_pinecone_api_key_here
   ```

2. **Index Name**: Ensure your `PINECONE_INDEX` name is valid (alphanumeric, no spaces)
   ```bash
   # In your .env.local file
   PINECONE_INDEX=my-knowledge-base
   ```

3. **Permissions**: Make sure your Pinecone account has permission to create indexes

#### Environment Variables Setup
Create a `.env.local` file in the `forge` directory with:
```bash
OPENAI_API_KEY=your_openai_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX=your_index_name_here
```

#### Testing Pinecone Connection
1. Visit [Pinecone Console](https://app.pinecone.io/)
2. Verify your API key is active
3. Check if you have permission to create indexes
4. Try creating a test index manually in the console

#### Demo Mode
If Pinecone is not configured or there are issues, the application will automatically fall back to demo mode, showing sample context data.

## Recent Architectural Improvements

### Client-Side Security & Environment Variable Protection (Latest Update)

The application has undergone significant security improvements to protect sensitive environment variables and enhance client-side security:

#### ✅ Environment Variable Security
- **Eliminated Client-Side Access**: Fixed `ADMIN_EMAILS environment variable not set` console errors
- **Server-Side Only**: Sensitive environment variables like `ADMIN_EMAILS` are never exposed to client-side code
- **Secure Admin Validation**: All admin validation logic moved to server-side API endpoints
- **API-Based Architecture**: Client components now use secure API calls instead of direct environment variable access

#### ✅ New Admin Status API
- **Secure Endpoint**: Created `/api/admin/status` endpoint for admin privilege checking
- **Server-Side Validation**: Admin status validation happens securely on the server
- **Proper Authentication**: Full Clerk authentication integration with proper error handling
- **No Information Leakage**: API responses contain only necessary information without exposing server internals

#### ✅ Updated Client Components
- **Header Component**: Now uses `/api/admin/status` API instead of client-side `isAdmin()` calls
- **AdminGuard Component**: Secure server-side admin validation through API endpoints
- **useAdminStatus Hook**: Secure admin status checking without exposing server variables
- **Protected Routes**: Admin-only content wrapped with secure validation

#### ✅ Security Benefits
- **No More Console Errors**: Eliminated environment variable access errors in browser console
- **Enhanced Security**: Admin logic remains server-side where it belongs
- **Maintained Functionality**: All admin features work exactly the same, but now securely
- **Better Architecture**: Clean separation between client and server responsibilities

### Component Architecture & Communication (Previous Update)

The Forge application has undergone significant architectural improvements to enhance maintainability, type safety, and component communication:

#### ✅ Callback-Based Communication
- **Replaced Global Events**: Eliminated `window.dispatchEvent()` calls in favor of proper React callback props
- **Cleaner Architecture**: Components now communicate through explicit callback interfaces
- **Better Testing**: Easier to test and mock component interactions
- **Type Safety**: Full TypeScript support for all component communications

#### ✅ Lazy Loading & Component Management
- **Fixed Import Patterns**: Corrected lazy loading imports for all admin components
- **Proper Component Loading**: All admin components now load correctly in the integrated panel
- **Performance Optimization**: Efficient component loading with Suspense boundaries
- **Error Boundaries**: Proper error handling for component loading failures

#### ✅ Grid Layout & Responsive Design
- **Enhanced Grid System**: Updated chat page to use 12-column grid for better flexibility
- **Admin Panel Integration**: Seamless integration with responsive column spans
- **Mobile Optimization**: Full-screen modal on mobile, side panel on desktop
- **Dynamic Layout**: Context panel and chat interface adjust based on admin panel state

#### ✅ Component Separation & Architecture
- **Utility vs Hook Separation**: Clean separation between server utilities and client hooks
- **Better Import Organization**: Consistent import patterns across all components
- **Type Safety**: Resolved all TypeScript errors and improved type definitions
- **Server/Client Compatibility**: Proper separation for Next.js App Router compatibility

#### ✅ Event-Driven Updates
- **Automatic Model Refresh**: ModelConfigContext automatically refreshes when admin changes are made
- **Real-time Updates**: Changes in admin panel immediately reflect in chat interface
- **Context Synchronization**: Knowledge base changes automatically update chat context
- **Performance Optimization**: Efficient updates without unnecessary re-renders

### Benefits of Recent Improvements

1. **Maintainability**: Cleaner, more predictable component communication
2. **Type Safety**: Full TypeScript support with no compilation errors
3. **Performance**: Optimized lazy loading and efficient state updates
4. **User Experience**: Seamless admin panel integration with responsive design
5. **Developer Experience**: Better error handling and debugging capabilities
6. **Architecture**: Cleaner separation of concerns and better code organization

### Technical Implementation Details

- **Callback Props**: AdminPanel now accepts `onModelConfigChange` and `onCrawlComplete` callbacks
- **Event Listeners**: ModelConfigContext listens for configuration changes and auto-refreshes
- **Grid System**: CSS Grid with dynamic column spans based on admin panel state
- **Lazy Loading**: React.lazy() with proper default export handling
- **Type Definitions**: Improved interfaces and proper TypeScript typing throughout

These improvements ensure that the Forge application maintains high code quality, excellent user experience, and robust architecture for future development.