# Forge

**FORGE - Framework Operations & Resource Guidance Engine**

A Next.js chatbot application built with the Vercel AI SDK and context-aware responses.

## Features

- Real-time chat interface with streaming responses
- Context-aware responses using semantic search
- Web crawling and knowledge base seeding (Pinecone integration ready)
- Modern, responsive design with dark mode support
- Context panel showing relevant sources
- Admin interface for adding knowledge base content
- Demo context system for testing

## Getting Started

### Prerequisites

- Node.js 18+ 
- OpenAI API key (required)
- Google AI API key (optional - for Gemini models)
- Pinecone API key and index (optional for full functionality)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file in the root directory and add your API keys:
```
OPENAI_API_KEY=your_openai_api_key_here
# Optional - for Google Gemini models:
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
# Optional for full functionality:
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX=your_pinecone_index_name
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
2. Click the "Add Knowledge Base" button on the main page
3. Enter a website URL you want to crawl
4. Click "Crawl Website" to index the content
5. The chatbot will now use this content for context-aware responses

### AI Model Selection

- Choose between OpenAI (GPT-4o-mini) and Google (Gemini 1.5 Flash) models
- Switch models using the radio buttons above the chat interface
- Each model has different strengths and capabilities
- Context-aware responses work with both models

### Embedding Provider Selection

- **OpenAI Embeddings**: 1024 dimensions, high quality semantic search
- **Google Embeddings**: 768 dimensions, fast and cost-effective
- Select embedding provider when crawling websites
- Automatic fallback to OpenAI if Google embeddings fail
- Different embedding providers can be used for crawling vs. chat

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

- Next.js 15
- React 19
- Vercel AI SDK
- OpenAI & Google AI Models
- OpenAI & Google Embeddings
- Pinecone Vector Database (optional)
- Tailwind CSS
- TypeScript

## API Endpoints

- `/api/chat` - Main chat endpoint with context-aware responses
- `/api/context` - Retrieve relevant context for queries
- `/api/crawl` - Crawl and index website content

## Current Implementation Status

### ✅ Completed
- Context-aware chat interface
- Context panel with source display
- Web crawling infrastructure
- Embeddings generation
- Demo context system
- Admin interface for knowledge base management
- **Full Pinecone integration**

### 🔄 Ready for Enhancement
- Advanced context retrieval algorithms
- Multi-modal support
- User authentication

## Next Steps

This is Step 3 of the Forge development. The next steps will include:
- Advanced conversation features and memory
- Multi-modal support (images, documents)
- Enhanced context retrieval algorithms
- User authentication and personalization
- Performance optimizations and scaling

## Troubleshooting

### Context Not Loading
- Check that your OpenAI API key is set correctly
- If using Pinecone, ensure your API key and index name are configured
- The demo context will show if Pinecone is not configured

### Crawling Issues
- Ensure the website URL is accessible
- Check browser console for any error messages
- Verify that the website allows web scraping

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
