"use client";

import React from "react";
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import LandingPage from "@/components/LandingPage";
import { MessageSquare, ArrowRight } from "lucide-react";

const HomePage: React.FC = () => {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const handleGoToChat = () => {
    router.push("/chat");
  };

  // Show loading state while authentication is being determined
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <Header className="py-8 px-4" />
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center px-4">
            {/* Animated Logo/Icon */}
            <div className="mb-8">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-800"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin"></div>
                <div className="absolute inset-2 rounded-full bg-blue-50 dark:bg-blue-900 flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            {/* Loading Text */}
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Initializing Forge
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Setting up your AI conversation experience...
              </p>
              
              {/* Loading Progress Indicator */}
              <div className="mt-6">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>

              {/* Loading Steps */}
              <div className="mt-6 space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span>Authenticating session</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  <span>Loading knowledge base</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  <span>Preparing chat interface</span>
                </div>
              </div>
            </div>

            {/* Subtle Animation */}
            <div className="mt-8 flex justify-center space-x-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header className="py-8 px-4" />
      
      <SignedOut>
        <LandingPage />
      </SignedOut>
      
      <SignedIn>
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-2xl mx-auto text-center px-4">
            <div className="mb-8">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Welcome back{user?.firstName && `, ${user.firstName}`}!
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                Ready to continue your AI-powered conversations? Your knowledge base and chat history are waiting.
              </p>
            </div>
            
            <button
              onClick={handleGoToChat}
              className="inline-flex items-center px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Open Chat Interface
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
            
            <div className="mt-8 grid md:grid-cols-3 gap-6 text-center">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Smart Conversations</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">AI responses with your knowledge base context</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Knowledge Management</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Add websites to your personal knowledge base</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Context Insights</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">See relevant sources and relevance scores</p>
              </div>
            </div>
          </div>
        </div>
      </SignedIn>
    </div>
  );
};

export default HomePage;
