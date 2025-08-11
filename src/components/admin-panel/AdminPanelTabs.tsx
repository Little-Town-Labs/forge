'use client';

import React from 'react';
import { Settings, Database, Activity, FileText } from 'lucide-react';
import { AdminTab, useAdminPanel } from '../../hooks/useAdminPanel';

interface TabConfig {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const tabs: TabConfig[] = [
  {
    id: 'models',
    label: 'AI Models',
    icon: Settings,
    description: 'Configure AI model providers and settings',
  },
  {
    id: 'knowledge-base',
    label: 'Knowledge Base',
    icon: Database,
    description: 'Manage document crawling and context',
  },
  {
    id: 'system',
    label: 'System Status',
    icon: Activity,
    description: 'Monitor system health and performance',
  },
  {
    id: 'audit',
    label: 'Audit Logs',
    icon: FileText,
    description: 'View system activity and changes',
  },
];

export const AdminPanelTabs: React.FC = () => {
  const { activeTab, setActiveTab } = useAdminPanel();

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
      <div className="space-y-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-blue-100 border border-blue-200 text-blue-900 shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon 
                  className={`w-5 h-5 ${
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  }`} 
                />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${
                    isActive ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {tab.label}
                  </div>
                  <div className={`text-xs mt-1 ${
                    isActive ? 'text-blue-700' : 'text-gray-500'
                  }`}>
                    {tab.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="mt-8 p-3 bg-gray-100 rounded-lg">
        <div className="text-xs font-medium text-gray-700 mb-2">Keyboard Shortcuts</div>
        <div className="space-y-1 text-xs text-gray-600">
          <div>• <kbd className="px-1 py-0.5 bg-white rounded text-xs">Esc</kbd> Close panel</div>
          <div>• <kbd className="px-1 py-0.5 bg-white rounded text-xs">Ctrl+Shift+A</kbd> Toggle panel</div>
        </div>
      </div>
    </div>
  );
};
