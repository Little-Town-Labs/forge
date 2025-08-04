# Clerk Service Error Handling Implementation

## Overview
Added comprehensive Clerk service error handling to the invitations API routes with proper 503 Service Unavailable responses when Clerk services are temporarily unavailable.

## Changes Made

### 1. Enhanced API Response Utility (`src/utils/apiResponse.ts`)

Added `handleClerkServiceError()` function that:
- Detects network errors (connection refused, timeouts, DNS issues)
- Identifies Clerk service-level errors (rate limits, service unavailable)
- Returns 503 Service Unavailable for service issues
- Re-throws application-level errors for specific handling

```typescript
export function handleClerkServiceError(error: unknown, operation: string): NextResponse
```

**Detected Error Patterns:**
- Network: `ECONNREFUSED`, `ETIMEDOUT`, `ENOTFOUND`
- Timeouts: `TimeoutError`, messages containing "timeout"
- Clerk Service Errors: `rate_limit_exceeded`, `service_unavailable`, `internal_server_error`

### 2. Updated Invitations Route (`src/app/api/invitations/route.ts`)

**POST /api/invitations** - Create Invitation:
- Wrapped `clerk.invitations.createInvitation()` in try-catch
- Service errors → 503 Service Unavailable
- Specific errors → Appropriate status codes (409 for duplicates)
- Generic errors → 500 Internal Server Error

**GET /api/invitations** - List Invitations:
- Wrapped `clerk.invitations.getInvitationList()` in try-catch
- Service errors → 503 Service Unavailable
- Generic errors → 500 Internal Server Error

### 3. Updated Individual Invitation Route (`src/app/api/invitations/[invitationId]/route.ts`)

**GET /api/invitations/[invitationId]** - Get Invitation:
- Wrapped `clerk.invitations.getInvitationList()` in try-catch
- Service errors → 503 Service Unavailable
- Not found → 404 Not Found
- Generic errors → 500 Internal Server Error

**DELETE /api/invitations/[invitationId]** - Revoke Invitation:
- Wrapped `clerk.invitations.revokeInvitation()` in try-catch
- Service errors → 503 Service Unavailable
- Not found → 404 Not Found
- Already accepted → 400 Bad Request
- Generic errors → 500 Internal Server Error

## Error Response Examples

### Service Unavailable (503)
```json
{
  "success": false,
  "error": "User management service temporarily unavailable. Please try again later.",
  "code": "AUTH_SERVICE_UNAVAILABLE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Application Errors (400/404/409)
```json
{
  "success": false,
  "error": "An invitation for this email already exists or user is already registered",
  "code": "DUPLICATE_RECORD",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Benefits

1. **Improved Reliability**: Distinguishes between service outages and application errors
2. **Better UX**: Clients can retry 503 errors but not 400/404 errors
3. **Monitoring**: Clear error categorization for observability
4. **Consistency**: Same error handling pattern across all Clerk API calls
5. **Graceful Degradation**: Application remains functional during temporary service issues

## Error Handling Flow

```
Clerk API Call
    ↓
Network/Service Error? → 503 Service Unavailable
    ↓
Clerk API Error? → Check error code
    ↓
Application Error → Appropriate status (400/404/409)
    ↓
Unknown Error → 500 Internal Server Error
```

## Testing Service Errors

To test the 503 responses, you can:
1. Temporarily disable network connectivity
2. Set invalid Clerk credentials
3. Use network throttling tools
4. Mock Clerk SDK to throw network errors

The error handling ensures robust operation even when Clerk services experience temporary issues.