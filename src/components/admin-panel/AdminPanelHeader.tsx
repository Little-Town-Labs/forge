'use client';

import React from 'react';
import { X, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAdminPanel } from '../../hooks/useAdminPanel';
import { useAdminStatus } from '../../hooks/useAdminStatus';

interface AdminPanelHeaderProps {
  currentTab: string;
}

export const AdminPanelHeader: React.FC<AdminPanelHeaderProps> = ({ currentTab }) => {
  const { closePanel, systemHealth } = useAdminPanel();
  const { isAdmin, userEmail } = useAdminStatus();

  const getHealthIcon = () => {
    switch (systemHealth.status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getHealthColor = () => {
    switch (systemHealth.status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
        </div>
        
        <div className="flex items-center space-x-2 px-2 py-1 bg-gray-100 rounded-md">
          <span className="text-sm text-gray-600">Tab:</span>
          <span className="text-sm font-medium text-gray-900 capitalize">
            {currentTab.replace('-', ' ')}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* System Health Indicator */}
        <div className="flex items-center space-x-2 px-3 py-1 bg-gray-50 rounded-md">
          {getHealthIcon()}
          <div className="text-sm">
            <div className={`font-medium ${getHealthColor()}`}>
              {systemHealth.status.charAt(0).toUpperCase() + systemHealth.status.slice(1)}
            </div>
            <div className="text-xs text-gray-500">
              {systemHealth.message}
            </div>
          </div>
        </div>

        {/* Admin User Info */}
        {isAdmin && (
          <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-md">
            <Shield className="w-4 h-4 text-blue-600" />
            <div className="text-sm">
              <div className="font-medium text-blue-900">Admin</div>
              <div className="text-xs text-blue-700">{userEmail}</div>
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={closePanel}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Close admin panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
