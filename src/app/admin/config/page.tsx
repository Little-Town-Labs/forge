"use client";

import React, { useState, useEffect } from "react";
import { SignedIn, useUser } from "@clerk/nextjs";
import AdminGuard from "@/components/AdminGuard";
import Header from "@/components/Header";
import ConfigTabs from "./components/ConfigTabs";
import AIModelConfig from "./components/AIModelConfig";
import KnowledgeBaseConfig from "./components/KnowledgeBaseConfig";
import SystemStatusDashboard from "./components/SystemStatusDashboard";
import AuditLogsViewer from "./components/AuditLogsViewer";
import { Settings, Brain, Database, Activity, History } from "lucide-react";

export type ConfigTab = "models" | "knowledge-base" | "system" | "audit";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ConfigPageProps {}

const AdminConfigPage: React.FC<ConfigPageProps> = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<ConfigTab>("models");
  const [systemHealth, setSystemHealth] = useState<'healthy' | 'warning' | 'critical' | 'loading'>('loading');

  // Fetch system health status for the header indicator
  useEffect(() => {
    const fetchSystemHealth = async () => {
      try {
        const response = await fetch("/api/admin/config/system");
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setSystemHealth(data.data.status || 'healthy');
          }
        }
      } catch (error) {
        console.error("Failed to fetch system health:", error);
        setSystemHealth('warning');
      }
    };

    fetchSystemHealth();
    // Refresh health status every 30 seconds
    const interval = setInterval(fetchSystemHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const userEmail = user?.emailAddresses?.[0]?.emailAddress;

  const tabs = [
    {
      id: "models" as ConfigTab,
      label: "AI Models",
      icon: Brain,
      description: "Configure OpenAI and Google AI model settings"
    },
    {
      id: "knowledge-base" as ConfigTab,
      label: "Knowledge Base",
      icon: Database,
      description: "Manage RAG URLs and crawling configuration"
    },
    {
      id: "system" as ConfigTab,
      label: "System Status",
      icon: Activity,
      description: "Monitor system health and performance"
    },
    {
      id: "audit" as ConfigTab,
      label: "Audit Logs",
      icon: History,
      description: "View configuration change history"
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "models":
        return <AIModelConfig />;
      case "knowledge-base":
        return <KnowledgeBaseConfig />;
      case "system":
        return <SystemStatusDashboard />;
      case "audit":
        return <AuditLogsViewer />;
      default:
        return <AIModelConfig />;
    }
  };

  const getHealthColor = (status: typeof systemHealth) => {
    switch (status) {
      case 'healthy': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'critical': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getHealthBadgeColor = (status: typeof systemHealth) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  return (
    <AdminGuard>
      <SignedIn>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
          <Header className="py-8 px-4" />
          
          <div className="flex-1 container mx-auto px-4 py-8">
            <div className="max-w-7xl mx-auto">
              
              {/* Header Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      System Configuration
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300">
                      Manage AI models, knowledge base, and system settings
                    </p>
                  </div>
                  
                  {/* System Health Indicator */}
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-600 dark:text-gray-300">Admin</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {userEmail}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        systemHealth === 'healthy' ? 'bg-green-500' :
                        systemHealth === 'warning' ? 'bg-yellow-500' :
                        systemHealth === 'critical' ? 'bg-red-500' : 'bg-gray-400'
                      }`} />
                      <span className={`text-sm font-medium capitalize ${getHealthColor(systemHealth)}`}>
                        {systemHealth}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* System Status Badge */}
                {systemHealth !== 'loading' && systemHealth !== 'healthy' && (
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getHealthBadgeColor(systemHealth)}`}>
                    <Settings className="w-4 h-4 mr-2" />
                    System requires attention - Check System Status tab
                  </div>
                )}
              </div>

              {/* Tab Navigation */}
              <ConfigTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />

              {/* Tab Content */}
              <div className="mt-8">
                {renderTabContent()}
              </div>
              
            </div>
          </div>
        </div>
      </SignedIn>
    </AdminGuard>
  );
};

export default AdminConfigPage;