# Environment Setup Guide

This guide will help you set up the required environment variables to resolve the startup errors.

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

### Database Configuration
```bash
# Required: PostgreSQL connection string
POSTGRES_URL=postgres://username:password@localhost:5432/forge
```

### OpenAI Configuration
```bash
# Required: Your OpenAI API key
OPENAI_API_KEY=your_openai_api_key_here
```

### NextAuth Configuration
```bash
# Required: NextAuth configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
```

## Optional Environment Variables

### Encryption
```bash
# Optional: 32-character encryption key for config encryption
CONFIG_ENCRYPTION_KEY=your_32_character_encryption_key_here
```

### Vector Search (Pinecone)
```bash
# Optional: Pinecone configuration for vector search
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX=your_pinecone_index_here
```

### Clerk Authentication (Alternative to NextAuth)
```bash
# Optional: Clerk configuration
CLERK_SECRET_KEY=your_clerk_secret_key_here
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
```

## Quick Setup

1. **Copy the template above** and create `.env.local` in your project root
2. **Fill in your actual values** for the required variables
3. **Restart your development server** after adding the environment variables

## Generating a NextAuth Secret

To generate a secure NextAuth secret, you can use:

```bash
# Generate a random 32-character string
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Testing the Setup

After setting up your environment variables:

1. **Restart your development server**
2. **Check the console** for startup messages
3. **Visit the admin panel** at `/admin` to use the startup controls
4. **Use the "Check Status" button** to verify your configuration

## Troubleshooting

### Common Issues

- **Missing POSTGRES_URL**: Ensure your database is running and accessible
- **Invalid OpenAI API Key**: Verify your API key is correct and has credits
- **NextAuth Configuration**: Make sure NEXTAUTH_URL matches your development URL

### Edge Runtime Errors

The application now separates Edge-compatible startup validation from full Node.js initialization:

- **Middleware** uses lightweight validation that works in Edge Runtime
- **Full startup** (database, migrations, encryption) runs in API routes
- **Admin panel** provides controls to trigger full initialization

## Security Notes

- **Never commit** `.env.local` to version control
- **Use strong secrets** for production environments
- **Rotate API keys** regularly
- **Limit database access** to only what's necessary
