/**
 * Shared API Response Utilities for Forge Application
 * 
 * Provides consistent error handling, response formatting, and common patterns
 * across all API routes in the application.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Standardized API response structure
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
  timestamp?: string;
}

// Error codes for consistent error handling
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_USER: 'INVALID_USER',
  AUTH_SERVICE_UNAVAILABLE: 'AUTH_SERVICE_UNAVAILABLE',
  
  // Validation & Input
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',
  
  // System & Services
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
} as const;

// HTTP status codes mapping
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

/**
 * Create a standardized API response
 */
export function createApiResponse<T>(
  success: boolean,
  status: number,
  data?: T,
  error?: string,
  code?: string,
  message?: string,
  headers?: Record<string, string>
): NextResponse {
  const response: ApiResponse<T> = { 
    success,
    timestamp: new Date().toISOString()
  };
  
  if (success && data !== undefined) {
    response.data = data;
  }
  
  if (!success && error) {
    response.error = error;
  }
  
  if (code) {
    response.code = code;
  }
  
  if (message) {
    response.message = message;
  }
  
  const responseHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };
  
  return NextResponse.json(response, { status, headers: responseHeaders });
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(
  data?: T,
  message?: string,
  status: number = HttpStatus.OK,
  headers?: Record<string, string>
): NextResponse {
  return createApiResponse(true, status, data, undefined, undefined, message, headers);
}

/**
 * Create an error response
 */
export function createErrorResponse(
  error: string,
  code: string,
  status: number = HttpStatus.INTERNAL_SERVER_ERROR,
  headers?: Record<string, string>
): NextResponse {
  return createApiResponse(false, status, undefined, error, code, undefined, headers);
}

/**
 * Authentication helper - verifies user authentication with consistent error responses
 */
export async function verifyAuthentication(): Promise<{
  success: boolean;
  userId?: string | null;
  response?: NextResponse;
}> {
  try {
    const authResult = await auth();
    const userId = authResult.userId;
    
    if (!userId) {
      return {
        success: false,
        response: createErrorResponse(
          "Unauthorized - Please sign in to access this resource",
          ErrorCodes.UNAUTHORIZED,
          HttpStatus.UNAUTHORIZED
        )
      };
    }
    
    return { success: true, userId };
    
  } catch (authError) {
    console.error("Clerk authentication service error:", authError);
    return {
      success: false,
      response: createErrorResponse(
        "Authentication service temporarily unavailable. Please try again later.",
        ErrorCodes.AUTH_SERVICE_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE
      )
    };
  }
}

/**
 * Common error response patterns
 */
