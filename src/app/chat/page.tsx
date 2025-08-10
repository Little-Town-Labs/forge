"use client";
import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import Chat from "@/components/Chat";
import ContextPanel from "@/components/ContextPanel";
import CrawlForm from "@/components/CrawlForm";
import { useChat } from "ai/react";
import { ScoredVector } from "@/types";

const ChatPage: React.FC = () => {
  const [context, setContext] = useState<ScoredVector[] | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [showCrawlForm, setShowCrawlForm] = useState(false);
  const [gotMessages, setGotMessages] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"openai" | "google">("openai");
  const prevMessagesLengthRef = useRef(0);
  
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chat",
    body: {
      model: selectedModel,
    },
  });

  // Get context when messages change
  useEffect(() => {
    const getContext = async () => {
      if (messages.length === 0) return;
      
      setIsLoadingContext(true);
      try {
        const response = await fetch("/api/context", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setContext(data.context);
        }
      } catch (error) {
        console.error("Error fetching context:", error);
      } finally {
        setIsLoadingContext(false);
      }
    };

    if (gotMessages && messages.length >= prevMessagesLengthRef.current) {
      getContext();
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages, gotMessages]);

  // Track when we receive new messages
  useEffect(() => {
    if (messages.length > 0) {
      setGotMessages(true);
    }
  }, [messages]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header className="py-8 px-4" />
      <div className="flex-1 container mx-auto px-4 pb-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Model Selector */}
          <div className="flex justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                AI Model
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="model"
                    value="openai"
                    checked={selectedModel === "openai"}
                    onChange={(e) => setSelectedModel(e.target.value as "openai" | "google")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">OpenAI (GPT-5-nano)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="model"
                    value="google"
                    checked={selectedModel === "google"}
                    onChange={(e) => setSelectedModel(e.target.value as "openai" | "google")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Google (Gemini 2.5 Flash)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Crawl Form Toggle */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowCrawlForm(!showCrawlForm)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
            >
              {showCrawlForm ? "Hide" : "Add"} Knowledge Base
            </button>
          </div>

          {/* Crawl Form */}
          {showCrawlForm && (
            <div className="max-w-md mx-auto">
              <CrawlForm onCrawlComplete={() => setShowCrawlForm(false)} />
            </div>
          )}

          {/* Main Chat Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Context Panel */}
            <div className="lg:col-span-1">
              <ContextPanel context={context} isLoading={isLoadingContext} />
            </div>
            
            {/* Chat Interface */}
            <div className="lg:col-span-2">
              <div className="h-[600px]">
                <Chat
                  input={input}
                  handleInputChange={handleInputChange}
                  handleMessageSubmit={handleSubmit}
                  messages={messages}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;