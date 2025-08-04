'use client';

import { useState, useEffect } from 'react';

export default function Loading() {
  const [loadingPhase, setLoadingPhase] = useState('initializing');
  const [announceMessage, setAnnounceMessage] = useState('Loading application');

  useEffect(() => {
    // Simulate loading phases for better accessibility feedback
    const phases = [
      { phase: 'initializing', message: 'Initializing application', duration: 1000 },
      { phase: 'authenticating', message: 'Setting up authentication', duration: 1500 },
      { phase: 'preparing', message: 'Preparing your workspace', duration: 2000 },
    ];

    let currentPhaseIndex = 0;
    
    const updatePhase = () => {
      if (currentPhaseIndex < phases.length) {
        const currentPhase = phases[currentPhaseIndex];
        setLoadingPhase(currentPhase.phase);
        setAnnounceMessage(currentPhase.message);
        
        setTimeout(() => {
          currentPhaseIndex++;
          updatePhase();
        }, currentPhase.duration);
      }
    };

    updatePhase();
  }, []);

  return (
    <div 
      className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4"
      role="main"
      aria-label="Application loading screen"
    >
      {/* Screen reader announcement */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        role="status"
      >
        {announceMessage}
      </div>

      <div className="max-w-md w-full">
        {/* Main Loading Animation */}
        <div className="text-center mb-8">
          <div 
            className="relative mx-auto w-16 h-16 mb-6"
            role="img"
            aria-label="Loading animation"
          >
            {/* Spinning circle */}
            <div 
              className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full"
              aria-hidden="true"
            ></div>
            <div 
              className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"
              aria-hidden="true"
            ></div>
            
            {/* Inner pulse */}
            <div 
              className="absolute inset-2 bg-blue-600 rounded-full animate-pulse opacity-20"
              aria-hidden="true"
            ></div>
          </div>

          {/* App Logo/Title */}
          <h1 
            className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
            id="loading-title"
          >
            Forge
          </h1>
          <p 
            className="text-gray-600 dark:text-gray-400 mb-8"
            id="loading-description"
            aria-describedby="loading-title"
          >
            Loading your AI-powered knowledge base...
          </p>
        </div>

        {/* Progress Skeleton */}
        <div 
          className="space-y-4"
          role="presentation"
          aria-label="Loading content preview"
        >
          {/* Authentication skeleton */}
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm"
            role="presentation"
            aria-label="Authentication section loading"
          >
            <div className="flex items-center space-x-3">
              <div 
                className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"
                aria-hidden="true"
              ></div>
              <div className="flex-1">
                <div 
                  className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"
                  aria-hidden="true"
                ></div>
                <div 
                  className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3"
                  aria-hidden="true"
                ></div>
              </div>
            </div>
          </div>

          {/* Content skeleton */}
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm"
            role="presentation"
            aria-label="Main content loading"
          >
            <div className="space-y-3">
              <div 
                className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                aria-hidden="true"
              ></div>
              <div 
                className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-5/6"
                aria-hidden="true"
              ></div>
              <div 
                className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-4/5"
                aria-hidden="true"
              ></div>
            </div>
          </div>

          {/* Navigation skeleton */}
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm"
            role="presentation"
            aria-label="Navigation loading"
          >
            <div className="flex space-x-4">
              <div 
                className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-1"
                aria-hidden="true"
              ></div>
              <div 
                className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-1"
                aria-hidden="true"
              ></div>
              <div 
                className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-1"
                aria-hidden="true"
              ></div>
            </div>
          </div>
        </div>

        {/* Loading Steps */}
        <div className="mt-8">
          <div 
            className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400"
            role="progressbar"
            aria-label="Loading progress"
            aria-valuenow={loadingPhase === 'initializing' ? 1 : loadingPhase === 'authenticating' ? 2 : 3}
            aria-valuemin={1}
            aria-valuemax={3}
            aria-valuetext={`${announceMessage} - Step ${loadingPhase === 'initializing' ? 1 : loadingPhase === 'authenticating' ? 2 : 3} of 3`}
          >
            <LoadingStep active={loadingPhase === 'initializing'}>Initializing</LoadingStep>
            <LoadingDot />
            <LoadingStep active={loadingPhase === 'authenticating'}>Authenticating</LoadingStep>
            <LoadingDot />
            <LoadingStep active={loadingPhase === 'preparing'}>Preparing</LoadingStep>
          </div>
        </div>

        {/* Timeout message after 10 seconds */}
        <div className="mt-8 text-center">
          <TimeoutMessage />
        </div>
      </div>
    </div>
  );
}

function LoadingStep({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span 
      className={`${active ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}
      aria-current={active ? 'step' : undefined}
    >
      {children}
    </span>
  );
}

function LoadingDot() {
  return (
    <span 
      className="w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse"
      aria-hidden="true"
    ></span>
  );
}

function TimeoutMessage() {
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTimeout(true);
    }, 10000); // Show timeout message after 10 seconds

    return () => clearTimeout(timer);
  }, []);

  if (!showTimeout) return null;

  return (
    <div 
      className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
      role="alert"
      aria-live="assertive"
    >
      <p 
        className="text-sm text-yellow-800 dark:text-yellow-200 mb-2"
        id="timeout-message"
      >
        This is taking longer than expected...
      </p>
      <button
        onClick={() => window.location.reload()}
        className="text-sm text-yellow-600 dark:text-yellow-400 hover:underline focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 rounded"
        aria-describedby="timeout-message"
        type="button"
      >
        Try refreshing the page
      </button>
    </div>
  );
}