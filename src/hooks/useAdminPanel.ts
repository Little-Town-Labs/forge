'use client';

import { useState, useEffect, useCallback } from 'react';

export type AdminTab = 'models' | 'knowledge-base' | 'system' | 'audit';

type SystemHealthStatus = 'healthy' | 'warning' | 'error';

interface UseAdminPanelReturn {
  isOpen: boolean;
  activeTab: AdminTab;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setActiveTab: (tab: AdminTab) => void;
  systemHealth: {
    status: SystemHealthStatus;
    message: string;
    lastCheck: Date | null;
  };
}

export const useAdminPanel = (): UseAdminPanelReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('models');
  const [systemHealth, setSystemHealth] = useState<{
    status: SystemHealthStatus;
    message: string;
    lastCheck: Date | null;
  }>({
    status: 'healthy',
    message: 'System operational',
    lastCheck: null,
  });

  // Define functions first
  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const togglePanel = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleSetActiveTab = useCallback((tab: AdminTab) => {
    setActiveTab(tab);
  }, []);

  // Check system health
  const checkSystemHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/config/system');
      if (response.ok) {
        const data = await response.json();
        setSystemHealth({
          status: data.status || 'healthy',
          message: data.message || 'System operational',
          lastCheck: new Date(),
        });
      } else {
        setSystemHealth({
          status: 'error',
          message: 'Failed to check system status',
          lastCheck: new Date(),
        });
      }
    } catch {
      setSystemHealth({
        status: 'error',
        message: 'System health check failed',
        lastCheck: new Date(),
      });
    }
  }, [setSystemHealth]);

  // Load active tab from localStorage
  useEffect(() => {
    const savedTab = localStorage.getItem('admin-panel-active-tab') as AdminTab;
    if (savedTab && ['models', 'knowledge-base', 'system', 'audit'].includes(savedTab)) {
      setActiveTab(savedTab);
    }
  }, []);

  // Save active tab to localStorage
  useEffect(() => {
    localStorage.setItem('admin-panel-active-tab', activeTab);
  }, [activeTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape to close
      if (event.key === 'Escape' && isOpen) {
        closePanel();
      }
      
      // Ctrl+Shift+A to toggle
      if (event.ctrlKey && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        togglePanel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closePanel, togglePanel]);

  // Check system health when panel opens
  useEffect(() => {
    if (isOpen) {
      checkSystemHealth();
      // Set up periodic health checks while panel is open
      const interval = setInterval(checkSystemHealth, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen, checkSystemHealth]);

  // Update openPanel to include health check
  const openPanelWithHealth = useCallback(() => {
    setIsOpen(true);
    // Check system health when opening
    checkSystemHealth();
  }, [checkSystemHealth]);

  return {
    isOpen,
    activeTab,
    openPanel: openPanelWithHealth,
    closePanel,
    togglePanel,
    setActiveTab: handleSetActiveTab,
    systemHealth,
  };
};
