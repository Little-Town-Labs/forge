'use client';

import { useState, useEffect } from 'react';
import { isAdmin } from '../utils/admin';

interface UseAdminStatusReturn {
  isAdmin: boolean;
  userEmail: string | null;
  isLoading: boolean;
  error: string | null;
}

export const useAdminStatus = (): UseAdminStatusReturn => {
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get user email from localStorage or session storage
        // This assumes the user email is stored during authentication
        const storedEmail = localStorage.getItem('user-email') || 
                           sessionStorage.getItem('user-email') ||
                           null;

        setUserEmail(storedEmail);

        // Check if user is admin using the utility function
        const adminStatus = isAdmin(storedEmail);
        setIsAdminUser(adminStatus);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check admin status');
        console.error('Error checking admin status:', err);
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
  }, []);

  return {
    isAdmin: isAdminUser,
    userEmail,
    isLoading,
    error,
  };
};
