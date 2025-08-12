'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { isAdmin } from '@/utils/admin';
import { AIModel, getPublicModels, getAllAvailableModels } from '@/utils/models';

interface ModelConfigContextType {
  models: AIModel[];
  selectedModel: AIModel | null;
  setSelectedModel: (model: AIModel | null) => void;
  defaultModel: AIModel | null;
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
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
  const { user } = useUser();
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  const defaultModel = models.find(model => model.id === 'gpt-4o-mini') || models[0] || null;

  const fetchModels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let fetchedModels: AIModel[] = [];
      
      if (userIsAdmin) {
        // Admin users can try to fetch from admin endpoint first
        try {
          const response = await fetch('/api/admin/config/models');
          if (response.ok) {
            const data = await response.json();
            fetchedModels = data.success ? (data.data.models || []) : [];
          }
        } catch {
          console.log('Admin endpoint not available, falling back to public models');
        }
      }
      
      // If no admin models or user is not admin, fetch public models
      if (fetchedModels.length === 0 && user?.id) {
        try {
          const allModels = await getAllAvailableModels(user.id);
          fetchedModels = allModels;
        } catch {
          console.log('Failed to fetch user models, using fallback models');
          // Use fallback models from utils
          fetchedModels = await getPublicModels();
        }
      }
      
      // If still no models, use fallback models
      if (fetchedModels.length === 0) {
        fetchedModels = await getPublicModels();
      }
      
      setModels(fetchedModels);
      
      // Auto-select default model if no model is currently selected
      if (!selectedModel && fetchedModels.length > 0) {
        const defaultModel = fetchedModels.find((model: AIModel) => 
          model.id === 'gpt-4o-mini' || model.isDefault
        ) || fetchedModels[0];
        if (defaultModel) {
          setSelectedModel(defaultModel);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch models';
      setError(errorMessage);
      console.error('Error fetching models:', err);
      
      // Even on error, try to provide fallback models
      try {
        const fallbackModels = await getPublicModels();
        setModels(fallbackModels);
        if (fallbackModels.length > 0 && !selectedModel) {
          setSelectedModel(fallbackModels[0]);
        }
      } catch (fallbackErr) {
        console.error('Failed to load fallback models:', fallbackErr);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, userIsAdmin, selectedModel]);

  const refreshModels = useCallback(async () => {
    await fetchModels();
  }, [fetchModels]);

  const updateModelConfig = async (model: AIModel) => {
    if (!userIsAdmin) {
      throw new Error('Only administrators can update model configurations');
    }
    
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to update model configuration';
      setError(errorMessage);
      console.error('Error updating model configuration:', err);
      throw err;
    }
  };

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user?.id) {
        const adminStatus = await isAdmin(user.id);
        setUserIsAdmin(adminStatus);
      }
    };
    
    checkAdminStatus();
  }, [user?.id]);

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

  // Fetch models on mount and when admin status changes
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Handle model selection changes separately to prevent infinite loops
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      const defaultModel = models.find((model: AIModel) => 
        model.id === 'gpt-4o-mini' || model.isDefault
      ) || models[0];
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
    isAdmin: userIsAdmin,
    refreshModels,
    updateModelConfig,
  };

  return (
    <ModelConfigContext.Provider value={value}>
      {children}
    </ModelConfigContext.Provider>
  );
};
