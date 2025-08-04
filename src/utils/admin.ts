/**
 * Admin utility functions for managing user permissions and access control
 * 
 * This module provides a simple email-based admin system that can be easily
 * upgraded to role-based permissions in the future.
 */

// Security constants
const MAX_ADMIN_EMAILS = 10; // Limit to prevent DoS attacks
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const MAX_EMAIL_LENGTH = 254; // RFC 5321 standard

/**
 * Validate email format using RFC 5322 compliant regex
 * @param email - Email address to validate
 * @returns True if email format is valid
 */
function isValidEmailFormat(email: string): boolean {
  if (!email || email.length > MAX_EMAIL_LENGTH) {
    return false;
  }
  
  return EMAIL_REGEX.test(email);
}

/**
 * Get the list of admin emails from environment variables with validation and security limits
 * @returns Array of validated admin email addresses
 */
export function getAdminEmails(): string[] {
  const adminEmailsEnv = process.env.ADMIN_EMAILS;
  
  if (!adminEmailsEnv) {
    console.warn('ADMIN_EMAILS environment variable not set');
    return [];
  }
  
  // Prevent extremely long environment variable values (DoS protection)
  if (adminEmailsEnv.length > 5000) {
    console.error('ADMIN_EMAILS environment variable is too long, ignoring for security');
    return [];
  }
  
  // Split by comma, trim whitespace, and filter out empty strings
  const emailList = adminEmailsEnv
    .split(',')
    .map(email => email.trim())
    .filter(email => email.length > 0);
  
  // Limit number of admin emails to prevent DoS attacks
  if (emailList.length > MAX_ADMIN_EMAILS) {
    console.warn(`Too many admin emails configured (${emailList.length}), limiting to first ${MAX_ADMIN_EMAILS} for security`);
    emailList.splice(MAX_ADMIN_EMAILS);
  }
  
  // Validate email formats and filter out invalid ones
  const validEmails = emailList.filter(email => {
    if (!isValidEmailFormat(email)) {
      console.warn(`Invalid admin email format detected and ignored: ${email}`);
      return false;
    }
    return true;
  });
  
  // Remove duplicates (case-insensitive)
  const uniqueEmails = validEmails.filter((email, index, array) => {
    return array.findIndex(e => e.toLowerCase() === email.toLowerCase()) === index;
  });
  
  if (uniqueEmails.length !== validEmails.length) {
    console.warn('Duplicate admin emails detected and removed');
  }
  
  return uniqueEmails;
}

/**
 * Check if a user email is in the admin allowlist
 * Uses case-insensitive comparison to match the duplicate removal logic
 * @param userEmail - The email address to check
 * @returns True if the user is an admin, false otherwise
 */
export function isAdmin(userEmail: string | null | undefined): boolean {
  if (!userEmail) {
    return false;
  }
  
  const adminEmails = getAdminEmails();
  
  // Case-insensitive comparison to match the duplicate removal logic
  return adminEmails.some(adminEmail => adminEmail.toLowerCase() === userEmail.toLowerCase());
}

/**
 * Require admin privileges or throw an error
 * Use this in API routes to ensure only admins can access certain endpoints
 * @param userEmail - The email address to check
 * @throws Error if the user is not an admin
 */
export function requireAdmin(userEmail: string | null | undefined): void {
  if (!isAdmin(userEmail)) {
    throw new Error('Admin privileges required');
  }
}

/**
 * Validate admin configuration and check for potential security issues
 * @returns Object with validation results and any issues found
 */
export function validateAdminConfig(): {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  adminCount: number;
  maxAdminEmails: number;
} {
  const issues: string[] = [];
  const warnings: string[] = [];
  const adminEmails = getAdminEmails();
  const rawEnvValue = process.env.ADMIN_EMAILS;
  
  if (adminEmails.length === 0) {
    if (!rawEnvValue) {
      issues.push('No admin emails configured in ADMIN_EMAILS environment variable');
    } else {
      issues.push('No valid admin emails found after validation');
    }
  }
  
  // Check if environment variable is too long (security check)
  if (rawEnvValue && rawEnvValue.length > 5000) {
    issues.push('ADMIN_EMAILS environment variable is too long (potential DoS attack)');
  }
  
  // Check if we hit the maximum limit
  if (rawEnvValue) {
    const rawEmailCount = rawEnvValue.split(',').filter(e => e.trim().length > 0).length;
    if (rawEmailCount > MAX_ADMIN_EMAILS) {
      warnings.push(`Admin email count (${rawEmailCount}) exceeds security limit (${MAX_ADMIN_EMAILS}), some emails were ignored`);
    }
  }
  
  // Check for security best practices
  if (adminEmails.length === 1) {
    warnings.push('Only one admin email configured - consider adding a backup admin for redundancy');
  }
  
  if (adminEmails.length > 5) {
    warnings.push('Large number of admin emails configured - ensure this is intentional for security');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    adminCount: adminEmails.length,
    maxAdminEmails: MAX_ADMIN_EMAILS
  };
}

/**
 * Get admin status information for debugging/logging
 * @param userEmail - The email address to check
 * @returns Object with admin status and configuration info
 */
export function getAdminInfo(userEmail: string | null | undefined): {
  userEmail: string | null;
  isAdmin: boolean;
  totalAdmins: number;
  configValid: boolean;
} {
  const validation = validateAdminConfig();
  
  return {
    userEmail: userEmail || null,
    isAdmin: isAdmin(userEmail),
    totalAdmins: validation.adminCount,
    configValid: validation.isValid
  };
}