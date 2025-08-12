"use client";

import React, { useEffect, useState } from "react";
import { SignedIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import Header from "@/components/Header";
import { StartupTrigger } from "@/components/admin/StartupTrigger";
import { Users, Mail, Settings, BarChart3 } from "lucide-react";

interface AdminStats {
  totalInvitations: number;
  pendingInvitations: number;
  isLoading: boolean;
}

interface CrawlConfig {
  maxPages: number;
  maxDepth: number;
  timeoutMinutes: number;
  robotsTxtSupport: boolean;
  rateLimits: {
    singleCrawlsPerHour: number;
    limitedCrawlsPerHour: number;
    deepCrawlsPerHour: number;
  };
}

interface AdminConfig {
  crawlConfig: CrawlConfig;
  isLoading: boolean;
}

const AdminDashboard: React.FC = () => {
  const { user } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats>({
    totalInvitations: 0,
    pendingInvitations: 0,
    isLoading: true,
  });
  const [config, setConfig] = useState<AdminConfig>({
    crawlConfig: {
      maxPages: 100,
      maxDepth: 3,
      timeoutMinutes: 10,
      robotsTxtSupport: false,
      rateLimits: {
        singleCrawlsPerHour: 60,
        limitedCrawlsPerHour: 10,
        deepCrawlsPerHour: 3
      }
    },
    isLoading: true,
  });

  // Fetch admin stats and config when component mounts
  useEffect(() => {
    fetchAdminStats();
    fetchAdminConfig();
  }, []);

  const fetchAdminStats = async () => {
    try {
      const response = await fetch("/api/invitations");
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalInvitations: data.totalCount || 0,
          pendingInvitations: data.invitations?.length || 0,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  };

  const fetchAdminConfig = async () => {
    try {
      const response = await fetch("/api/admin/config");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.crawlConfig) {
          setConfig({
            crawlConfig: data.data.crawlConfig,
            isLoading: false,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch admin config:", error);
      setConfig(prev => ({ ...prev, isLoading: false }));
    }
  };

  const userEmail = user?.emailAddresses?.[0]?.emailAddress;

  return (
    <AdminGuard>
      <SignedIn>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
          <Header className="py-8 px-4" />
          
          <div className="flex-1 container mx-auto px-4 py-8">
            <div className="max-w-6xl mx-auto">
              {/* Header Section */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Admin Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Manage users, invitations, and system settings
                </p>
              </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-4">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Total Invitations
                    </h3>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {stats.isLoading ? "..." : stats.totalInvitations}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mr-4">
                    <Mail className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Pending Invitations
                    </h3>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {stats.isLoading ? "..." : stats.pendingInvitations}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mr-4">
                    <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Admin Status
                    </h3>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      {userEmail || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Quick Actions
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => router.push("/admin/invitations")}
                  className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left"
                >
                  <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-4" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Manage Invitations
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Send invitations and manage pending requests
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => router.push("/admin/config")}
                  className="flex items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-left"
                >
                  <Settings className="w-8 h-8 text-purple-600 dark:text-purple-400 mr-4" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      System Configuration
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Configure AI models, knowledge base, and system settings
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Crawl Configuration */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Crawl Configuration
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="font-medium text-gray-900 dark:text-white">Max Pages</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {config.isLoading ? "..." : config.crawlConfig.maxPages}
                    </div>
                    <div className="text-gray-600 dark:text-gray-300">Deep crawls</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="font-medium text-gray-900 dark:text-white">Max Depth</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {config.isLoading ? "..." : config.crawlConfig.maxDepth}
                    </div>
                    <div className="text-gray-600 dark:text-gray-300">Levels</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="font-medium text-gray-900 dark:text-white">Timeout</div>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {config.isLoading ? "..." : config.crawlConfig.timeoutMinutes}m
                    </div>
                    <div className="text-gray-600 dark:text-gray-300">Minutes</div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Rate Limits</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Single page crawls/hour:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {config.isLoading ? "..." : config.crawlConfig.rateLimits.singleCrawlsPerHour}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Limited crawls/hour:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {config.isLoading ? "..." : config.crawlConfig.rateLimits.limitedCrawlsPerHour}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Deep crawls/hour:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {config.isLoading ? "..." : config.crawlConfig.rateLimits.deepCrawlsPerHour}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Configuration Status</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">Robots.txt checking:</span>
                      <span className={`font-medium px-2 py-1 rounded text-xs ${
                        config.isLoading ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {config.isLoading ? '...' : 'Not implemented'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300">Crawl monitoring:</span>
                      <span className="font-medium px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Admin Information
              </h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Your Email:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {userEmail || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Admin Status:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    Active
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Last Updated:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* System Startup Control */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                System Startup Control
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Use these controls to trigger full application startup initialization or check current status.
              </p>
              <StartupTrigger />
            </div>
          </div>
        </div>
      </div>
      </SignedIn>
    </AdminGuard>
  );
};

export default AdminDashboard;