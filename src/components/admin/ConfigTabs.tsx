"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

export type ConfigTab = "models" | "knowledge-base" | "system" | "audit";

interface Tab {
  id: ConfigTab;
  label: string;
  icon: LucideIcon;
  description: string;
}

interface ConfigTabsProps {
  tabs: Tab[];
  activeTab: ConfigTab;
  onTabChange: (tab: ConfigTab) => void;
  className?: string;
}

const ConfigTabs: React.FC<ConfigTabsProps> = ({ 
  tabs, 
  activeTab, 
  onTabChange, 
  className = "" 
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg ${className}`}>
      {/* Tab Headers */}
      <div className="border-b border-gray-200 dark:border-gray-600">
        <nav className="flex space-x-0" aria-label="Configuration tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  group relative min-w-0 flex-1 overflow-hidden py-4 px-6 text-center text-sm font-medium
                  hover:text-gray-700 dark:hover:text-gray-200 focus:z-10 focus:outline-none
                  ${isActive
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }
                  first:rounded-tl-xl last:rounded-tr-xl
                  transition-all duration-200 ease-in-out
                `}
                aria-selected={isActive}
                role="tab"
              >
                <div className="flex flex-col items-center space-y-2">
                  <Icon className={`w-5 h-5 ${
                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                  }`} />
                  <span className="font-medium">{tab.label}</span>
                  <span className={`text-xs leading-tight ${
                    isActive ? 'text-blue-500/80 dark:text-blue-300/80' : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                  }`}>
                    {tab.description}
                  </span>
                </div>
                
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panel Container */}
      <div className="p-6" role="tabpanel">
        {/* Content will be rendered here by parent component */}
      </div>
    </div>
  );
};

export default ConfigTabs;