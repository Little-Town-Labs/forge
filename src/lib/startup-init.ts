/**
 * Startup initialization script
 * 
 * This module handles the initial startup sequence and sets global variables
 * that can be used throughout the application lifecycle.
 */

declare global {
  var startTime: number;
}

/**
 * Initialize global startup variables
 */
export function initializeStartupGlobals(): void {
  if (!global.startTime) {
    global.startTime = Date.now();
    console.log('[STARTUP-INIT] Global startup time initialized');
  }
}

/**
 * Get application uptime in milliseconds
 */
export function getUptime(): number {
  if (!global.startTime) {
    return 0;
  }
  return Date.now() - global.startTime;
}

/**
 * Get application uptime in seconds
 */
export function getUptimeSeconds(): number {
  return Math.floor(getUptime() / 1000);
}
