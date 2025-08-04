import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  compress: true,
  
  // Image optimization
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // Environment validation
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_INDEX: process.env.PINECONE_INDEX,
  },
  
  // Experimental features for better performance
  experimental: {
    // optimizeCss: true, // Disabled temporarily due to lightningcss WSL compatibility issue
    optimizePackageImports: ['lucide-react', '@clerk/nextjs'],
  },
  
  // Turbopack configuration (moved from experimental)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // Production optimizations
  poweredByHeader: false,
  reactStrictMode: true,
  
  // ESLint configuration for deployment
  eslint: {
    // Allow production builds to successfully complete even if ESLint has warnings
    ignoreDuringBuilds: false,
  },
  
  // TypeScript configuration
  typescript: {
    // Allow production builds to successfully complete even if TypeScript has errors
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
