// Fallback models that are always available
export const FALLBACK_MODELS = [
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Fast and efficient GPT-4 model',
    maxTokens: 128000,
    pricing: {
      input: 0.00015,
      output: 0.0006
    },
    isEnabled: true,
    model: 'gpt-4o-mini',
    temperature: 0.7
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    description: 'Fast and cost-effective GPT-3.5 model',
    maxTokens: 16385,
    pricing: {
      input: 0.0005,
      output: 0.0015
    },
    isEnabled: true,
    model: 'gpt-3.5-turbo',
    temperature: 0.7
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    description: 'Fast and efficient Claude model',
    maxTokens: 200000,
    pricing: {
      input: 0.00025,
      output: 0.00125
    },
    isEnabled: true,
    model: 'claude-3-haiku-20240307',
    temperature: 0.7
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    description: 'Fast and cost-effective Gemini model',
    maxTokens: 1000000,
    pricing: {
      input: 0.000075,
      output: 0.0003
    },
    isEnabled: true,
    model: 'gemini-1.5-flash',
    temperature: 0.7
  }
];

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  maxTokens: number;
  pricing: {
    input: number;
    output: number;
  };
  isUserModel?: boolean;
  userId?: string;
  isDefault?: boolean;
  isEnabled?: boolean;
  model?: string;
  temperature?: number;
}

export async function getPublicModels(): Promise<AIModel[]> {
  try {
    // Try to get admin-configured models first
    const adminModels = await getAdminModels();
    if (adminModels.length > 0) {
      return adminModels;
    }
  } catch {
    console.log('Admin models not available, using fallback models');
  }
  
  // Return fallback models if admin models are not available
  return FALLBACK_MODELS;
}

export async function getAdminModels(): Promise<AIModel[]> {
  try {
    const response = await fetch('/api/admin/config/models', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.models || [];
    }
  } catch {
    console.error('Failed to fetch admin models');
  }
  
  return [];
}

export async function getUserModels(userId: string): Promise<AIModel[]> {
  try {
    const response = await fetch(`/api/user/models?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.models || [];
    }
  } catch {
    console.error('Failed to fetch user models');
  }
  
  return [];
}

export async function getAllAvailableModels(userId: string): Promise<AIModel[]> {
  const [publicModels, userModels] = await Promise.all([
    getPublicModels(),
    getUserModels(userId)
  ]);
  
  // Combine and deduplicate models
  const allModels = [...publicModels];
  const existingIds = new Set(publicModels.map(m => m.id));
  
  userModels.forEach(model => {
    if (!existingIds.has(model.id)) {
      allModels.push({
        ...model,
        isUserModel: true,
        userId
      });
    }
  });
  
  return allModels;
}

export function validateModelAccess(model: AIModel, userId: string, isUserAdmin: boolean): boolean {
  // Admin users can access all models
  if (isUserAdmin) return true;
  
  // Public models are accessible to all users
  if (!model.isUserModel) return true;
  
  // User models are only accessible to their owner
  return model.userId === userId;
}
