'use client';

import { useState, useEffect } from 'react';

export default function ChatLoading() {
  const [loadingMessage, setLoadingMessage] = useState('Loading chat interface');

  useEffect(() => {
    const messages = [
      'Loading chat interface',
      'Preparing AI assistant',
      'Setting up your workspace',
      'Almost ready'
    ];

    let messageIndex = 0;
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setLoadingMessage(messages[messageIndex]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
      role="main"
      aria-label="Chat interface loading"
    >
      {/* Screen reader announcement */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        role="status"
      >
        {loadingMessage}
      </div>

      {/* Header skeleton */}
      <header 
        className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4"
        role="banner"
        aria-label="Chat header loading"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div 
              className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
              aria-hidden="true"
              role="presentation"
            ></div>
            <div 
              className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"
              aria-hidden="true"
              role="presentation"
            ></div>
          </div>
          <div className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"
              aria-hidden="true"
              role="presentation"
            ></div>
            <div 
              className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"
              aria-hidden="true"
              role="presentation"
            ></div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex h-[calc(100vh-80px)]">
        {/* Main chat area */}
        <main 
          className="flex-1 flex flex-col"
          role="main"
          aria-label="Chat messages area loading"
        >
          {/* Chat messages area */}
          <div 
            className="flex-1 p-4 space-y-4 overflow-hidden"
            role="log"
            aria-label="Chat conversation loading"
            aria-live="polite"
          >
            {/* Welcome message skeleton */}
            <div 
              className="max-w-2xl"
              role="presentation"
              aria-label="Welcome message loading"
            >
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-start space-x-3">
                  <div 
                    className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex-shrink-0 animate-pulse"
                    aria-hidden="true"
                  ></div>
                  <div className="flex-1 space-y-3">
                    <div 
                      className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"
                      aria-hidden="true"
                    ></div>
                    <div 
                      className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full"
                      aria-hidden="true"
                    ></div>
                    <div 
                      className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3"
                      aria-hidden="true"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sample message skeletons */}
            {[1, 2].map((i) => (
              <div 
                key={i} 
                className="max-w-2xl"
                role="presentation"
                aria-label={`Message ${i} loading`}
              >
                <div className="bg-gray-100 dark:bg-gray-750 rounded-lg p-4 space-y-2">
                  <div 
                    className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full"
                    aria-hidden="true"
                  ></div>
                  <div 
                    className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-4/5"
                    aria-hidden="true"
                  ></div>
                  <div 
                    className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/5"
                    aria-hidden="true"
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* Chat input skeleton */}
          <div 
            className="border-t border-gray-200 dark:border-gray-700 p-4"
            role="complementary"
            aria-label="Message input area loading"
          >
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <div 
                  className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
                  aria-hidden="true"
                  role="presentation"
                ></div>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div 
                    className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"
                    aria-hidden="true"
                  ></div>
                </div>
              </div>
              <div 
                className="flex items-center justify-center mt-2 space-x-4"
                role="presentation"
                aria-hidden="true"
              >
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
                <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
                <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"></div>
              </div>
            </div>
          </div>
        </main>

        {/* Context panel skeleton */}
        <aside 
          className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hidden lg:block"
          role="complementary"
          aria-label="Context panel loading"
        >
          <div className="p-4 space-y-4">
            {/* Panel header */}
            <div 
              className="pb-4 border-b border-gray-200 dark:border-gray-700"
              role="presentation"
              aria-label="Panel header loading"
            >
              <div 
                className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32 mb-2"
                aria-hidden="true"
              ></div>
              <div 
                className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full"
                aria-hidden="true"
              ></div>
            </div>

            {/* Crawl form skeleton */}
            <div 
              className="space-y-3"
              role="presentation"
              aria-label="URL crawler form loading"
            >
              <div 
                className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"
                aria-hidden="true"
              ></div>
              <div 
                className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                aria-hidden="true"
              ></div>
              <div 
                className="h-9 bg-blue-200 dark:bg-blue-900/20 rounded animate-pulse"
                aria-hidden="true"
              ></div>
            </div>

            {/* Context sources skeleton */}
            <div 
              className="space-y-3"
              role="presentation"
              aria-label="Context sources loading"
            >
              <div 
                className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-28"
                aria-hidden="true"
              ></div>
              {[1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className="bg-gray-50 dark:bg-gray-750 rounded-lg p-3 space-y-2"
                  role="presentation"
                  aria-label={`Context source ${i} loading`}
                >
                  <div className="flex items-center justify-between">
                    <div 
                      className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"
                      aria-hidden="true"
                    ></div>
                    <div 
                      className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-12"
                      aria-hidden="true"
                    ></div>
                  </div>
                  <div 
                    className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full"
                    aria-hidden="true"
                  ></div>
                  <div 
                    className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"
                    aria-hidden="true"
                  ></div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Loading overlay with chat-specific messaging */}
      <div 
        className="fixed inset-0 bg-black/5 dark:bg-black/20 flex items-center justify-center pointer-events-none"
        role="presentation"
        aria-hidden="true"
      >
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg px-6 py-4 flex items-center space-x-3"
          role="status"
          aria-live="polite"
        >
          <div 
            className="relative w-6 h-6"
            role="img"
            aria-label="Loading spinner"
          >
            <div 
              className="absolute inset-0 border-2 border-gray-200 dark:border-gray-700 rounded-full"
              aria-hidden="true"
            ></div>
            <div 
              className="absolute inset-0 border-2 border-transparent border-t-blue-600 rounded-full animate-spin"
              aria-hidden="true"
            ></div>
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {loadingMessage}
          </div>
        </div>
      </div>
    </div>
  );
}