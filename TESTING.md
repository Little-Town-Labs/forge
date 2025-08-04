# Forge Testing Guide

This comprehensive testing guide covers all aspects of verifying authentication flows, protected routes, and application functionality for the Forge AI-powered knowledge base chat application.

## Overview

This guide provides systematic testing procedures to ensure:
- Authentication flows work correctly
- Protected routes are properly secured
- Admin functionality operates as expected
- Error boundaries handle failures gracefully
- Loading states provide good user experience

## Authentication Flow Testing

### 1. Unauthenticated User Experience

#### Landing Page Access
- [ ] **Test**: Visit the root URL `/`
- [ ] **Expected**: Landing page loads with welcome message and sign-in options
- [ ] **Expected**: "Get started" or similar call-to-action button visible
- [ ] **Expected**: No authenticated user content visible

#### Sign-In Flow
- [ ] **Test**: Click sign-in button/link
- [ ] **Expected**: Clerk sign-in modal or page opens
- [ ] **Expected**: Email/password and social login options available
- [ ] **Expected**: Sign-up option available for new users

#### Sign-Up Flow
- [ ] **Test**: Create new account through sign-up flow
- [ ] **Expected**: Email verification process works
- [ ] **Expected**: Account creation completes successfully
- [ ] **Expected**: User redirected to appropriate page after verification

#### Social Authentication (if configured)
- [ ] **Test**: Attempt social login (Google, GitHub, etc.)
- [ ] **Expected**: OAuth flow completes successfully
- [ ] **Expected**: User account created or signed in
- [ ] **Expected**: Proper redirect after authentication

### 2. Authenticated User Experience

#### Successful Authentication
- [ ] **Test**: Complete sign-in process
- [ ] **Expected**: User redirected to chat interface (`/chat`)
- [ ] **Expected**: User profile information visible in header
- [ ] **Expected**: Navigation reflects authenticated state

#### Session Persistence
- [ ] **Test**: Refresh page after authentication
- [ ] **Expected**: User remains signed in
- [ ] **Expected**: No re-authentication required
- [ ] **Expected**: User data persists across page loads

#### Chat Access
- [ ] **Test**: Navigate to `/chat` while authenticated
- [ ] **Expected**: Chat interface loads successfully
- [ ] **Expected**: Welcome message appears
- [ ] **Expected**: Message input is functional

#### Sign-Out Process
- [ ] **Test**: Click sign-out button/option
- [ ] **Expected**: User successfully signed out
- [ ] **Expected**: Redirected to landing page
- [ ] **Expected**: Authenticated content no longer accessible

### 3. Session Management

#### Session Timeout
- [ ] **Test**: Leave application idle for extended period
- [ ] **Expected**: Session expires appropriately
- [ ] **Expected**: User prompted to re-authenticate
- [ ] **Expected**: Graceful handling of expired sessions

#### Multiple Tab Behavior
- [ ] **Test**: Open application in multiple browser tabs
- [ ] **Expected**: Authentication state syncs across tabs
- [ ] **Expected**: Sign-out in one tab affects all tabs
- [ ] **Expected**: No authentication conflicts

## Protected Route Testing

### 1. Chat Route Protection (`/chat`)

#### Unauthenticated Access Attempt
- [ ] **Test**: Navigate to `/chat` without authentication
- [ ] **Expected**: Redirected to sign-in page
- [ ] **Expected**: URL preservation for post-login redirect
- [ ] **Expected**: Clear messaging about authentication requirement

#### Authenticated Access
- [ ] **Test**: Access `/chat` while authenticated
- [ ] **Expected**: Chat interface loads successfully
- [ ] **Expected**: All chat functionality available
- [ ] **Expected**: Context panel accessible

#### Direct URL Access
- [ ] **Test**: Directly enter `/chat` URL in browser (unauthenticated)
- [ ] **Expected**: Proper redirect to authentication
- [ ] **Expected**: Return to `/chat` after successful authentication

### 2. Admin Route Protection (`/admin`)

#### Non-Admin User Access
- [ ] **Test**: Access `/admin` as regular authenticated user
- [ ] **Expected**: Access denied with appropriate error message
- [ ] **Expected**: Redirect to safe page (home or chat)
- [ ] **Expected**: No admin functionality exposed

#### Admin User Access
- [ ] **Test**: Access `/admin` as configured admin user
- [ ] **Expected**: Admin dashboard loads successfully
- [ ] **Expected**: Admin functionality available
- [ ] **Expected**: Admin-specific navigation visible

#### Admin Nested Routes
- [ ] **Test**: Access `/admin/invitations` as admin
- [ ] **Expected**: Invitation management interface loads
- [ ] **Expected**: Full admin functionality available

