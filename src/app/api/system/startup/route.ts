import { NextRequest, NextResponse } from 'next/server';
import { ensureApplicationInitialized } from '@/lib/startup';

/**
 * API endpoint for full application startup initialization
 * This runs in Node.js runtime where all dependencies are available
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[STARTUP-API] Full startup initialization requested...');
    
    const result = await ensureApplicationInitialized();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Application startup completed successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Application startup completed with errors',
        data: result,
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }
  } catch (error) {
    console.error('[STARTUP-API] Startup error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Startup initialization failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check startup status
 */
export async function GET() {
  try {
    // Import the startup module dynamically to avoid Edge Runtime issues
    const { getStartupStatus } = await import('@/lib/startup');
    
    const status = getStartupStatus();
    
    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[STARTUP-API] Status check error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Unable to check startup status',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
