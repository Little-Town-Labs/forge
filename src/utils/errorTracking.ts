/**
 * Centralized error tracking utility
 * Provides structured error reporting with privacy controls
 * and multiple service integrations
 */

import type { ErrorTrackingData, ErrorInfo, ErrorTrackingConfig } from '@/types/error-tracking';

// Default configuration
const defaultConfig: ErrorTrackingConfig = {
  enableSentry: true,
  enableBugsnag: true,
  enableLogRocket: true,
  enableAnalytics: true,
  enableConsoleLogging: process.env.NODE_ENV === 'development',
  environment: process.env.NODE_ENV || 'unknown',
  privacyMode: process.env.NODE_ENV === 'production',
};

/**
 * Sanitize error data to remove sensitive information
 */
function sanitizeErrorData(data: ErrorTrackingData): ErrorTrackingData {
  const sanitized = { ...data };
  
  // Remove or mask sensitive information
  if (sanitized.stack && defaultConfig.privacyMode) {
    // In production, limit stack trace to first few lines
    sanitized.stack = sanitized.stack.split('\n').slice(0, 3).join('\n');
  }
  
  // Sanitize URL to remove query parameters that might contain sensitive data
  try {
    const url = new URL(sanitized.url);
    url.search = ''; // Remove query parameters
    sanitized.url = url.toString();
  } catch {
    // If URL parsing fails, just remove everything after '?'
    sanitized.url = sanitized.url.split('?')[0];
  }
  
  // Limit user agent string in production
  if (defaultConfig.privacyMode && sanitized.userAgent.length > 200) {
    sanitized.userAgent = sanitized.userAgent.substring(0, 200) + '...';
  }
  
  return sanitized;
}

/**
 * Report error to Sentry
 */
function reportToSentry(error: Error, data: ErrorTrackingData, errorInfo?: ErrorInfo): void {
  if (!window.Sentry || !defaultConfig.enableSentry) return;
  
  window.Sentry.withScope((scope) => {
    // Set user context (privacy-safe)
    scope.setUser({
      id: data.user?.isSignedIn ? 'authenticated-user' : 'anonymous-user',
    });
    
    // Set context
    scope.setContext('errorTracking', {
      boundary: data.tags.boundary,
      component: data.tags.component,
      recoverable: data.tags.recoverable,
      errorType: data.errorType,
    });
    
    // Set tags for filtering
    scope.setTag('environment', data.environment);
    scope.setTag('errorType', data.errorType);
    scope.setTag('severity', data.severity);
    
    // Set level based on severity
    const sentryLevel = data.severity === 'critical' ? 'fatal' : 
                       data.severity === 'high' ? 'error' :
                       data.severity === 'medium' ? 'warning' : 'info';
    scope.setLevel(sentryLevel);
    
    // Additional contexts
    const contexts: Record<string, any> = {};
    
    if (errorInfo) {
      contexts.react = {
        componentStack: errorInfo.componentStack,
      };
    }
    
    if (data.clerk) {
      contexts.clerk = data.clerk;
    }
    
    // Capture the error
    window.Sentry.captureException(error, { contexts });
  });
}

/**
 * Report error to Bugsnag
 */
function reportToBugsnag(error: Error, data: ErrorTrackingData, errorInfo?: ErrorInfo): void {
  if (!window.Bugsnag || !defaultConfig.enableBugsnag) return;
  
  window.Bugsnag.notify(error, (event) => {
    event.context = `${data.tags.boundary}-${data.tags.component}`;
    event.severity = data.severity === 'critical' ? 'error' : 
                    data.severity === 'high' ? 'error' :
                    data.severity === 'medium' ? 'warning' : 'info';
    
    // Add metadata
    event.addMetadata('errorTracking', data);
    
    if (errorInfo) {
      event.addMetadata('react', {
        componentStack: errorInfo.componentStack,
      });
    }
  });
}

/**
 * Report error to LogRocket
 */
function reportToLogRocket(error: Error, data: ErrorTrackingData): void {
  if (!window.LogRocket || !defaultConfig.enableLogRocket) return;
  
  window.LogRocket.captureException(error);
  window.LogRocket.track(`Error: ${data.tags.boundary}`, {
    errorType: data.errorType,
    severity: data.severity,
    component: data.tags.component,
    recoverable: data.tags.recoverable,
  });
}

/**
 * Report error to analytics services
 */
