"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/Header";
import Chat from "@/components/Chat";
import ContextPanel from "@/components/ContextPanel";
import CrawlForm from "@/components/CrawlForm";
import { AdminPanel } from "@/components/admin-panel/AdminPanel";
import { ModelSelector } from "@/components/ModelSelector";
import { ModelConfigProvider, useModelConfig } from "@/contexts/ModelConfigContext";
import { useAdminPanel } from "@/hooks/useAdminPanel";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useChat } from "ai/react";
import { ScoredVector } from "@/types";

const ChatPageContent: React.FC = () => {
  const [context, setContext] = useState<ScoredVector[] | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [showCrawlForm, setShowCrawlForm] = useState(false);
  const [gotMessages, setGotMessages] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const prevMessagesLengthRef = useRef(0);
  
  const { isAdmin } = useAdminStatus();
  const { isOpen: isAdminPanelOpen, openPanel } = useAdminPanel();
  const { defaultModel, refreshModels } = useModelConfig();
  
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chat",
    body: {
      model: selectedModel || defaultModel?.id || 'gpt-4',
    },
  });

  const getContext = useCallback(async () => {
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
  }, [messages]);

  // Get context when messages change
  useEffect(() => {
    if (gotMessages && messages.length >= prevMessagesLengthRef.current) {
      getContext();
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages, gotMessages, getContext]);

  // Track when we receive new messages
  useEffect(() => {
    if (messages.length > 0) {
      setGotMessages(true);
    }
  }, [messages]);

  // Set default model when models are loaded
  useEffect(() => {
    if (defaultModel && !selectedModel) {
      setSelectedModel(defaultModel.id);
    }
  }, [defaultModel, selectedModel]);

  // Handle model configuration changes from admin panel
  const handleModelConfigChange = async () => {
    try {
      // Refresh models and context when admin changes are made
      await refreshModels();
      if (gotMessages && messages.length > 0) {
        await getContext();
      }
    } catch (error) {
      console.error('Failed to handle model configuration change:', error);
      // Could add user notification here in the future
    }
  };

  // Handle knowledge base changes from admin panel
  const handleCrawlComplete = async () => {
    try {
      // Refresh context when knowledge base changes
      if (gotMessages && messages.length > 0) {
        await getContext();
      }
    } catch (error) {
      console.error('Failed to handle crawl completion:', error);
      // Could add user notification here in the future
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header 
        className="py-8 px-4" 
        onAdminToggle={openPanel}
        isAdminPanelOpen={isAdminPanelOpen}
        currentPage="chat"
      />
      <div className="flex-1 container mx-auto px-4 pb-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Model Selector */}
          <div className="flex justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                AI Model
              </label>
              <ModelSelector
                selectedModel={selectedModel}
                onModelSelect={setSelectedModel}
                className="w-64"
              />
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
          <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
            {/* Context Panel */}
            <div className="lg:col-span-1">
              <ContextPanel context={context} isLoading={isLoadingContext} />
            </div>
            
            {/* Chat Interface */}
            <div className="lg:col-span-1">
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

          {/* Admin Panel - Rendered outside grid since it uses fixed positioning */}
          {isAdmin && isAdminPanelOpen && (
            <AdminPanel 
              isOpen={isAdminPanelOpen} 
              onModelConfigChange={handleModelConfigChange}
              onCrawlComplete={handleCrawlComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const ChatPage: React.FC = () => {
  return (
    <ModelConfigProvider>
      <ChatPageContent />
    </ModelConfigProvider>
  );
};

export default ChatPage;