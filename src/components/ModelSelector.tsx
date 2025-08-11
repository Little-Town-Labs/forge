'use client';

import React from 'react';
import { ChevronDown, Check, Zap } from 'lucide-react';
import { useModelConfig } from '../contexts/ModelConfigContext';

interface ModelSelectorProps {
  selectedModel: string | null;
  onModelSelect: (model: string) => void;
  className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelSelect,
  className = '',
}) => {
  const { models, isLoading, error } = useModelConfig();
  const [isOpen, setIsOpen] = React.useState(false);

  // Filter only enabled models
  const enabledModels = models.filter(model => model.isEnabled);

  const handleModelSelect = (modelId: string) => {
    onModelSelect(modelId);
    setIsOpen(false);
  };

  const getSelectedModelData = () => {
    return enabledModels.find(model => model.id === selectedModel) || null;
  };

  const getProviderBadge = (provider: string) => {
    const providerColors = {
      openai: 'bg-green-100 text-green-800',
      google: 'bg-blue-100 text-blue-800',
      anthropic: 'bg-purple-100 text-purple-800',
      custom: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${providerColors[provider as keyof typeof providerColors] || providerColors.custom}`}>
        {provider.charAt(0).toUpperCase() + provider.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className={`relative ${className}`}>
        <button
          disabled
          className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm text-gray-500 cursor-not-allowed"
        >
          <div className="flex items-center justify-between">
            <span>Loading models...</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`relative ${className}`}>
        <button
          disabled
          className="w-full px-4 py-2 text-left bg-white border border-red-300 rounded-md shadow-sm text-red-600 cursor-not-allowed"
        >
          <div className="flex items-center justify-between">
            <span>Error loading models</span>
            <ChevronDown className="w-4 h-4 text-red-400" />
          </div>
        </button>
        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
          <div className="flex items-center space-x-1">
            <span>❌</span>
            <span>Failed to load admin model configuration. Using fallback models.</span>
          </div>
          <div className="mt-1 text-red-500">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  // Fallback to hardcoded options if no admin models are configured
  // Only show fallback if we're not currently loading and have no models
  if (!isLoading && enabledModels.length === 0) {
    const fallbackModels = [
      { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
      { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google' },
    ];

    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-gray-900">
                {selectedModel ? fallbackModels.find(m => m.id === selectedModel)?.name : 'Select a model'}
              </span>
              {selectedModel && (
                <span className="text-xs text-gray-500">
                  (Fallback mode)
                </span>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
            {fallbackModels.map((model) => (
              <button
                key={model.id}
                onClick={() => handleModelSelect(model.id)}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-900">{model.name}</span>
                    {getProviderBadge(model.provider)}
                  </div>
                  {selectedModel === model.id && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
        
        {/* Fallback mode indicator */}
        <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
          <div className="flex items-center space-x-1">
            <span>⚠️</span>
            <span>Using fallback models - Admin configuration not available</span>
          </div>
        </div>
      </div>
    );
  }

  const selectedModelData = getSelectedModelData();

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {selectedModelData ? (
              <>
                <span className="text-gray-900">{selectedModelData.name}</span>
                {getProviderBadge(selectedModelData.provider)}
                {selectedModelData.isDefault && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <Zap className="w-3 h-3 mr-1" />
                    Default
                  </span>
                )}
              </>
            ) : (
              <span className="text-gray-500">Select a model</span>
            )}
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {enabledModels.map((model) => (
            <button
              key={model.id}
              onClick={() => handleModelSelect(model.id)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-900">{model.name}</span>
                  {getProviderBadge(model.provider)}
                  {model.isDefault && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Zap className="w-3 h-3 mr-1" />
                      Default
                    </span>
                  )}
                </div>
                {selectedModel === model.id && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {model.model} • {model.maxTokens} tokens • {model.temperature} temp
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