#### Admin Routes While Unauthenticated
- [ ] **Test**: Access `/admin` without authentication
- [ ] **Expected**: Redirected to sign-in page
- [ ] **Expected**: Still requires admin verification after authentication

### 3. API Route Protection

#### Chat API (`/api/chat`)
- [ ] **Test**: Send POST request without authentication
- [ ] **Expected**: 401 Unauthorized response
- [ ] **Test**: Send authenticated request
- [ ] **Expected**: Streaming chat response

#### Context API (`/api/context`)
- [ ] **Test**: Send POST request without authentication
- [ ] **Expected**: 401 Unauthorized response
- [ ] **Test**: Send authenticated request
- [ ] **Expected**: Context search results

#### Crawl API (`/api/crawl`)
- [ ] **Test**: Send POST request without authentication
- [ ] **Expected**: 401 Unauthorized response
- [ ] **Test**: Send authenticated request
- [ ] **Expected**: URL crawling initiated

#### Invitations API (`/api/invitations`)
- [ ] **Test**: Send request without authentication
- [ ] **Expected**: 401 Unauthorized response
- [ ] **Test**: Send request as non-admin
- [ ] **Expected**: 403 Forbidden response
- [ ] **Test**: Send request as admin
- [ ] **Expected**: Invitation operations succeed

## Admin Functionality Testing

### 1. Admin User Identification

#### Admin Email Configuration
- [ ] **Test**: Verify admin emails configured in `ADMIN_EMAILS`
- [ ] **Expected**: Listed emails have admin access
- [ ] **Expected**: Case-insensitive matching works
- [ ] **Expected**: Unlisted emails don't have admin access

#### Admin Access Verification
- [ ] **Test**: Sign in with admin email address
- [ ] **Expected**: Admin routes become accessible
- [ ] **Expected**: Admin indicators visible in UI
- [ ] **Expected**: Admin-specific features enabled

### 2. Invitation Management

#### Create Invitations
- [ ] **Test**: Create new invitation as admin
- [ ] **Expected**: Invitation created successfully
- [ ] **Expected**: Email validation works
- [ ] **Expected**: Duplicate prevention functions

#### List Invitations
- [ ] **Test**: View pending invitations
- [ ] **Expected**: All pending invitations visible
- [ ] **Expected**: Pagination works correctly
- [ ] **Expected**: Invitation details accurate

#### Revoke Invitations
- [ ] **Test**: Revoke pending invitation
- [ ] **Expected**: Invitation successfully revoked
- [ ] **Expected**: Status updated correctly
- [ ] **Expected**: Revoked invitation no longer usable

#### Rate Limiting
- [ ] **Test**: Create invitations rapidly
- [ ] **Expected**: Rate limiting enforced
- [ ] **Expected**: Clear error messages for rate limits
- [ ] **Expected**: Retry-After headers provided

### 3. Admin Dashboard

#### Dashboard Access
- [ ] **Test**: Access admin dashboard
- [ ] **Expected**: System statistics visible
- [ ] **Expected**: Recent activity displayed
- [ ] **Expected**: Quick actions available

#### System Status
- [ ] **Test**: Verify system status indicators
- [ ] **Expected**: Service health accurately reflected
- [ ] **Expected**: Configuration validation shown
- [ ] **Expected**: Warnings for misconfigurations

## Error Boundary Testing

### 1. Global Error Boundary

#### JavaScript Errors
- [ ] **Test**: Trigger JavaScript error in component
- [ ] **Expected**: Global error boundary catches error
- [ ] **Expected**: User-friendly error page displayed
- [ ] **Expected**: Recovery options available

#### Network Errors
- [ ] **Test**: Disconnect network and interact with app
- [ ] **Expected**: Network errors handled gracefully
- [ ] **Expected**: Retry mechanisms available
- [ ] **Expected**: Clear error messaging

#### Authentication Errors
- [ ] **Test**: Cause Clerk authentication failure
- [ ] **Expected**: Authentication-specific error handling
- [ ] **Expected**: Sign-out option available
- [ ] **Expected**: Recovery instructions provided

### 2. Component-Level Error Boundaries

#### Chat Interface Errors
- [ ] **Test**: Cause error in chat component
- [ ] **Expected**: Chat-specific error boundary activates
- [ ] **Expected**: Other parts of app remain functional
- [ ] **Expected**: Chat recovery options available

#### Admin Interface Errors
- [ ] **Test**: Cause error in admin component
- [ ] **Expected**: Admin-specific error handling
- [ ] **Expected**: Navigation remains functional
- [ ] **Expected**: Clear error messaging

### 3. Service Error Handling

