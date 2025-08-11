'use client';

import React, { Suspense, lazy } from 'react';
import { AdminPanelHeader } from './AdminPanelHeader';
import { AdminPanelTabs } from './AdminPanelTabs';
import { useAdminPanel } from '../../hooks/useAdminPanel';
import AdminGuard from '../AdminGuard';
import LoadingSpinner from '../LoadingSpinner';
import ErrorBoundary from '../ErrorBoundary';

// Lazy load admin components for better performance
const AIModelConfig = lazy(() => import('../admin/AIModelConfig'));
const KnowledgeBaseConfig = lazy(() => import('../admin/KnowledgeBaseConfig'));
const SystemStatusDashboard = lazy(() => import('../admin/SystemStatusDashboard'));
const AuditLogsViewer = lazy(() => import('../admin/AuditLogsViewer'));

interface AdminPanelProps {
  isOpen: boolean;
  onModelConfigChange?: () => void;
  onCrawlComplete?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  isOpen, 
  onModelConfigChange,
  onCrawlComplete 
}) => {
  const { activeTab, closePanel } = useAdminPanel();

  const handleModelConfigChange = () => {
    // Call the callback prop if provided
    if (onModelConfigChange) {
      onModelConfigChange();
    }
  };

  const handleCrawlComplete = () => {
    // Call the callback prop if provided
    if (onCrawlComplete) {
      onCrawlComplete();
    }
  };

  const renderActiveComponent = () => {
    const renderComponentWithErrorHandling = <T extends Record<string, unknown>>(
      Component: React.LazyExoticComponent<React.ComponentType<T>>,
      props: T
    ) => (
      <ErrorBoundary>
        <Suspense 
          fallback={
            <div className="flex flex-col items-center justify-center p-8">
              <LoadingSpinner />
              <p className="mt-2 text-sm text-gray-500">Loading component...</p>
            </div>
          }
        >
          <Component {...props} />
        </Suspense>
      </ErrorBoundary>
    );

    switch (activeTab) {
      case 'models':
        return renderComponentWithErrorHandling(AIModelConfig, {
          compact: true,
          onModelConfigChange: handleModelConfigChange,
        });
      case 'knowledge-base':
        return renderComponentWithErrorHandling(KnowledgeBaseConfig, {
          compact: true,
          onCrawlComplete: handleCrawlComplete,
        });
      case 'system':
        return renderComponentWithErrorHandling(SystemStatusDashboard, {
          compact: true,
        });
      case 'audit':
        return renderComponentWithErrorHandling(AuditLogsViewer, {
          compact: true,
        });
      default:
        return (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <p>Select a tab to get started</p>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={closePanel}
      />
      
      {/* Admin Panel */}
      <div className="fixed inset-0 z-50 flex lg:relative lg:z-auto">
        <div className="flex w-full h-full bg-white shadow-2xl lg:shadow-lg">
          {/* Tabs Sidebar */}
          <AdminPanelTabs />
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <AdminPanelHeader currentTab={activeTab} />
            
            {/* Content Area */}
            <div className="flex-1 overflow-auto p-6">
              <AdminGuard>
                {renderActiveComponent()}
              </AdminGuard>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
