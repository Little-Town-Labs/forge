"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Shield, AlertCircle } from "lucide-react";

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  showAccessDenied?: boolean;
}

/**
 * AdminGuard component - Wraps admin-only content and ensures proper access control
 * 
 * @param children - Content to render for admin users
 * @param fallback - Custom component to render for non-admin users
 * @param redirectTo - URL to redirect non-admin users to (default: "/")
 * @param showAccessDenied - Show access denied message instead of redirecting
 */
const AdminGuard: React.FC<AdminGuardProps> = ({
  children,
  fallback,
  redirectTo = "/",
  showAccessDenied = false,
}) => {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      return; // Still loading user data
    }

    if (!user) {
      setHasAccess(false);
      setIsChecking(false);
      return;
    }

    // Check admin status using API endpoint
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/admin/status');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setHasAccess(data.data.isAdmin);
          } else {
            setHasAccess(false);
          }
        } else {
          setHasAccess(false);
        }
      } catch (error) {
        console.warn('Failed to check admin status:', error);
        setHasAccess(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAdminStatus();
  }, [isLoaded, user, router, redirectTo, showAccessDenied, fallback]);

  // Handle redirect for non-admin users
  useEffect(() => {
    if (!isChecking && !hasAccess && !showAccessDenied && !fallback) {
      const userEmail = user?.emailAddresses?.[0]?.emailAddress;
      console.warn(`AdminGuard: Access denied for user ${userEmail}, redirecting to ${redirectTo}`);
      router.push(redirectTo);
    }
  }, [isChecking, hasAccess, showAccessDenied, fallback, redirectTo, router, user]);

  // Show loading state while checking authentication and admin status
  if (!isLoaded || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Verifying admin access...
          </p>
        </div>
      </div>
    );
  }

  // User is not authenticated
  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Please sign in to access this content.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  // User is authenticated but not an admin
  if (!hasAccess) {
    // Use custom fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    // Show access denied message if requested
    if (showAccessDenied) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center max-w-md px-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You don&apos;t have admin privileges to access this content.
            </p>
            <button
              onClick={() => router.push(redirectTo)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }

    // Default: return null (component will redirect via useEffect)
    return null;
  }

  // User has admin access - render children
  return <>{children}</>;
};

export default AdminGuard;

/**
 * Hook for checking admin status in components
 * @returns Object with admin status, loading state, and user info
 */
export const useAdminStatus = () => {
  const { user, isLoaded } = useUser();
  const [adminInfo, setAdminInfo] = useState({
    isAdmin: false,
    isLoading: true,
    userEmail: null as string | null,
  });

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!user) {
      setAdminInfo({
        isAdmin: false,
        isLoading: false,
        userEmail: null,
      });
      return;
    }

    const userEmail = user?.emailAddresses?.[0]?.emailAddress || null;
    
    // Check admin status using API endpoint
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/admin/status');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setAdminInfo({
              isAdmin: data.data.isAdmin,
              isLoading: false,
              userEmail,
            });
          } else {
            setAdminInfo({
              isAdmin: false,
              isLoading: false,
              userEmail,
            });
          }
        } else {
          setAdminInfo({
            isAdmin: false,
            isLoading: false,
            userEmail,
          });
        }
      } catch (error) {
        console.warn('Failed to check admin status:', error);
        setAdminInfo({
          isAdmin: false,
          isLoading: false,
          userEmail,
        });
      }
    };

    checkAdminStatus();
  }, [isLoaded, user]);

  return adminInfo;
};