export const CommonErrors = {
  /**
   * Authentication service unavailable
   */
  authServiceUnavailable: () => createErrorResponse(
    "Authentication service temporarily unavailable. Please try again later.",
    ErrorCodes.AUTH_SERVICE_UNAVAILABLE,
    HttpStatus.SERVICE_UNAVAILABLE
  ),
  
  /**
   * User not authenticated
   */
  unauthorized: (message?: string) => createErrorResponse(
    message || "Unauthorized - Please sign in to access this resource",
    ErrorCodes.UNAUTHORIZED,
    HttpStatus.UNAUTHORIZED
  ),
  
  /**
   * User authenticated but lacks permissions
   */
  forbidden: (message?: string) => createErrorResponse(
    message || "Forbidden - You don't have permission to access this resource",
    ErrorCodes.FORBIDDEN,
    HttpStatus.FORBIDDEN
  ),
  
  /**
   * Invalid user information
   */
  invalidUser: (message?: string) => createErrorResponse(
    message || "Unable to verify user information",
    ErrorCodes.INVALID_USER,
    HttpStatus.BAD_REQUEST
  ),
  
  /**
   * Missing required field
   */
  missingField: (fieldName: string) => createErrorResponse(
    `${fieldName} is required`,
    ErrorCodes.MISSING_REQUIRED_FIELD,
    HttpStatus.BAD_REQUEST
  ),
  
  /**
   * Invalid input format
   */
  invalidFormat: (fieldName: string, expectedFormat?: string) => createErrorResponse(
    `Invalid ${fieldName} format${expectedFormat ? `. Expected: ${expectedFormat}` : ''}`,
    ErrorCodes.INVALID_FORMAT,
    HttpStatus.BAD_REQUEST
  ),
  
  /**
   * Resource not found
   */
  notFound: (resource?: string) => createErrorResponse(
    `${resource || 'Resource'} not found`,
    ErrorCodes.NOT_FOUND,
    HttpStatus.NOT_FOUND
  ),
  
  /**
   * Internal server error
   */
  internalError: (message?: string, details?: string) => {
    console.error("Internal server error:", message, details);
    return createErrorResponse(
      message || "An internal server error occurred",
      ErrorCodes.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  },
  
  /**
   * External service error
   */
  externalServiceError: (serviceName: string, details?: string) => {
    console.error(`${serviceName} service error:`, details);
    return createErrorResponse(
      `${serviceName} service is currently unavailable. Please try again later.`,
      ErrorCodes.EXTERNAL_SERVICE_ERROR,
      HttpStatus.SERVICE_UNAVAILABLE
    );
  },
  
  /**
   * Configuration error
   */
  configurationError: (message: string) => {
    console.error("Configuration error:", message);
    return createErrorResponse(
      "Service configuration error. Please contact support.",
      ErrorCodes.CONFIGURATION_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Handle async errors with consistent logging and response
 */
export async function handleAsyncError<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  errorCode: string = ErrorCodes.INTERNAL_ERROR
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    
    const errorDetails = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      response: createErrorResponse(
        errorMessage,
        errorCode,
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    };
  }
}

/**
 * Validate request body with consistent error responses
 */
export async function validateRequestBody<T>(
  req: Request,
  requiredFields: string[] = []
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await req.json();
    
    // Check for required fields
    for (const field of requiredFields) {
      if (!body[field]) {
        return {
          success: false,
          response: CommonErrors.missingField(field)
        };
      }
    }
    
    return { success: true, data: body };
    
  } catch (error) {
    return {
      success: false,
      response: createErrorResponse(
        "Invalid JSON in request body",
        ErrorCodes.INVALID_INPUT,
        HttpStatus.BAD_REQUEST
      )
    };
  }
}

/**
 * Handle Clerk service errors with appropriate responses
 */
export function handleClerkServiceError(
  error: unknown,
  operation: string
): NextResponse {
  console.error(`Clerk ${operation} service error:`, error);
  
  // Check if it's a network/service error (connection issues, timeouts, etc.)
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    
    // Network errors, timeouts, service unavailable
    if (
      errorObj.code === 'ECONNREFUSED' ||
      errorObj.code === 'ETIMEDOUT' ||
      errorObj.code === 'ENOTFOUND' ||
      errorObj.name === 'TimeoutError' ||
      errorObj.message?.includes('timeout') ||
      errorObj.message?.includes('network') ||
      errorObj.message?.includes('connection')
    ) {
      return createErrorResponse(
        "User management service temporarily unavailable. Please try again later.",
        ErrorCodes.AUTH_SERVICE_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
    
    // Handle specific Clerk API errors that indicate service issues
    if ('errors' in errorObj) {
      const clerkError = errorObj as { errors: Array<{ code: string; message: string }> };
      const errorCode = clerkError.errors?.[0]?.code;
      
      // Service-level errors that should return 503
      if (
        errorCode === 'rate_limit_exceeded' ||
        errorCode === 'service_unavailable' ||
        errorCode === 'internal_server_error'
      ) {
        return createErrorResponse(
          "User management service temporarily unavailable. Please try again later.",
          ErrorCodes.AUTH_SERVICE_UNAVAILABLE,
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }
    }
  }
  
  // For other errors, let the calling code handle them specifically
  throw error;
}

/**
 * Create streaming error response (for streaming endpoints like chat)
 */
export function createStreamingErrorResponse(
  error: string,
  code: string,
  status: number = HttpStatus.INTERNAL_SERVER_ERROR
): Response {
  const response = {
    success: false,
    error,
    code,
    timestamp: new Date().toISOString()
  };
  
  return new Response(
    JSON.stringify(response),
    {
      status,
      headers: { "Content-Type": "application/json" }
    }
  );
}

/**
 * Streaming error patterns for streaming endpoints
 */
export const StreamingErrors = {
  authServiceUnavailable: () => createStreamingErrorResponse(
    "Authentication service temporarily unavailable. Please try again later.",
    ErrorCodes.AUTH_SERVICE_UNAVAILABLE,
    HttpStatus.SERVICE_UNAVAILABLE
  ),
  
  unauthorized: (message?: string) => createStreamingErrorResponse(
    message || "Unauthorized - Please sign in to access this resource",
    ErrorCodes.UNAUTHORIZED,
    HttpStatus.UNAUTHORIZED
  ),
  
  internalError: (message?: string) => createStreamingErrorResponse(
    message || "An internal server error occurred",
    ErrorCodes.INTERNAL_ERROR,
    HttpStatus.INTERNAL_SERVER_ERROR
  )
};