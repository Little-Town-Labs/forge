/**
 * Application Degradation Mode Utilities
 * 
 * Provides utilities for handling graceful degradation when database
 * or other critical components are not available.
 */


/**
 * Application degradation modes
 */
export type DegradationMode = 'none' | 'demo' | 'readonly' | 'disabled';

/**
 * Application state based on degradation mode
 */
export interface ApplicationState {
  mode: DegradationMode;
  features: {
    chat: boolean;
    adminConfig: boolean;
    ragCrawling: boolean;
    userManagement: boolean;
    auditLogs: boolean;
  };
  limitations: string[];
  recommendations: string[];
}

/**
 * Get application state based on degradation mode
 */
export function getApplicationState(mode: DegradationMode): ApplicationState {
  const baseState: ApplicationState = {
    mode,
    features: {
      chat: false,
      adminConfig: false,
      ragCrawling: false,
      userManagement: false,
      auditLogs: false
    },
    limitations: [],
    recommendations: []
  };

  switch (mode) {
    case 'none':
      return {
        ...baseState,
        features: {
          chat: true,
          adminConfig: true,
          ragCrawling: true,
          userManagement: true,
          auditLogs: true
        },
        limitations: [],
        recommendations: []
      };

    case 'demo':
      return {
        ...baseState,
        features: {
          chat: true,
          adminConfig: false,
          ragCrawling: false,
          userManagement: true,
          auditLogs: false
        },
        limitations: [
          'Chat uses hardcoded demo context instead of RAG database',
          'Admin configuration is disabled - using fallback model settings',
          'RAG crawling and indexing is not available',
          'Audit logging is disabled'
        ],
        recommendations: [
          'Configure database connection to enable full functionality',
          'Run database setup script: npm run setup-db',
          'Verify environment variables are properly set'
        ]
      };

    case 'readonly':
      return {
        ...baseState,
        features: {
          chat: true,
          adminConfig: true,
          ragCrawling: false,
          userManagement: true,
          auditLogs: true
        },
        limitations: [
          'RAG crawling and indexing is disabled due to database schema issues',
          'Some admin configuration updates may fail',
          'New model configurations cannot be created'
        ],
        recommendations: [
          'Run database schema updates to restore full functionality',
          'Check for missing database tables or indexes',
          'Review database migration status'
        ]
      };

    case 'disabled':
      return {
        ...baseState,
        features: {
          chat: false,
          adminConfig: false,
          ragCrawling: false,
          userManagement: false,
          auditLogs: false
        },
        limitations: [
          'All database-dependent features are disabled',
          'Chat functionality is completely unavailable',
          'Admin configuration is not accessible',
          'User management is disabled'
        ],
        recommendations: [
          'Fix critical database connection issues',
          'Verify database server is running and accessible',
          'Check network connectivity and firewall settings',
          'Review database credentials and connection string'
        ]
      };

    default:
      return baseState;
  }
}

/**
 * Check if a specific feature is available in the current degradation mode
 */
export function isFeatureAvailable(mode: DegradationMode, feature: keyof ApplicationState['features']): boolean {
  const state = getApplicationState(mode);
  return state.features[feature];
}

/**
 * Get user-friendly explanation of current application state
 */
export function getStateExplanation(mode: DegradationMode): {
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
} {
  switch (mode) {
    case 'none':
      return {
        title: 'Full Operation',
        description: 'All features are available and working correctly.',
        severity: 'info'
      };

    case 'demo':
      return {
        title: 'Demo Mode',
        description: 'The application is running with limited functionality using demo data. Chat works with hardcoded context instead of your knowledge base.',
        severity: 'warning'
      };

    case 'readonly':
      return {
        title: 'Read-Only Mode',
        description: 'The application is running with reduced functionality. Some operations that modify the database are disabled.',
        severity: 'warning'
      };

    case 'disabled':
      return {
        title: 'Service Unavailable',
        description: 'Critical components are not available. The application cannot provide core functionality.',
        severity: 'error'
      };

    default:
      return {
        title: 'Unknown State',
        description: 'Application state could not be determined.',
        severity: 'error'
      };
  }
}

/**
 * Runtime degradation mode detector
 */
export class DegradationDetector {
  private currentMode: DegradationMode = 'none';
  private lastCheck: Date = new Date();
  private listeners: Array<(mode: DegradationMode) => void> = [];

  constructor(initialMode: DegradationMode = 'none') {
    this.currentMode = initialMode;
  }

  /**
   * Get current degradation mode
   */
  getCurrentMode(): DegradationMode {
    return this.currentMode;
  }

