# Rate Limiting Environment Variable Validation

## Overview
The invitations API now includes comprehensive validation for rate limiting environment variables with safe fallbacks.

## Environment Variables Validated

### MAX_INVITATIONS_PER_MINUTE
- **Default**: 5
- **Range**: 1-100
- **Validation**: Must be a positive integer
- **Fallback**: Uses default if invalid, logs warning

### MAX_INVITATIONS_PER_HOUR  
- **Default**: 20
- **Range**: 1-1000
- **Validation**: Must be a positive integer
- **Fallback**: Uses default if invalid, logs warning

## Validation Examples

### Valid Configuration
```env
MAX_INVITATIONS_PER_MINUTE=10
MAX_INVITATIONS_PER_HOUR=50
```
✅ No warnings, uses specified values

### Invalid Values - Uses Safe Defaults
```env
MAX_INVITATIONS_PER_MINUTE=abc
MAX_INVITATIONS_PER_HOUR=-5
```
⚠️ Logs warnings:
- `Invalid MAX_INVITATIONS_PER_MINUTE: "abc" is not a valid number. Using default: 5`
- `MAX_INVITATIONS_PER_HOUR: -5 is too low (minimum: 1). Using minimum: 1`

### Out of Bounds - Clamped to Safe Range
```env
MAX_INVITATIONS_PER_MINUTE=200
MAX_INVITATIONS_PER_HOUR=2000
```
⚠️ Logs warnings:
- `MAX_INVITATIONS_PER_MINUTE: 200 is too high (maximum: 100). Using maximum: 100`
- `MAX_INVITATIONS_PER_HOUR: 2000 is too high (maximum: 1000). Using maximum: 1000`

### Logical Inconsistency Detection
```env
MAX_INVITATIONS_PER_MINUTE=50
MAX_INVITATIONS_PER_HOUR=30
```
⚠️ Logs warning:
- `Rate limit configuration issue: 50/minute * 60 = 3000/hour exceeds 30/hour limit. Consider adjusting the values.`

## API Response Integration

Successful invitation creation now includes validation status:

```json
{
  "success": true,
  "data": {
    "invitation": { ... },
    "rateLimiting": {
      "remaining": 4,
      "hourlyRemaining": 19,
      "resetTime": 1642123456,
      "backend": "memory",
      "configValid": true,
      "configWarnings": [
        "Rate limit configuration issue: 50/minute * 60 = 3000/hour exceeds 30/hour limit."
      ]
    }
  }
}
```

## Headers Added

- `X-RateLimit-Config-Valid`: "true" or "false"
- `X-RateLimit-Backend`: "redis", "memory", or "disabled"

## Benefits

1. **Safety**: Invalid configurations don't crash the application
2. **Observability**: Warnings logged for debugging
3. **Bounds Checking**: Prevents extremely high/low values
4. **Logic Validation**: Detects inconsistent minute/hour relationships
5. **Graceful Degradation**: Always falls back to safe defaults