#### OpenAI Service Errors
- [ ] **Test**: Simulate OpenAI API failure
- [ ] **Expected**: Graceful degradation of chat
- [ ] **Expected**: User notified of service issue
- [ ] **Expected**: Retry mechanisms available

#### Pinecone Service Errors
- [ ] **Test**: Simulate Pinecone connectivity issues
- [ ] **Expected**: Fallback to demo mode
- [ ] **Expected**: User experience minimally impacted
- [ ] **Expected**: Service status communicated

#### Clerk Service Errors
- [ ] **Test**: Simulate Clerk service unavailability
- [ ] **Expected**: 503 Service Unavailable responses
- [ ] **Expected**: Retry logic activated
- [ ] **Expected**: User informed of temporary issue

## Loading State Testing

### 1. Global Loading States

#### Initial Application Load
- [ ] **Test**: Load application with slow connection
- [ ] **Expected**: Loading screen appears
- [ ] **Expected**: Progressive loading indicators
- [ ] **Expected**: Timeout handling after 10 seconds

#### Authentication Loading
- [ ] **Test**: Sign in with slow network
- [ ] **Expected**: Authentication loading state shown
- [ ] **Expected**: Process doesn't appear frozen
- [ ] **Expected**: Clear indication of progress

### 2. Route-Specific Loading

#### Chat Loading
- [ ] **Test**: Navigate to `/chat`
- [ ] **Expected**: Chat-specific loading skeleton
- [ ] **Expected**: Message interface skeleton visible
- [ ] **Expected**: Context panel loading state

#### Admin Loading
- [ ] **Test**: Navigate to `/admin`
- [ ] **Expected**: Admin dashboard skeleton
- [ ] **Expected**: Stats cards loading state
- [ ] **Expected**: Admin verification loading

### 3. Component Loading States

#### Message Sending
- [ ] **Test**: Send chat message
- [ ] **Expected**: Sending indicator appears
- [ ] **Expected**: Message shows pending state
- [ ] **Expected**: Clear transition to sent state

#### Context Loading
- [ ] **Test**: Trigger context search
- [ ] **Expected**: Context panel shows loading
- [ ] **Expected**: Search progress indicated
- [ ] **Expected**: Results appear smoothly

#### Document Crawling
- [ ] **Test**: Crawl URL for knowledge base
- [ ] **Expected**: Crawling progress shown
- [ ] **Expected**: Status updates provided
- [ ] **Expected**: Completion clearly indicated

## Manual Testing Checklist

### Pre-Testing Setup
- [ ] Environment variables properly configured
- [ ] Admin emails set up correctly
- [ ] External services (Clerk, OpenAI, Pinecone) accessible
- [ ] Application running without console errors

### User Journey Testing

#### New User Journey
1. [ ] Visit landing page
2. [ ] Click sign-up
3. [ ] Complete registration
4. [ ] Verify email
5. [ ] Access chat interface
6. [ ] Send first message
7. [ ] Use knowledge base features

#### Returning User Journey
1. [ ] Visit application
2. [ ] Sign in with existing account
3. [ ] Access previous conversations (if implemented)
4. [ ] Continue using chat features
5. [ ] Sign out

#### Admin User Journey
1. [ ] Sign in with admin account
2. [ ] Access admin dashboard
3. [ ] Create invitation
4. [ ] Manage existing invitations
5. [ ] Review system status
6. [ ] Access regular user features

### Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

### Device Testing
- [ ] Desktop (1920x1080 and higher)
- [ ] Laptop (1366x768)
- [ ] Tablet (iPad, Android tablets)
- [ ] Mobile (iPhone, Android phones)

### Performance Testing
- [ ] Page load times under 3 seconds
- [ ] Chat responses within 5 seconds
- [ ] No memory leaks during extended use
- [ ] Smooth animations and transitions

## Automated Testing Setup

### Testing Framework Overview

This section provides comprehensive setup and examples for automated testing using both **Playwright** and **Cypress** for end-to-end testing, focusing on authentication flows, protected routes, and error boundaries.

### Framework Comparison

| Feature | Playwright | Cypress |
|---------|------------|---------|
| Browser Support | Chrome, Firefox, Safari, Edge | Chrome, Firefox, Edge |
| Parallel Testing | ✅ Built-in | ✅ With CI plan |
| API Testing | ✅ Excellent | ✅ Good |
| Debugging | ✅ Excellent | ✅ Excellent |
| CI/CD Integration | ✅ Excellent | ✅ Excellent |
| Authentication Testing | ✅ Advanced | ✅ Good |

## Playwright Setup & Configuration

### 1. Installation

