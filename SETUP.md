# Forge Setup Guide

## Resolving Pinecone 404 Error

The error you're seeing indicates that the Pinecone index doesn't exist or isn't accessible. Follow these steps to resolve it:

### Step 1: Check Your Environment Variables

Create or update your `.env.local` file in the `forge` directory:

```bash
OPENAI_API_KEY=your_openai_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX=forge-knowledge-base
```

### Step 2: Get Your Pinecone API Key

1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Sign in to your account
3. Go to API Keys section
4. Copy your API key (starts with something like `sk-...`)

### Step 3: Choose an Index Name

Pick a simple, alphanumeric name for your index (no spaces or special characters):
- Good: `forge-knowledge-base`, `my-index`, `test123`
- Bad: `my index`, `test-index!`, `my.index`

### Step 4: Test the Setup

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Try crawling a simple website first:
   - Go to your app at `http://localhost:3000`
   - Click "Add Knowledge Base"
   - Enter a simple URL like `https://example.com`
   - Click "Crawl Website"

### Step 5: Verify Index Creation

The application will automatically:
1. Check if the index exists
2. Create it if it doesn't exist
3. Wait for it to be ready (10 seconds)
4. Index your crawled content

### Troubleshooting

#### If you still get 404 errors:

1. **Check API Key**: Verify your Pinecone API key is correct
2. **Check Permissions**: Ensure your Pinecone account can create indexes
3. **Check Index Name**: Use only alphanumeric characters, no spaces
4. **Wait Longer**: Index creation can take up to 1-2 minutes

#### If you want to use demo mode:

Simply don't set the Pinecone environment variables. The app will automatically use demo context.

### Manual Index Creation (Alternative)

If automatic creation fails, you can create the index manually:

1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Click "Create Index"
3. Name: `forge-knowledge-base` (or your chosen name)
4. Dimensions: `1536`
5. Metric: `cosine`
6. Cloud: `aws`
7. Region: `us-east-1`

Then restart your app and try crawling again.

### Success Indicators

When everything is working correctly, you should see:
- Console logs showing "Creating Pinecone index"
- "Waiting for index to be ready..."
- "Successfully indexed X vectors in namespace: default"
- The crawl form shows "Successfully crawled and indexed the website!" 