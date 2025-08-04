"use client";

import { ClerkProvider as BaseClerkProvider } from "@clerk/nextjs";
import { ReactNode, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { trackAuthError } from "@/utils/errorTracking";

interface ClerkProviderProps {
  children: ReactNode;
}

function ClerkErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  const isNetworkError = error.message.includes('fetch') || 
                        error.message.includes('network') ||
                        error.message.includes('Failed to load');

  const isConfigError = error.message.includes('publishable') ||
                       error.message.includes('CLERK_') ||
                       error.message.includes('environment');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {isConfigError ? 'Configuration Error' : isNetworkError ? 'Connection Error' : 'Authentication Error'}
        </h1>

        <div className="text-gray-600 dark:text-gray-300 mb-8">
          {isConfigError ? (
            <div>
              <p className="mb-2">Authentication service is not properly configured.</p>
              <p className="text-sm">Please check your environment variables and try again.</p>
            </div>
          ) : isNetworkError ? (
            <div>
              <p className="mb-2">Unable to connect to authentication services.</p>
              <p className="text-sm">Please check your internet connection and try again.</p>
            </div>
          ) : (
            <div>
              <p className="mb-2">There was a problem initializing the authentication system.</p>
              <p className="text-sm">This is usually temporary. Please try again.</p>
            </div>
          )}

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-left text-xs">
              <summary className="cursor-pointer font-mono">Error Details (Dev)</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all">{error.message}</pre>
            </details>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={resetErrorBoundary}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200"
          >
            Refresh Page
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need help?{' '}
            <a href="mailto:support@forge.com" className="text-blue-600 dark:text-blue-400 hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function ClerkLoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="relative mx-auto w-16 h-16 mb-6">
          <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Initializing Authentication
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Setting up secure access to your account...
        </p>
      </div>
    </div>
  );
}

export default function ClerkProvider({ children }: ClerkProviderProps) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  // Enhanced environment validation with more detailed error messages
  if (!publishableKey) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorMessage = isDevelopment
      ? "Missing Clerk Publishable Key. Please add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env.local file in the forge/ directory."
      : "Authentication service configuration error. Please contact support.";
    
    throw new Error(errorMessage);
  }

  if (publishableKey.startsWith('pk_test_') && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  Using Clerk test keys in production. Please update to production keys.');
  }

  return (
    <ErrorBoundary
      FallbackComponent={ClerkErrorFallback}
      onError={(error, errorInfo) => {
        // Use centralized authentication error tracking
        trackAuthError(error, {
          publishableKeyType: publishableKey?.startsWith('pk_test_') ? 'test' : 
                             publishableKey?.startsWith('pk_live_') ? 'live' : 'unknown',
          boundary: 'clerk-provider',
        }, errorInfo);
      }}
      onReset={() => {
        // Clear any cached auth state that might be causing issues
        window.location.reload();
      }}
    >
      <Suspense fallback={<ClerkLoadingFallback />}>
        <BaseClerkProvider 
          publishableKey={publishableKey}
          afterSignOutUrl="/"
          appearance={{
            baseTheme: undefined, // Will use system theme
            variables: {
              colorPrimary: '#2563eb', // Blue-600
            },
          }}
        >
          {children}
        </BaseClerkProvider>
      </Suspense>
    </ErrorBoundary>
  );
}