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
      
      console.log('[ModelConfig] Fetching models, userIsAdmin:', userIsAdmin, 'userId:', user?.id);
      
      let fetchedModels: AIModel[] = [];
      
      // For non-admin users, go directly to public models
      if (!userIsAdmin) {
        console.log('[ModelConfig] Non-admin user, fetching public models');
        try {
          if (user?.id) {
            const allModels = await getAllAvailableModels(user.id);
            fetchedModels = allModels;
            console.log('[ModelConfig] Got user models:', allModels.length);
          } else {
            fetchedModels = await getPublicModels();
            console.log('[ModelConfig] Got public models:', fetchedModels.length);
          }
        } catch (err) {
          console.log('[ModelConfig] Failed to fetch user models, using fallback models:', err);
          fetchedModels = await getPublicModels();
        }
      } else {
        console.log('[ModelConfig] Admin user, trying admin endpoint first');
        // Admin users can try to fetch from admin endpoint first
        try {
          const response = await fetch('/api/admin/config/models');
          if (response.ok) {
            const data = await response.json();
            fetchedModels = data.success ? (data.data.models || []) : [];
            console.log('[ModelConfig] Got admin models:', fetchedModels.length);
          }
        } catch (err) {
          console.log('[ModelConfig] Admin endpoint not available, falling back to public models:', err);
        }
        
        // If no admin models, fetch public models
        if (fetchedModels.length === 0) {
          try {
            if (user?.id) {
              const allModels = await getAllAvailableModels(user.id);
              fetchedModels = allModels;
              console.log('[ModelConfig] Got public models for admin:', fetchedModels.length);
            } else {
              fetchedModels = await getPublicModels();
              console.log('[ModelConfig] Got fallback models for admin:', fetchedModels.length);
            }
          } catch (err) {
            console.log('[ModelConfig] Failed to fetch user models for admin, using fallback models:', err);
            fetchedModels = await getPublicModels();
          }
        }
      }
      
      // If still no models, use fallback models
      if (fetchedModels.length === 0) {
        console.log('[ModelConfig] No models found, using fallback models');
        fetchedModels = await getPublicModels();
      }
      
      console.log('[ModelConfig] Final models count:', fetchedModels.length);
      setModels(fetchedModels);
      
      // Auto-select default model if no model is currently selected
      if (!selectedModel && fetchedModels.length > 0) {
        const defaultModel = fetchedModels.find((model: AIModel) => 
          model.id === 'gpt-4o-mini' || model.isDefault
        ) || fetchedModels[0];
        if (defaultModel) {
          console.log('[ModelConfig] Auto-selecting default model:', defaultModel.id);
          setSelectedModel(defaultModel);
        }
      }
    } catch (err) {
      console.error('[ModelConfig] Error in fetchModels:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch models';
      setError(errorMessage);
      
      // Even on error, try to provide fallback models
      try {
        console.log('[ModelConfig] Attempting to load fallback models after error');
        const fallbackModels = await getPublicModels();
        setModels(fallbackModels);
        if (fallbackModels.length > 0 && !selectedModel) {
          setSelectedModel(fallbackModels[0]);
        }
        // Clear the error since we have working models
        setError(null);
      } catch (fallbackErr) {
        console.error('[ModelConfig] Failed to load fallback models:', fallbackErr);
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
    const checkAdminStatus = () => {
      if (user?.id && user.emailAddresses?.[0]?.emailAddress) {
        try {
          const adminStatus = isAdmin(user.emailAddresses[0].emailAddress);
          setUserIsAdmin(adminStatus);
          console.log('[ModelConfig] Admin status checked:', adminStatus, 'for email:', user.emailAddresses[0].emailAddress);
        } catch (error) {
          console.error('[ModelConfig] Error checking admin status:', error);
          setUserIsAdmin(false);
        }
      } else {
        setUserIsAdmin(false);
        console.log('[ModelConfig] No user or email, setting admin status to false');
      }
    };
    
    checkAdminStatus();
  }, [user?.id, user?.emailAddresses]);

  // Listen for model configuration changes from admin panel
  useEffect(() => {
    const handleModelConfigChange = () => {
      // Refresh models when admin changes are made
      refreshModels();
    };

    // Add event listener for admin panel changes
    window.addEventListener('modelConfigChanged', handleModelConfigChange);

    return () => {
      window.removeEventListener('modelConfigChange', handleModelConfigChange);
    };
  }, [refreshModels]);

  // Fetch models only after we have user info and admin status
  useEffect(() => {
    // If user is null (not signed in), still provide fallback models
    if (user === null) {
      console.log('[ModelConfig] User not signed in, loading fallback models');
      fetchModels();
      return;
    }
    
    // Only fetch models if we have user info and admin status is determined
    // Also check if user is not in a loading state
    if (user !== undefined && userIsAdmin !== undefined && !user?.id?.includes('loading')) {
      console.log('[ModelConfig] User and admin status ready, fetching models');
      fetchModels();
    } else {
      console.log('[ModelConfig] Waiting for user or admin status:', { 
        user: user?.id, 
        userIsAdmin, 
        isLoading: user?.id?.includes('loading') 
      });
    }
  }, [user, userIsAdmin, fetchModels]);

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