function reportToAnalytics(error: Error, data: ErrorTrackingData): void {
  if (!defaultConfig.enableAnalytics) return;
  
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', 'exception', {
      description: error.message,
      fatal: data.severity === 'critical',
      custom_map: {
        error_type: data.errorType,
        error_boundary: data.tags.boundary,
        component: data.tags.component,
      }
    });
  }
  
  // PostHog
  if (window.posthog) {
    window.posthog.capture('error_tracked', {
      error_message: error.message,
      error_type: data.errorType,
      boundary: data.tags.boundary,
      component: data.tags.component,
      severity: data.severity,
      recoverable: data.tags.recoverable,
    });
  }
  
  // Mixpanel
  if (window.mixpanel) {
    window.mixpanel.track('Error Tracked', {
      'Error Type': data.errorType,
      'Severity': data.severity,
      'Component': data.tags.component,
      'Boundary': data.tags.boundary,
      'Recoverable': data.tags.recoverable,
    });
  }
  
  // Amplitude
  if (window.amplitude) {
    window.amplitude.getInstance().logEvent('Error Tracked', {
      error_type: data.errorType,
      severity: data.severity,
      component: data.tags.component,
      boundary: data.tags.boundary,
    });
  }
}

/**
 * Console logging for development
 */
function logToConsole(error: Error, data: ErrorTrackingData, errorInfo?: ErrorInfo): void {
  if (!defaultConfig.enableConsoleLogging) return;
  
  const emoji = data.severity === 'critical' ? '🚨' : 
               data.severity === 'high' ? '⚠️' : 
               data.severity === 'medium' ? '⚠️' : 'ℹ️';
  
  console.group(`${emoji} ${data.tags.boundary.toUpperCase()} Error`);
  console.error('Error:', error);
  if (errorInfo) {
    console.error('Error Info:', errorInfo);
  }
  console.table(data);
  console.groupEnd();
}

/**
 * Main error tracking function
 * Reports errors to all configured services with proper data sanitization
 */
export function trackError(
  error: Error,
  data: Partial<ErrorTrackingData>,
  errorInfo?: ErrorInfo
): void {
  // Build complete error data with defaults
  const errorData: ErrorTrackingData = {
    message: error.message,
    name: error.name,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
    environment: defaultConfig.environment || 'unknown',
    errorType: 'application',
    severity: 'medium',
    tags: {
      boundary: 'unknown',
      component: 'unknown',
      recoverable: true,
    },
    ...data,
  };
  
  // Sanitize data for privacy
  const sanitizedData = sanitizeErrorData(errorData);
  
  // Only proceed if we're in a browser environment
  if (typeof window === 'undefined') {
    console.error('Error tracked (server-side):', sanitizedData);
    return;
  }
  
  // Report to all configured services
  try {
    reportToSentry(error, sanitizedData, errorInfo);
    reportToBugsnag(error, sanitizedData, errorInfo);
    reportToLogRocket(error, sanitizedData);
    reportToAnalytics(error, sanitizedData);
    logToConsole(error, sanitizedData, errorInfo);
  } catch (trackingError) {
    // Don't let error tracking errors break the app
    console.warn('Error tracking failed:', trackingError);
  }
}

/**
 * Track authentication-specific errors
 */
export function trackAuthError(
  error: Error,
  context: {
    isSignedIn?: boolean;
    publishableKeyType?: 'test' | 'live' | 'unknown';
    boundary?: string;
  },
  errorInfo?: ErrorInfo
): void {
  trackError(error, {
    errorType: 'authentication',
    severity: 'high',
    user: {
      isSignedIn: context.isSignedIn,
      hasAuth: !!context.isSignedIn,
    },
    clerk: {
      publishableKeyType: context.publishableKeyType,
      publishableKeySet: true,
      errorBoundary: context.boundary,
    },
    tags: {
      boundary: context.boundary || 'auth',
      component: 'authentication',
      recoverable: true,
      service: 'clerk',
    },
  }, errorInfo);
}

/**
 * Track network-related errors
 */
export function trackNetworkError(
  error: Error,
  context: {
    endpoint?: string;
    method?: string;
    statusCode?: number;
    boundary?: string;
  }
): void {
  trackError(error, {
    errorType: 'network',
    severity: 'high',
    tags: {
      boundary: context.boundary || 'network',
      component: 'api',
      recoverable: true,
      endpoint: context.endpoint,
      method: context.method,
      statusCode: context.statusCode?.toString(),
    },
  });
}

/**
 * Update error tracking configuration
 */
export function configureErrorTracking(config: Partial<ErrorTrackingConfig>): void {
  Object.assign(defaultConfig, config);
}

/**
 * Get current error tracking configuration
 */
export function getErrorTrackingConfig(): ErrorTrackingConfig {
  return { ...defaultConfig };
}