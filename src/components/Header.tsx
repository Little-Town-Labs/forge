"use client";

import React, { useState, useEffect } from "react";
import { UserButton, SignInButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/utils/admin";
import { Settings } from "lucide-react";

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className = "" }) => {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  // Check admin status when user data loads
  useEffect(() => {
    if (isLoaded) {
      const userEmail = user?.emailAddresses?.[0]?.emailAddress;
      const adminStatus = isAdmin(userEmail);
      setUserIsAdmin(adminStatus);
      setIsCheckingAdmin(false);
    }
  }, [isLoaded, user]);

  const handleAdminClick = () => {
    router.push("/admin");
  };

  return (
    <header className={`text-center ${className}`}>
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
            Forge
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-1">
            Framework Operations & Resource Guidance Engine
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your AI-powered conversation partner
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <SignedIn>
            {/* Admin Link - Only visible to admin users */}
            {!isCheckingAdmin && userIsAdmin && (
              <button
                onClick={handleAdminClick}
                className="flex items-center px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Admin Dashboard"
                data-testid="admin-button"
              >
                <Settings className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">Admin</span>
              </button>
            )}
            
            {/* User Menu with enhanced styling */}
            <div className="flex items-center space-x-3">
              {user && (
                <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  {user.firstName || user.emailAddresses?.[0]?.emailAddress}
                </span>
              )}
              <div data-testid="user-menu">
                <UserButton 
                  afterSignOutUrl="/" 
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "w-8 h-8 ring-2 ring-gray-200 dark:ring-gray-600",
                      userButtonPopoverCard: "shadow-lg border border-gray-200 dark:border-gray-700",
                    }
                  }}
                />
              </div>
            </div>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
};

export default Header; 