```bash
# Install Playwright
npm install --save-dev @playwright/test
npx playwright install

# Install additional dependencies for Clerk testing
npm install --save-dev @clerk/testing
```

### 2. Playwright Configuration

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }]
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 3. Environment Setup

Create `tests/.env.test`:

```env
# Test environment variables
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_test_key
CLERK_SECRET_KEY=sk_test_your_secret_key
OPENAI_API_KEY=sk-test-your-test-key
ADMIN_EMAILS=admin@test.com,manager@test.com
PINECONE_API_KEY=test-key
PINECONE_INDEX=forge-test
```

### 4. Playwright Test Utilities

Create `tests/utils/auth.ts`:

```typescript
import { Page } from '@playwright/test';
import { clerk } from '@clerk/testing/playwright';

export class AuthHelper {
  constructor(private page: Page) {}

  async signIn(email: string, password: string) {
    await this.page.goto('/');
    await this.page.getByTestId('sign-in-button').click();
    
    // Wait for Clerk sign-in form
    await this.page.waitForSelector('[data-clerk-element="signIn"]');
    
    // Fill in credentials
    await this.page.fill('input[name="identifier"]', email);
    await this.page.click('button[type="submit"]');
    
    // Handle password step
    await this.page.waitForSelector('input[name="password"]');
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
    
    // Wait for successful authentication
    await this.page.waitForURL('/chat');
  }

  async signInAsAdmin() {
    await clerk.loaded({ page: this.page });
    await clerk.signIn({
      page: this.page,
      signInParams: {
        strategy: 'password',
        identifier: 'admin@test.com',
        password: 'testpassword123',
      },
    });
    
    // Verify admin access
    await this.page.waitForURL('/chat');
    await this.page.goto('/admin');
    await this.page.waitForSelector('[data-testid="admin-dashboard"]');
  }

  async signOut() {
    await this.page.getByTestId('user-menu').click();
    await this.page.getByTestId('sign-out-button').click();
    await this.page.waitForURL('/');
  }

  async isSignedIn(): Promise<boolean> {
    try {
      await this.page.waitForSelector('[data-testid="user-menu"]', { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
}
```

### 5. Authentication Flow Tests

Create `tests/e2e/auth.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth';

test.describe('Authentication Flows', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test('should display landing page for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    
    // Check landing page elements
    await expect(page.getByRole('heading', { name: /forge/i })).toBeVisible();
    await expect(page.getByTestId('sign-in-button')).toBeVisible();
    await expect(page.getByTestId('get-started-button')).toBeVisible();
    
    // Ensure no authenticated content is visible
    await expect(page.getByTestId('user-menu')).not.toBeVisible();
  });

  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    // Try to access chat page without authentication
    await page.goto('/chat');
    
    // Should be redirected to sign-in
    await expect(page).toHaveURL(/.*sign-in.*/);
    
    // Try to access admin page
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*sign-in.*/);
  });

  test('should complete sign-in flow successfully', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('sign-in-button').click();
    
    // Clerk sign-in form should appear
    await expect(page.locator('[data-clerk-element="signIn"]')).toBeVisible();
    
    // Mock successful authentication
    await authHelper.signIn('test@example.com', 'password123');
    
    // Should redirect to chat
    await expect(page).toHaveURL('/chat');
    await expect(page.getByTestId('chat-interface')).toBeVisible();
    await expect(page.getByTestId('user-menu')).toBeVisible();
  });

  test('should handle sign-in errors gracefully', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('sign-in-button').click();
    
    // Try invalid credentials
    await page.fill('input[name="identifier"]', 'invalid@email.com');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('[data-clerk-element="formFieldError"]')).toBeVisible();
  });

  test('should maintain session across page reloads', async ({ page }) => {
    // Sign in first
    await authHelper.signIn('test@example.com', 'password123');
    
    // Reload page
    await page.reload();
    
    // Should still be authenticated
    expect(await authHelper.isSignedIn()).toBe(true);
    await expect(page.getByTestId('user-menu')).toBeVisible();
  });

  test('should sign out successfully', async ({ page }) => {
    // Sign in first
    await authHelper.signIn('test@example.com', 'password123');
    
    // Sign out
    await authHelper.signOut();
    
    // Should be redirected to landing page
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('sign-in-button')).toBeVisible();
    expect(await authHelper.isSignedIn()).toBe(false);
  });

  test('should handle session timeout gracefully', async ({ page }) => {
    // Sign in
    await authHelper.signIn('test@example.com', 'password123');
    
    // Mock session expiration by clearing cookies
    await page.context().clearCookies();
    
    // Try to access protected route
    await page.goto('/chat');
    
    // Should be redirected to sign-in
    await expect(page).toHaveURL(/.*sign-in.*/);
  });
});
```

