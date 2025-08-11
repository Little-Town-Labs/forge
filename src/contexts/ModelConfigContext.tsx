'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'google' | 'anthropic' | 'custom';
  model: string;
  apiKey: string;
  baseUrl?: string;
  isDefault: boolean;
  isEnabled: boolean;
  maxTokens: number;
  temperature: number;
  createdAt: string;
  updatedAt: string;
}

interface ModelConfigContextType {
  models: AIModel[];
  selectedModel: AIModel | null;
  setSelectedModel: (model: AIModel | null) => void;
  defaultModel: AIModel | null;
  isLoading: boolean;
  error: string | null;
  refreshModels: () => Promise<void>;
  updateModelConfig: (model: AIModel) => Promise<void>;
}

const ModelConfigContext = createContext<ModelConfigContextType | undefined>(undefined);

export const useModelConfig = () => {
  const context = useContext(ModelConfigContext);
  if (context === undefined) {
    throw new Error('useModelConfig must be used within a ModelConfigProvider');
  }
  return context;
};

interface ModelConfigProviderProps {
  children: ReactNode;
}

export const ModelConfigProvider: React.FC<ModelConfigProviderProps> = ({ children }) => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const defaultModel = models.find(model => model.isDefault && model.isEnabled) || null;

  const fetchModels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/config/models');
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      
      const data = await response.json();
      const fetchedModels = data.success ? (data.data.models || []) : [];
      
      setModels(fetchedModels);
      
      // Auto-select default model if no model is currently selected
      // Only do this if we don't already have a selected model to prevent infinite loops
      if (!selectedModel && fetchedModels.length > 0) {
        const defaultModel = fetchedModels.find((model: AIModel) => model.isDefault && model.isEnabled);
        if (defaultModel) {
          setSelectedModel(defaultModel);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
      console.error('Error fetching models:', err);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally exclude selectedModel to prevent infinite loops

  const refreshModels = useCallback(async () => {
    await fetchModels();
  }, [fetchModels]);

  const updateModelConfig = async (model: AIModel) => {
    try {
      const response = await fetch('/api/admin/config/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(model),
      });

      if (!response.ok) {
        throw new Error('Failed to update model configuration');
      }

      // Refresh models to get updated data
      await refreshModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update model configuration');
      console.error('Error updating model configuration:', err);
      throw err;
    }
  };

  // Listen for model configuration changes from admin panel
  useEffect(() => {
    const handleModelConfigChange = () => {
      // Refresh models when admin changes are made
      refreshModels();
    };

    // Add event listener for admin panel changes
    window.addEventListener('modelConfigChanged', handleModelConfigChange);

    return () => {
      window.removeEventListener('modelConfigChanged', handleModelConfigChange);
    };
  }, [refreshModels]);

  // Fetch models on mount
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Handle model selection changes separately to prevent infinite loops
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      const defaultModel = models.find((model: AIModel) => model.isDefault && model.isEnabled);
      if (defaultModel) {
        setSelectedModel(defaultModel);
      }
    }
  }, [models, selectedModel]);

  const value: ModelConfigContextType = {
    models,
    selectedModel,
    setSelectedModel,
    defaultModel,
    isLoading,
    error,
    refreshModels,
    updateModelConfig,
  };

  return (
    <ModelConfigContext.Provider value={value}>
      {children}
    </ModelConfigContext.Provider>
  );
};
