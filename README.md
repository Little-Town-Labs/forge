# Forge

**FORGE - Framework Operations & Resource Guidance Engine**

A Next.js chatbot application built with the Vercel AI SDK and context-aware responses.

## Features

### AI & Intelligence
- **Multi-Provider AI Support**: OpenAI and Google AI models with easy switching
- **Multi-Provider Embeddings**: OpenAI and Google embeddings with automatic fallback
- **Context-Aware Responses**: Semantic search with relevant source display
- **Real-Time Chat**: Streaming responses with modern UI

### Advanced Crawling System
- **Configurable Crawl Modes**: Single page, limited crawl (1-50 pages), or deep crawl (2-3 levels)
- **Comprehensive Error Tracking**: Partial success handling with detailed error reporting
- **Smart Retry Logic**: Automatic retry for transient errors (timeouts, 5xx responses)
- **Synchronized Timeout Management**: Coordinated API and crawler timeouts

### Security & Administration
- **Clerk Authentication**: Secure user management with admin controls
- **Admin Dashboard**: Real-time configuration monitoring and management
- **Distributed Rate Limiting**: Redis-backed rate limiting with memory fallback
- **Input Validation**: Comprehensive security bounds and sanitization

### User Experience  
- **Modern Design**: Responsive design with dark mode support
- **Rich Error Feedback**: Clear success/warning/error states with detailed information
- **Progressive UI**: Loading states, accessibility features, and intuitive controls
- **Demo Mode**: Works immediately without configuration for testing

## Getting Started

### Prerequisites

- Node.js 18+ 
- OpenAI API key (required for AI models and embeddings)
- Clerk account and API keys (required for authentication)
- Admin email address (required for admin access)
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

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Demo Mode (Default)
- The chatbot works immediately with demo context
- Context panel shows sample relevant sources
- Perfect for testing the interface and functionality

### Full Knowledge Base Mode
1. Set up Pinecone API key and index name in `.env.local`
2. Sign in with admin credentials (email must be in `ADMIN_EMAILS`)
3. Click the "Add Knowledge Base" button on the main page
4. Enter a website URL you want to crawl
5. **Choose crawl mode**:
   - **Single Page**: Crawl just the specified URL (~30 seconds)
   - **Limited Crawl**: Crawl 1-50 pages from the site (~1-10 minutes)
   - **Deep Crawl**: Multi-level crawling 2-3 levels deep (~5-10 minutes)
6. **Select embedding provider** (OpenAI or Google) for the crawl
7. Click "Crawl Website" to index the content
8. The system will show detailed progress including any failed pages
9. The chatbot will now use this content for context-aware responses

### AI Model Selection

- Choose between OpenAI (GPT-4o-mini) and Google (Gemini 1.5 Flash) models
- Switch models using the radio buttons above the chat interface
- Each model has different strengths and capabilities
- Context-aware responses work with both models
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
- Redis (rate limiting, optional)
- Cheerio (web scraping)
- Node.js server-side operations

## API Endpoints

### Public Endpoints
- `/api/chat` - Main chat endpoint with context-aware responses
- `/api/context` - Retrieve relevant context for queries
- `/api/health` - Health check with configuration validation

### Admin Endpoints (Authentication Required)
- `/api/crawl` - Crawl and index website content with configurable modes
- `/api/invitations` - Manage user invitations with rate limiting
- `/api/admin/config` - Detailed system configuration status
- `/api/admin/rate-limit-status` - Rate limiting status, memory store statistics, and manual cleanup

## Current Implementation Status

### ✅ Completed
- **Multi-provider AI system** (OpenAI & Google)
- **Multi-provider embeddings** (OpenAI & Google)
- **Advanced crawling system** with configurable modes
- **Comprehensive error tracking** and partial success handling
- **Clerk authentication** with admin controls
- **Distributed rate limiting** with Redis support and smart memory store management
- **Admin dashboard** with real-time configuration monitoring and memory statistics
- Context-aware chat interface with streaming responses
- Context panel with source display and relevance scores
- Web crawling infrastructure with smart retry logic
- Embeddings generation with automatic fallback
- Demo context system for immediate testing
- **Full Pinecone integration** with dynamic index creation
- Input validation and security sanitization
- Synchronized timeout management
- Rich UI feedback with detailed error reporting
- **Enhanced admin access diagnostics** with comprehensive error logging
- **Emergency admin bypass mechanisms** for service failure scenarios
- **Memory store cleanup** with proper handling of invitation and crawl rate limit keys

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