### 6. Protected Routes Tests

Create `tests/e2e/protected-routes.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth';

test.describe('Protected Routes', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test.describe('Chat Route Protection', () => {
    test('should block unauthenticated access to chat', async ({ page }) => {
      await page.goto('/chat');
      
      // Should redirect to sign-in
      await expect(page).toHaveURL(/.*sign-in.*/);
    });

    test('should allow authenticated access to chat', async ({ page }) => {
      await authHelper.signIn('test@example.com', 'password123');
      await page.goto('/chat');
      
      // Should access chat successfully
      await expect(page).toHaveURL('/chat');
      await expect(page.getByTestId('chat-interface')).toBeVisible();
      await expect(page.getByTestId('message-input')).toBeVisible();
      await expect(page.getByTestId('context-panel')).toBeVisible();
    });

    test('should preserve chat URL after authentication', async ({ page }) => {
      // Try to access chat without auth
      await page.goto('/chat');
      await expect(page).toHaveURL(/.*sign-in.*/);
      
      // Sign in
      await authHelper.signIn('test@example.com', 'password123');
      
      // Should return to chat
      await expect(page).toHaveURL('/chat');
    });
  });

  test.describe('Admin Route Protection', () => {
    test('should block non-admin users from admin routes', async ({ page }) => {
      // Sign in as regular user
      await authHelper.signIn('user@example.com', 'password123');
      
      // Try to access admin
      await page.goto('/admin');
      
      // Should be denied access
      await expect(page.getByText(/access denied/i)).toBeVisible();
      // Or redirected to safe page
      await expect(page).toHaveURL(/\/(chat|$)/);
    });

    test('should allow admin users to access admin routes', async ({ page }) => {
      // Sign in as admin
      await authHelper.signInAsAdmin();
      
      // Should access admin successfully
      await expect(page).toHaveURL('/admin');
      await expect(page.getByTestId('admin-dashboard')).toBeVisible();
      await expect(page.getByTestId('admin-navigation')).toBeVisible();
    });

    test('should protect admin nested routes', async ({ page }) => {
      // Test without admin access
      await authHelper.signIn('user@example.com', 'password123');
      await page.goto('/admin/invitations');
      
      // Should be denied
      await expect(page).not.toHaveURL('/admin/invitations');
      
      // Test with admin access
      await authHelper.signInAsAdmin();
      await page.goto('/admin/invitations');
      
      // Should access successfully
      await expect(page).toHaveURL('/admin/invitations');
      await expect(page.getByTestId('invitations-interface')).toBeVisible();
    });
  });

  test.describe('API Route Protection', () => {
    test('should protect chat API from unauthenticated requests', async ({ page }) => {
      const response = await page.request.post('/api/chat', {
        data: { message: 'Hello' }
      });
      
      expect(response.status()).toBe(401);
    });

    test('should allow authenticated requests to chat API', async ({ page }) => {
      await authHelper.signIn('test@example.com', 'password123');
      
      const response = await page.request.post('/api/chat', {
        data: { message: 'Hello' }
      });
      
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('text/plain');
    });

    test('should protect admin API from non-admin users', async ({ page }) => {
      await authHelper.signIn('user@example.com', 'password123');
      
      const response = await page.request.post('/api/invitations', {
        data: { email: 'test@example.com' }
      });
      
      expect(response.status()).toBe(403);
    });

    test('should allow admin API access for admin users', async ({ page }) => {
      await authHelper.signInAsAdmin();
      
      const response = await page.request.post('/api/invitations', {
        data: { email: 'newuser@example.com' }
      });
      
      expect(response.status()).toBe(200);
    });
  });
});
```

### 7. Error Boundary Tests

