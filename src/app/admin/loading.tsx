'use client';

import { useState, useEffect } from 'react';

export default function AdminLoading() {
  const [loadingMessage, setLoadingMessage] = useState('Loading admin dashboard');

  useEffect(() => {
    const messages = [
      'Loading admin dashboard',
      'Verifying admin permissions',
      'Preparing admin tools',
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
      aria-label="Admin dashboard loading"
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
        aria-label="Admin dashboard header loading"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div 
              className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
              aria-hidden="true"
              role="presentation"
            ></div>
            <div 
              className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32"
              aria-hidden="true"
              role="presentation"
            ></div>
            <div className="hidden sm:block">
              <div 
                className="h-4 bg-orange-200 dark:bg-orange-900/20 rounded animate-pulse w-16"
                aria-hidden="true"
                role="presentation"
              ></div>
            </div>
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Admin verification loading */}
        <div 
          className="mb-8 text-center"
          role="status"
          aria-label="Admin verification loading"
        >
          <div className="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/20 px-4 py-2 rounded-full">
            <div 
              className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"
              role="img"
              aria-label="Loading spinner"
            ></div>
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Verifying admin access...
            </span>
          </div>
        </div>

        {/* Stats cards skeleton */}
        <section 
          className="mb-8"
          role="region"
          aria-label="Admin statistics loading"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                role="presentation"
                aria-label={`Statistics card ${i} loading`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div 
                    className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
                    aria-hidden="true"
                  ></div>
                  <div 
                    className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                    aria-hidden="true"
                  ></div>
                </div>
                <div className="space-y-2">
                  <div 
                    className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"
                    aria-hidden="true"
                  ></div>
                  <div 
                    className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"
                    aria-hidden="true"
                  ></div>
                  <div 
                    className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"
                    aria-hidden="true"
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Navigation tabs skeleton */}
        <section 
          className="mb-6"
          role="navigation"
          aria-label="Admin navigation tabs loading"
        >
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8" role="tablist">
              {[1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className="pb-4 border-b-2 border-transparent"
                  role="presentation"
                  aria-label={`Navigation tab ${i} loading`}
                >
                  <div 
                    className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"
                    aria-hidden="true"
                  ></div>
                </div>
              ))}
            </nav>
          </div>
        </section>

        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main panel */}
          <main 
            className="lg:col-span-2 space-y-6"
            role="main"
            aria-label="Admin dashboard main content loading"
          >
            {/* Quick actions skeleton */}
            <section 
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              role="region"
              aria-label="Quick actions loading"
            >
              <div 
                className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32 mb-4"
                aria-hidden="true"
              ></div>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i} 
                    className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
                    aria-hidden="true"
                    role="presentation"
                  ></div>
                ))}
              </div>
            </section>

            {/* Data table skeleton */}
            <section 
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
              role="region"
              aria-label="Data table loading"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div 
                    className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-28"
                    aria-hidden="true"
                  ></div>
                  <div 
                    className="h-9 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32"
                    aria-hidden="true"
                  ></div>
                </div>
              </div>
              <div 
                className="overflow-hidden"
                role="table"
                aria-label="Admin data table loading"
              >
                {/* Table header */}
                <div 
                  className="bg-gray-50 dark:bg-gray-750 px-6 py-3 border-b border-gray-200 dark:border-gray-700"
                  role="rowgroup"
                  aria-label="Table header loading"
                >
                  <div className="grid grid-cols-4 gap-4" role="row">
                    {[1, 2, 3, 4].map((i) => (
                      <div 
                        key={i} 
                        className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                        aria-hidden="true"
                        role="columnheader"
                      ></div>
                    ))}
                  </div>
                </div>
                {/* Table rows */}
                <div role="rowgroup" aria-label="Table data loading">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div 
                      key={i} 
                      className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                      role="row"
                      aria-label={`Table row ${i} loading`}
                    >
                      <div className="grid grid-cols-4 gap-4">
                        <div 
                          className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                          aria-hidden="true"
                          role="cell"
                        ></div>
                        <div 
                          className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"
                          aria-hidden="true"
                          role="cell"
                        ></div>
                        <div 
                          className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"
                          aria-hidden="true"
                          role="cell"
                        ></div>
                        <div 
                          className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"
                          aria-hidden="true"
                          role="cell"
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>

          {/* Sidebar */}
          <aside 
            className="space-y-6"
            role="complementary"
            aria-label="Admin dashboard sidebar loading"
          >
            {/* System status skeleton */}
            <section 
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              role="region"
              aria-label="System status loading"
            >
              <div 
                className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-28 mb-4"
                aria-hidden="true"
              ></div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between"
                    role="presentation"
                    aria-label={`System status item ${i} loading`}
                  >
                    <div 
                      className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"
                      aria-hidden="true"
                    ></div>
                    <div 
                      className="w-3 h-3 bg-green-200 dark:bg-green-900/20 rounded-full animate-pulse"
                      aria-hidden="true"
                    ></div>
                  </div>
                ))}
              </div>
            </section>

            {/* Recent activity skeleton */}
            <section 
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              role="region"
              aria-label="Recent activity loading"
            >
              <div 
                className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32 mb-4"
                aria-hidden="true"
              ></div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className="flex items-start space-x-3"
                    role="presentation"
                    aria-label={`Activity item ${i} loading`}
                  >
                    <div 
                      className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse flex-shrink-0"
                      aria-hidden="true"
                    ></div>
                    <div className="flex-1 space-y-1">
                      <div 
                        className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full"
                        aria-hidden="true"
                      ></div>
                      <div 
                        className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"
                        aria-hidden="true"
                      ></div>
                      <div 
                        className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"
                        aria-hidden="true"
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {/* Loading overlay */}
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
              className="absolute inset-0 border-2 border-transparent border-t-orange-600 rounded-full animate-spin"
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