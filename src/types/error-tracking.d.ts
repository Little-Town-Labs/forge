/**
 * Type declarations for error tracking and analytics services
 * These declarations extend the global Window interface to include
 * various error tracking and analytics services that may be available.
 */

interface SentryOptions {
  contexts?: Record<string, Record<string, unknown>>;
}

interface SentryScope {
  setUser: (user: { id: string; [key: string]: unknown }) => void;
  setContext: (key: string, context: Record<string, unknown>) => void;
  setTag: (key: string, value: string) => void;
  setLevel: (level: 'fatal' | 'error' | 'warning' | 'info' | 'debug') => void;
}

interface BugsnagEvent {
  context?: string;
  severity?: string;
  addMetadata: (section: string, data: Record<string, unknown>) => void;
}

interface Window {
  // Sentry error tracking
  Sentry?: {
    captureException: (error: Error, options?: SentryOptions) => void;
    withScope: (callback: (scope: SentryScope) => void) => void;
  };

  // Bugsnag error tracking
  Bugsnag?: {
    notify: (error: Error, callback?: (event: BugsnagEvent) => void) => void;
  };

  // LogRocket session replay and error tracking
  LogRocket?: {
    captureException: (error: Error) => void;
    track: (eventName: string, properties?: Record<string, unknown>) => void;
  };

  // Google Analytics (gtag)
  gtag?: (
    command: 'event',
    eventName: string,
    parameters: {
      description?: string;
      fatal?: boolean;
      custom_map?: Record<string, string>;
    }
  ) => void;

  // PostHog analytics
  posthog?: {
    capture: (eventName: string, properties?: Record<string, unknown>) => void;
  };

  // Mixpanel analytics
  mixpanel?: {
    track: (eventName: string, properties?: Record<string, unknown>) => void;
  };

  // Amplitude analytics
  amplitude?: {
    getInstance: () => {
      logEvent: (eventName: string, properties?: Record<string, unknown>) => void;
    };
  };

  // Rollbar error tracking
  Rollbar?: {
    error: (error: Error, extra?: Record<string, unknown>) => void;
  };

  // Raygun error tracking
  rg4js?: (eventName: string, error: Error, customData?: Record<string, unknown>) => void;

  // Datadog RUM
  DD_RUM?: {
    addError: (error: Error, context?: Record<string, unknown>) => void;
  };

  // New Relic
  newrelic?: {
    noticeError: (error: Error, customAttributes?: Record<string, unknown>) => void;
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
  tags: Record<string, string | number | boolean>;
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

// Export the SentryScope interface for external use
export type { SentryScope };

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