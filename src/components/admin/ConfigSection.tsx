"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface ConfigSectionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  headerActions?: React.ReactNode;
}

const ConfigSection: React.FC<ConfigSectionProps> = ({
  title,
  description,
  icon: Icon,
  children,
  className = "",
  headerActions
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 ${className}`}>
      {/* Section Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {Icon && (
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              {description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {description}
                </p>
              )}
            </div>
          </div>
          {headerActions && (
            <div className="flex items-center space-x-2">
              {headerActions}
            </div>
          )}
        </div>
      </div>

      {/* Section Content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default ConfigSection;