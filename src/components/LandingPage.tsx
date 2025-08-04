"use client";

import React, { useState, useEffect } from "react";
import { SignInButton } from "@clerk/nextjs";
import { MessageSquare, Brain, Database, Zap, AlertCircle } from "lucide-react";

// Error Boundary Component for Clerk components
const ClerkErrorBoundary: React.FC<{ 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = () => setHasError(true);
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return fallback || (
      <button 
        onClick={() => window.location.href = '/sign-in'}
        className="px-8 py-4 bg-gray-600 text-white text-lg font-semibold rounded-xl hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-500 focus:ring-opacity-50 transition-all duration-200 shadow-lg"
      >
        Sign In (Fallback)
      </button>
    );
  }

  return <>{children}</>;
};

// Safe SignIn Button wrapper
const SafeSignInButton: React.FC<{ 
  children: React.ReactNode;
  className?: string;
  mode?: "modal" | "redirect";
}> = ({ children, className, mode = "modal" }) => {
  const [isClerkLoaded, setIsClerkLoaded] = useState(false);
  const [hasClerkError, setHasClerkError] = useState(false);

  useEffect(() => {
    // Check if Clerk is properly loaded
    const checkClerk = () => {
      try {
        if (window.Clerk || document.querySelector('[data-clerk-publishable-key]')) {
          setIsClerkLoaded(true);
        } else {
          // Fallback after timeout
          setTimeout(() => {
            if (!window.Clerk) {
              setHasClerkError(true);
            }
          }, 3000);
        }
      } catch (error) {
        console.warn('Clerk loading check failed:', error);
        setHasClerkError(true);
      }
    };

    checkClerk();
    const interval = setInterval(checkClerk, 1000);
    return () => clearInterval(interval);
  }, []);

  if (hasClerkError) {
    return (
      <div className="text-center">
        <button 
          onClick={() => window.location.href = '/sign-in'}
          className={className || "px-8 py-4 bg-gray-600 text-white text-lg font-semibold rounded-xl hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-500 focus:ring-opacity-50 transition-all duration-200 shadow-lg"}
        >
          {children}
        </button>
        <p className="text-xs text-gray-500 mt-2 flex items-center justify-center">
          <AlertCircle className="w-3 h-3 mr-1" />
          Fallback mode active
        </p>
      </div>
    );
  }

  if (!isClerkLoaded) {
    return (
      <button 
        disabled
        className={`${className || "px-8 py-4 bg-gray-400 text-white text-lg font-semibold rounded-xl"} opacity-50 cursor-not-allowed`}
      >
        Loading...
      </button>
    );
  }

  return (
    <ClerkErrorBoundary>
      <SignInButton mode={mode}>
        <button className={className}>
          {children}
        </button>
      </SignInButton>
    </ClerkErrorBoundary>
  );
};

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Supercharge Your AI Conversations
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              Transform any website into searchable knowledge with Forge - your intelligent AI companion 
              powered by OpenAI and vector search technology.
            </p>
            <div className="mb-8">
              <SafeSignInButton 
                mode="modal"
                className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Get Started Free
              </SafeSignInButton>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No credit card required • Setup in minutes
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Intelligent Chat
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                AI-powered conversations with context-aware responses using GPT-4o-mini
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Database className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Knowledge Base
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Crawl and index any website to create your personalized knowledge repository
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Smart Context
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Semantic search finds the most relevant information for every conversation
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Zap className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Lightning Fast
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Powered by Pinecone vector database for instant knowledge retrieval
              </p>
            </div>
          </div>

          {/* Value Proposition */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8 text-left">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mb-4 text-xl font-bold">
                  1
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Add Content
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Paste any website URL to crawl and index its content into your knowledge base
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mb-4 text-xl font-bold">
                  2
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Ask Questions
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Start conversations and get AI responses enriched with your indexed knowledge
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mb-4 text-xl font-bold">
                  3
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Get Insights
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Receive contextual answers with source references and relevance scores
                </p>
              </div>
            </div>
          </div>

          {/* Technology Stack */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Powered by Industry-Leading Technology
            </h3>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full">OpenAI GPT-4o-mini</span>
              <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full">Pinecone Vector DB</span>
              <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full">Next.js 15</span>
              <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full">LangChain</span>
              <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full">Vercel AI SDK</span>
            </div>
          </div>

          {/* Final CTA */}
          <div className="mt-16">
            <SafeSignInButton 
              mode="modal"
              className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-500 focus:ring-opacity-50 transition-all duration-200"
            >
              Start Building Your Knowledge Base
            </SafeSignInButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;