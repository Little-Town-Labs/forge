'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

interface UseAdminStatusReturn {
  isAdmin: boolean;
  userEmail: string | null;
  isLoading: boolean;
  error: string | null;
}

export const useAdminStatus = (): UseAdminStatusReturn => {
  const { user, isLoaded } = useUser();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!user) {
      setUserEmail(null);
      setIsAdminUser(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    const currentUserEmail = user?.emailAddresses?.[0]?.emailAddress || null;
    setUserEmail(currentUserEmail);

    const checkAdminStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check admin status using API endpoint
        const response = await fetch('/api/admin/status');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setIsAdminUser(data.data.isAdmin);
          } else {
            setIsAdminUser(false);
          }
        } else {
          setIsAdminUser(false);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check admin status');
        console.error('Error checking admin status:', err);
        setIsAdminUser(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();

    // Listen for authentication state changes
    const handleStorageChange = () => {
      checkAdminStatus();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check for changes in the same tab
    const interval = setInterval(checkAdminStatus, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [isLoaded, user]);

  return {
    isAdmin: isAdminUser,
    userEmail,
    isLoading,
    error,
  };
};