Create `tests/e2e/error-boundaries.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth';

test.describe('Error Boundaries', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test('should catch and display global errors', async ({ page }) => {
    await authHelper.signIn('test@example.com', 'password123');
    
    // Inject JavaScript error
    await page.evaluate(() => {
      // Create a component that will throw an error
      const errorButton = document.createElement('button');
      errorButton.id = 'error-trigger';
      errorButton.onclick = () => {
        throw new Error('Test error for boundary');
      };
      document.body.appendChild(errorButton);
    });
    
    // Trigger the error
    await page.click('#error-trigger');
    
    // Should show error boundary UI
    await expect(page.getByTestId('error-boundary')).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).toBeVisible();
    await expect(page.getByTestId('error-retry-button')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await authHelper.signIn('test@example.com', 'password123');
    await page.goto('/chat');
    
    // Simulate network failure
    await page.route('/api/chat', route => {
      route.abort('failed');
    });
    
    // Try to send a message
    await page.fill('[data-testid="message-input"]', 'Test message');
    await page.click('[data-testid="send-button"]');
    
    // Should show network error
    await expect(page.getByText(/connection error/i)).toBeVisible();
    await expect(page.getByTestId('retry-button')).toBeVisible();
  });

  test('should handle authentication errors', async ({ page }) => {
    await page.goto('/');
    
    // Mock Clerk service failure
    await page.route('**/clerk.com/**', route => {
      route.abort('failed');
    });
    
    await page.getByTestId('sign-in-button').click();
    
    // Should show authentication error
    await expect(page.getByText(/authentication error/i)).toBeVisible();
    await expect(page.getByTestId('error-retry-button')).toBeVisible();
  });

  test('should provide error recovery options', async ({ page }) => {
    await authHelper.signIn('test@example.com', 'password123');
    
    // Trigger error
    await page.evaluate(() => {
      throw new Error('Recovery test error');
    });
    
    // Should show error boundary
    await expect(page.getByTestId('error-boundary')).toBeVisible();
    
    // Test retry functionality
    await page.click('[data-testid="error-retry-button"]');
    
    // Should attempt to recover
    await expect(page.getByTestId('chat-interface')).toBeVisible();
  });

  test('should isolate component errors', async ({ page }) => {
    await authHelper.signIn('test@example.com', 'password123');
    await page.goto('/chat');
    
    // Mock error in context panel only
    await page.evaluate(() => {
      // Simulate context panel error
      const contextPanel = document.querySelector('[data-testid="context-panel"]');
      if (contextPanel) {
        contextPanel.innerHTML = '<div data-testid="context-error">Context Error</div>';
      }
    });
    
    // Context panel should show error
    await expect(page.getByTestId('context-error')).toBeVisible();
    
    // But chat interface should still work
    await expect(page.getByTestId('message-input')).toBeVisible();
    await page.fill('[data-testid="message-input"]', 'Test message');
    await page.click('[data-testid="send-button"]');
  });

  test('should handle service-specific errors', async ({ page }) => {
    await authHelper.signIn('test@example.com', 'password123');
    await page.goto('/chat');
    
    // Mock OpenAI service error
    await page.route('/api/chat', route => {
      route.fulfill({
        status: 503,
        body: JSON.stringify({ error: 'OpenAI service unavailable' })
      });
    });
    
    // Try to send message
    await page.fill('[data-testid="message-input"]', 'Test message');
    await page.click('[data-testid="send-button"]');
    
    // Should show service-specific error
    await expect(page.getByText(/ai service.*unavailable/i)).toBeVisible();
    await expect(page.getByTestId('service-retry-button')).toBeVisible();
  });
});
```

## Cypress Setup & Configuration

### 1. Installation

```bash
# Install Cypress
npm install --save-dev cypress
npm install --save-dev @cypress/code-coverage
npm install --save-dev @testing-library/cypress

# Open Cypress for initial setup
npx cypress open
```

### 2. Cypress Configuration

Create `cypress.config.ts`:

```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    chromeWebSecurity: false,
    setupNodeEvents(on, config) {
      // implement node event listeners here
      require('@cypress/code-coverage/task')(on, config);
      return config;
    },
  },
  env: {
    CLERK_PUBLISHABLE_KEY: 'pk_test_your_test_key',
    TEST_USER_EMAIL: 'test@example.com',
    TEST_USER_PASSWORD: 'password123',
    ADMIN_EMAIL: 'admin@test.com',
    ADMIN_PASSWORD: 'adminpassword123',
  },
});
```

### 3. Cypress Support Files

Create `cypress/support/commands.ts`:

```typescript
import '@testing-library/cypress/add-commands';

// Custom commands for authentication
Cypress.Commands.add('signIn', (email?: string, password?: string) => {
  const userEmail = email || Cypress.env('TEST_USER_EMAIL');
  const userPassword = password || Cypress.env('TEST_USER_PASSWORD');
  
  cy.visit('/');
  cy.get('[data-testid="sign-in-button"]').click();
  
  // Wait for Clerk form
  cy.get('[data-clerk-element="signIn"]').should('be.visible');
  
  // Fill credentials
  cy.get('input[name="identifier"]').type(userEmail);
  cy.get('button[type="submit"]').click();
  
  // Handle password step
  cy.get('input[name="password"]').should('be.visible');
  cy.get('input[name="password"]').type(userPassword);
  cy.get('button[type="submit"]').click();
  
  // Verify successful sign-in
  cy.url().should('include', '/chat');
  cy.get('[data-testid="user-menu"]').should('be.visible');
});

Cypress.Commands.add('signInAsAdmin', () => {
  cy.signIn(Cypress.env('ADMIN_EMAIL'), Cypress.env('ADMIN_PASSWORD'));
  cy.visit('/admin');
  cy.get('[data-testid="admin-dashboard"]').should('be.visible');
});

Cypress.Commands.add('signOut', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="sign-out-button"]').click();
  cy.url().should('eq', Cypress.config().baseUrl + '/');
});

// Declare custom commands for TypeScript
declare global {
  namespace Cypress {
    interface Chainable {
      signIn(email?: string, password?: string): Chainable<void>;
      signInAsAdmin(): Chainable<void>;
      signOut(): Chainable<void>;
    }
  }
}
```

