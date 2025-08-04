'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useClerk } from '@clerk/nextjs';
import { trackError } from '@/utils/errorTracking';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();

  useEffect(() => {
    // Detect error types
    const isClerkError = error.message.includes('Clerk') || 
                        error.message.includes('authentication') ||
                        error.message.includes('CLERK_');
                        
    const isNetworkError = error.message.includes('fetch') ||
                          error.message.includes('network') ||
                          error.message.includes('timeout');

    // Use centralized error tracking
    trackError(error, {
      digest: error.digest,
      errorType: isClerkError ? 'authentication' : 
                 isNetworkError ? 'network' : 
                 'application',
      severity: isClerkError || isNetworkError ? 'high' : 'medium',
      user: {
        isSignedIn,
        hasAuth: !!isSignedIn,
      },
      tags: {
        boundary: 'global',
        component: 'error-boundary',
        recoverable: true,
      }
    });
  }, [error, isSignedIn]);

  // Detect Clerk-specific errors
  const isClerkError = error.message.includes('Clerk') || 
                      error.message.includes('authentication') ||
                      error.message.includes('CLERK_');

  const isNetworkError = error.message.includes('fetch') ||
                        error.message.includes('network') ||
                        error.message.includes('timeout');

  const handleGoHome = () => {
    router.push('/');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (signOutError) {
      console.error('Error during sign out:', signOutError);
      // Force navigation even if sign out fails
      router.push('/');
    }
  };

  const handleRetry = () => {
    reset();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        {/* Error Icon */}
        <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-8 h-8 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {isClerkError ? 'Authentication Error' : 
           isNetworkError ? 'Connection Error' : 
           'Something went wrong'}
        </h1>

        {/* Error Description */}
        <div className="text-gray-600 dark:text-gray-300 mb-8">
          {isClerkError ? (
            <div>
              <p className="mb-2">
                We&apos;re having trouble with the authentication system. This might be temporary.
              </p>
              <p className="text-sm">
                Try signing out and back in, or contact support if this persists.
              </p>
            </div>
          ) : isNetworkError ? (
            <div>
              <p className="mb-2">
                Unable to connect to our servers. Please check your internet connection.
              </p>
              <p className="text-sm">
                If you&apos;re connected, our servers might be temporarily unavailable.
              </p>
            </div>
          ) : (
            <div>
              <p className="mb-2">
                An unexpected error occurred. Our team has been notified.
              </p>
              <p className="text-sm">
                Please try again, or contact support if this continues.
              </p>
            </div>
          )}

          {/* Show error details in development */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-left text-xs">
              <summary className="cursor-pointer font-mono">Error Details (Dev)</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all">
                {error.message}
                {error.digest && `\nDigest: ${error.digest}`}
              </pre>
            </details>
          )}
        </div>

        {/* Recovery Actions */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Try Again
            </button>
            <button
              onClick={handleGoHome}
              className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Go Home
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleRefresh}
              className="flex-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium py-2 px-4 transition-colors duration-200"
            >
              Refresh Page
            </button>
            {isSignedIn && (
              <button
                onClick={handleSignOut}
                className="flex-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium py-2 px-4 transition-colors duration-200"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>

        {/* Support Link */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need help?{' '}
            <a
              href="mailto:support@forge.com"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}