  /**
   * Update degradation mode and notify listeners
   */
  updateMode(newMode: DegradationMode): void {
    if (newMode !== this.currentMode) {
      const previousMode = this.currentMode;
      this.currentMode = newMode;
      this.lastCheck = new Date();
      
      console.log(`[Degradation] Mode changed from ${previousMode} to ${newMode}`);
      
      // Notify listeners
      this.listeners.forEach(listener => {
        try {
          listener(newMode);
        } catch (error) {
          console.error('[Degradation] Error in mode change listener:', error);
        }
      });
    }
  }

  /**
   * Subscribe to mode changes
   */
  onModeChange(listener: (mode: DegradationMode) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get time since last mode check
   */
  getLastCheckTime(): Date {
    return this.lastCheck;
  }

  /**
   * Check if the application is in degraded mode
   */
  isDegraded(): boolean {
    return this.currentMode !== 'none';
  }

  /**
   * Check if a specific feature should be available
   */
  isFeatureEnabled(feature: keyof ApplicationState['features']): boolean {
    return isFeatureAvailable(this.currentMode, feature);
  }
}

/**
 * Global degradation detector instance
 */
export const globalDegradationDetector = new DegradationDetector();

/**
 * React hook for degradation mode (if using React)
 */
export function useDegradationMode(): {
  mode: DegradationMode;
  state: ApplicationState;
  isFeatureAvailable: (feature: keyof ApplicationState['features']) => boolean;
} {
  // This would need to be implemented with proper React hooks
  // For now, return current state
  const mode = globalDegradationDetector.getCurrentMode();
  const state = getApplicationState(mode);
  
  return {
    mode,
    state,
    isFeatureAvailable: (feature) => state.features[feature]
  };
}

/**
 * Middleware for API routes to handle degraded modes
 */
export function createDegradationMiddleware() {
  return {
    /**
     * Check if an API endpoint should be available in current mode
     */
    checkEndpointAvailability(endpoint: string): {
      available: boolean;
      reason?: string;
    } {
      const mode = globalDegradationDetector.getCurrentMode();
      
      // Define endpoint requirements
      const endpointRequirements: Record<string, keyof ApplicationState['features']> = {
        '/api/chat': 'chat',
        '/api/admin': 'adminConfig',
        '/api/crawl': 'ragCrawling',
        '/api/context': 'chat',
        '/api/config': 'adminConfig'
      };
      
      const requiredFeature = endpointRequirements[endpoint];
      if (!requiredFeature) {
        return { available: true }; // Unknown endpoint, allow by default
      }
      
      const available = globalDegradationDetector.isFeatureEnabled(requiredFeature);
      
      if (!available) {
        const explanation = getStateExplanation(mode);
        return {
          available: false,
          reason: `Endpoint not available in ${mode} mode: ${explanation.description}`
        };
      }
      
      return { available: true };
    },

    /**
     * Get response for unavailable endpoints
     */
    getUnavailableResponse(endpoint: string): {
      status: number;
      body: {
        error: string;
        mode: DegradationMode;
        message: string;
        suggestions: string[];
      };
    } {
      const mode = globalDegradationDetector.getCurrentMode();
      const state = getApplicationState(mode);
      const explanation = getStateExplanation(mode);
      
      return {
        status: mode === 'disabled' ? 503 : 423,
        body: {
          error: 'Service Unavailable',
          mode,
          message: `${endpoint} is not available in ${mode} mode: ${explanation.description}`,
          suggestions: state.recommendations
        }
      };
    }
  };
}

/**
 * Database fallback utilities
 */
export const databaseFallbacks = {
  /**
   * Get fallback model configuration when database is unavailable
   */
  getFallbackModelConfig(provider: 'openai' | 'google') {
    if (provider === 'google') {
      return {
        provider: 'google' as const,
        modelName: 'gemini-2.5-flash',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 1.0,
        systemPrompt: 'You are a helpful AI assistant with access to a curated knowledge base. Use the provided context to give accurate, helpful responses. If the context doesn\'t contain relevant information, clearly state that and provide general guidance if possible.'
      };
    } else {
      return {
        provider: 'openai' as const,
        modelName: 'gpt-5-nano',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 1.0,
        systemPrompt: 'You are a helpful AI assistant with access to a curated knowledge base. Use the provided context to give accurate, helpful responses. If the context doesn\'t contain relevant information, clearly state that and provide general guidance if possible.'
      };
    }
  },

  /**
   * Get demo context when RAG database is unavailable
   */
  getDemoContext() {
    return [
      {
        content: 'Forge is a Next.js application that provides AI-powered chat with RAG capabilities.',
        source: 'Demo Content',
        score: 0.9
      },
      {
        content: 'The application supports multiple AI providers including OpenAI and Google AI.',
        source: 'Demo Content',
        score: 0.8
      },
      {
        content: 'Admin users can configure AI models, manage RAG URLs, and view audit logs.',
        source: 'Demo Content',
        score: 0.7
      }
    ];
  }
};