### 4. Cypress Authentication Tests

Create `cypress/e2e/auth.cy.ts`:

```typescript
describe('Authentication Flows', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('should display landing page for unauthenticated users', () => {
    cy.visit('/');
    
    cy.get('h1').should('contain', 'Forge');
    cy.get('[data-testid="sign-in-button"]').should('be.visible');
    cy.get('[data-testid="get-started-button"]').should('be.visible');
    cy.get('[data-testid="user-menu"]').should('not.exist');
  });

  it('should redirect unauthenticated users from protected routes', () => {
    cy.visit('/chat');
    cy.url().should('include', 'sign-in');
    
    cy.visit('/admin');
    cy.url().should('include', 'sign-in');
  });

  it('should complete sign-in flow successfully', () => {
    cy.signIn();
    
    cy.url().should('include', '/chat');
    cy.get('[data-testid="chat-interface"]').should('be.visible');
    cy.get('[data-testid="user-menu"]').should('be.visible');
  });

  it('should handle invalid credentials', () => {
    cy.visit('/');
    cy.get('[data-testid="sign-in-button"]').click();
    
    cy.get('input[name="identifier"]').type('invalid@email.com');
    cy.get('button[type="submit"]').click();
    
    // Should show error
    cy.get('[data-clerk-element="formFieldError"]').should('be.visible');
  });

  it('should maintain session across page reloads', () => {
    cy.signIn();
    cy.reload();
    
    cy.get('[data-testid="user-menu"]').should('be.visible');
    cy.url().should('include', '/chat');
  });

  it('should sign out successfully', () => {
    cy.signIn();
    cy.signOut();
    
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    cy.get('[data-testid="sign-in-button"]').should('be.visible');
  });
});
```

### 5. Cypress Protected Routes Tests

Create `cypress/e2e/protected-routes.cy.ts`:

```typescript
describe('Protected Routes', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  describe('Chat Route Protection', () => {
    it('should block unauthenticated access', () => {
      cy.visit('/chat');
      cy.url().should('include', 'sign-in');
    });

    it('should allow authenticated access', () => {
      cy.signIn();
      cy.visit('/chat');
      
      cy.url().should('include', '/chat');
      cy.get('[data-testid="chat-interface"]').should('be.visible');
      cy.get('[data-testid="message-input"]').should('be.visible');
    });
  });

  describe('Admin Route Protection', () => {
    it('should block non-admin users', () => {
      cy.signIn();
      cy.visit('/admin');
      
      // Should show access denied or redirect
      cy.get('body').should('contain.text', 'Access denied').or(() => {
        cy.url().should('not.include', '/admin');
      });
    });

    it('should allow admin users', () => {
      cy.signInAsAdmin();
      
      cy.url().should('include', '/admin');
      cy.get('[data-testid="admin-dashboard"]').should('be.visible');
    });
  });

  describe('API Route Protection', () => {
    it('should protect chat API from unauthenticated requests', () => {
      cy.request({
        method: 'POST',
        url: '/api/chat',
        body: { message: 'Hello' },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });

    it('should allow authenticated API requests', () => {
      cy.signIn();
      
      cy.request({
        method: 'POST',
        url: '/api/chat',
        body: { message: 'Hello' }
      }).then((response) => {
        expect(response.status).to.eq(200);
      });
    });
  });
});
```

### 6. Test Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:cypress": "cypress run",
    "test:cypress:open": "cypress open",
    "test:all": "npm run test:unit && npm run test:e2e && npm run test:cypress"
  }
}
```

### 7. CI/CD Integration

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  playwright-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
        working-directory: ./forge
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
        working-directory: ./forge
      
      - name: Run Playwright tests
        run: npm run test:e2e
        working-directory: ./forge
        env:
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_TEST_PK }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_TEST_SK }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_TEST_KEY }}
          ADMIN_EMAILS: admin@test.com
      
      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: forge/playwright-report/
          retention-days: 30

  cypress-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
        working-directory: ./forge
      
      - name: Run Cypress tests
        uses: cypress-io/github-action@v6
        with:
          working-directory: ./forge
          start: npm run dev
          wait-on: 'http://localhost:3000'
          browser: chrome
        env:
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_TEST_PK }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_TEST_SK }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_TEST_KEY }}
```

