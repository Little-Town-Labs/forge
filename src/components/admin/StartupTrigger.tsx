'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface StartupResult {
  success: boolean;
  message: string;
  data?: unknown;
  timestamp: string;
}

interface StartupTriggerProps {
  className?: string;
}

export function StartupTrigger({ className }: StartupTriggerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<StartupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerStartup = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/system/startup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Startup failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/system/startup');
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
        setError(null);
      } else {
        setError(data.error || 'Status check failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex gap-2">
        <Button
          onClick={triggerStartup}
          disabled={isRunning}
          variant="default"
        >
          {isRunning ? 'Running Startup...' : 'Trigger Full Startup'}
        </Button>
        
        <Button
          onClick={checkStatus}
          variant="outline"
        >
          Check Status
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 font-medium">Error:</p>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800 font-medium">Startup Result:</p>
          <pre className="text-sm text-green-700 mt-2 overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
