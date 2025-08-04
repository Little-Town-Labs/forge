/**
 * Type declarations for error tracking and analytics services
 * These declarations extend the global Window interface to include
 * various error tracking and analytics services that may be available.
 */

interface Window {
  // Sentry error tracking
  Sentry?: {
    captureException: (error: Error, options?: any) => void;
    withScope: (callback: (scope: any) => void) => void;
  };

  // Bugsnag error tracking
  Bugsnag?: {
    notify: (error: Error, callback?: (event: any) => void) => void;
  };

  // LogRocket session replay and error tracking
  LogRocket?: {
    captureException: (error: Error) => void;
    track: (eventName: string, properties?: Record<string, any>) => void;
  };

  // Google Analytics (gtag)
  gtag?: (
    command: 'event',
    eventName: string,
    parameters: {
      description?: string;
      fatal?: boolean;
      custom_map?: Record<string, any>;
    }
  ) => void;

  // PostHog analytics
  posthog?: {
    capture: (eventName: string, properties?: Record<string, any>) => void;
  };

  // Mixpanel analytics
  mixpanel?: {
    track: (eventName: string, properties?: Record<string, any>) => void;
  };

  // Amplitude analytics
  amplitude?: {
    getInstance: () => {
      logEvent: (eventName: string, properties?: Record<string, any>) => void;
    };
  };

  // Rollbar error tracking
  Rollbar?: {
    error: (error: Error, extra?: Record<string, any>) => void;
  };

  // Raygun error tracking
  rg4js?: (eventName: string, error: Error, customData?: Record<string, any>) => void;

  // Datadog RUM
  DD_RUM?: {
    addError: (error: Error, context?: Record<string, any>) => void;
  };

  // New Relic
  newrelic?: {
    noticeError: (error: Error, customAttributes?: Record<string, any>) => void;
  };
}

// Error tracking service types
export interface ErrorTrackingData {
  message: string;
  name: string;
  stack?: string;
  digest?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  environment: string;
  errorType: 'authentication' | 'network' | 'application' | 'clerk-authentication';
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags: Record<string, any>;
  user?: {
    isSignedIn?: boolean;
    hasAuth?: boolean;
  };
  clerk?: {
    publishableKeySet?: boolean;
    publishableKeyType?: 'test' | 'live' | 'unknown';
    errorBoundary?: string;
  };
}

// React Error Boundary types
export interface ErrorInfo {
  componentStack: string;
}

// Sentry scope interface
export interface SentryScope {
  setUser: (user: { id: string; [key: string]: any }) => void;
  setContext: (key: string, context: Record<string, any>) => void;
  setTag: (key: string, value: string) => void;
  setLevel: (level: 'fatal' | 'error' | 'warning' | 'info' | 'debug') => void;
}

// Configuration for error tracking
export interface ErrorTrackingConfig {
  enableSentry?: boolean;
  enableBugsnag?: boolean;
  enableLogRocket?: boolean;
  enableAnalytics?: boolean;
  enableConsoleLogging?: boolean;
  environment?: string;
  privacyMode?: boolean;
}

declare global {
  interface Window {
    // Make error tracking services optional on the global window
    Sentry?: Window['Sentry'];
    Bugsnag?: Window['Bugsnag'];
    LogRocket?: Window['LogRocket'];
    gtag?: Window['gtag'];
    posthog?: Window['posthog'];
    mixpanel?: Window['mixpanel'];
    amplitude?: Window['amplitude'];
    Rollbar?: Window['Rollbar'];
    rg4js?: Window['rg4js'];
    DD_RUM?: Window['DD_RUM'];
    newrelic?: Window['newrelic'];
  }
}