### Key Test Scenarios Automated

1. **Authentication Flows**
   - User sign-up and email verification
   - Sign-in with email/password
   - Social authentication flows
   - Sign-out functionality
   - Session persistence and timeout

2. **Protected Route Access** 
   - Unauthenticated redirect behavior
   - Authenticated user access
   - Admin-only route protection
   - URL preservation after auth

3. **Admin Functionality**
   - Admin user identification
   - Invitation CRUD operations
   - Rate limiting enforcement
   - Admin dashboard access

4. **API Endpoint Security**
   - Authentication requirement verification
   - Authorization level checking
   - Error response validation
   - Rate limiting behavior

5. **Error Boundary Activation**
   - JavaScript error handling
   - Network failure recovery
   - Service unavailability handling
   - Component isolation testing

### Testing Best Practices

1. **Test Data Management**
   - Use dedicated test environment
   - Clean up test data after runs
   - Use realistic test scenarios
   - Mock external services when appropriate

2. **Test Reliability**
   - Add proper wait conditions
   - Handle async operations correctly
   - Use stable selectors (data-testid)
   - Implement retry logic for flaky tests

3. **Performance Considerations**
   - Run tests in parallel when possible
   - Use efficient selectors
   - Minimize test setup time
   - Cache dependencies in CI

### CI/CD Integration Best Practices

- Run tests on every pull request
- Block deployment if tests fail
- Generate test reports and artifacts
- Monitor test execution time and reliability
- Set up notifications for test failures

## Troubleshooting Common Issues

### Authentication Issues
**Problem**: Users can't sign in
- Check Clerk domain configuration
- Verify environment variables
- Check browser console for errors
- Test with different browsers

**Problem**: Admin access not working
- Verify admin email configuration
- Check case sensitivity
- Confirm email matches Clerk account

### Protected Route Issues
**Problem**: Redirects not working
- Check middleware configuration
- Verify route protection implementation
- Test authentication state

**Problem**: Infinite redirect loops
- Check middleware logic
- Verify redirect URL configuration
- Test with different user states

### API Issues
**Problem**: API calls failing
- Check authentication headers
- Verify CORS configuration
- Test API endpoints directly
- Check server logs

### Loading/Error State Issues
**Problem**: Loading states not showing
- Verify Suspense boundaries
- Check error boundary implementation
- Test with network throttling

## Test Environment Setup

### Local Testing
- Use test API keys where possible
- Mock external services for reliable testing
- Set up test admin accounts
- Use test data that can be safely deleted

### Staging Environment
- Mirror production configuration
- Use production-like data volumes
- Test with realistic network conditions
- Include all external service integrations

### Production Testing
- Monitor real user interactions
- Set up analytics and error tracking
- Implement health checks
- Use feature flags for gradual rollouts

## Pass/Fail Criteria

### Critical (Must Pass)
- [ ] Authentication flows work correctly
- [ ] Protected routes properly secured
- [ ] Admin functionality operates correctly
- [ ] No security vulnerabilities
- [ ] Error boundaries prevent crashes

### Important (Should Pass)
- [ ] Loading states provide good UX
- [ ] Error messages are user-friendly
- [ ] Performance meets targets
- [ ] Cross-browser compatibility
- [ ] Mobile responsiveness

### Nice to Have (Good to Pass)
- [ ] Smooth animations and transitions
- [ ] Offline functionality
- [ ] Advanced error recovery
- [ ] Performance optimizations
- [ ] Accessibility features

## Reporting Issues

When reporting issues found during testing:

1. **Environment**: Specify browser, device, OS
2. **Steps**: Provide exact reproduction steps
3. **Expected**: What should happen
4. **Actual**: What actually happened
5. **Screenshots**: Include relevant screenshots
6. **Console**: Include any console errors
7. **Impact**: Assess severity and user impact

## Testing Schedule

### Before Each Release
- Complete manual testing checklist
- Run all automated tests
- Performance testing
- Security testing
- Cross-browser testing

### Regular Testing (Weekly)
- Smoke testing of critical paths
- Admin functionality verification
- External service integration testing
- Performance monitoring review

### Comprehensive Testing (Monthly)
- Full manual testing suite
- Extended performance testing
- Security audit
- Accessibility testing
- Documentation updates

This testing guide ensures comprehensive coverage of all authentication flows, protected routes, and application functionality to maintain a high-quality user experience.