"use client";

import React from "react";
import { CheckCircle, AlertTriangle, XCircle, Loader2, HelpCircle } from "lucide-react";

export type StatusType = 
  | 'healthy' | 'success' | 'online' | 'active' | 'enabled' | 'connected'
  | 'warning' | 'pending' | 'partial' | 'limited'
  | 'critical' | 'error' | 'failed' | 'offline' | 'disabled' | 'disconnected'
  | 'loading' | 'in_progress' | 'processing'
  | 'unknown' | 'inactive' | 'neutral';

export type StatusSize = 'sm' | 'md' | 'lg';

interface StatusIndicatorProps {
  status: StatusType;
  size?: StatusSize;
  showIcon?: boolean;
  showText?: boolean;
  text?: string;
  className?: string;
  animated?: boolean;
  detailed?: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  showIcon = true,
  showText = true,
  text,
  className = "",
  animated = false,
  detailed = false
}) => {
  const getStatusConfig = (status: StatusType) => {
    switch (status) {
      case 'healthy':
      case 'success':
      case 'online':
      case 'active':
      case 'enabled':
      case 'connected':
        return {
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          dotColor: 'bg-green-500',
          icon: CheckCircle,
          defaultText: 'Healthy'
        };

      case 'warning':
      case 'pending':
      case 'partial':
      case 'limited':
        return {
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          dotColor: 'bg-yellow-500',
          icon: AlertTriangle,
          defaultText: 'Warning'
        };

      case 'critical':
      case 'error':
      case 'failed':
      case 'offline':
      case 'disabled':
      case 'disconnected':
        return {
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          dotColor: 'bg-red-500',
          icon: XCircle,
          defaultText: 'Critical'
        };

      case 'loading':
      case 'in_progress':
      case 'processing':
        return {
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          dotColor: 'bg-blue-500',
          icon: Loader2,
          defaultText: 'Loading',
          spin: true
        };

      case 'unknown':
      case 'inactive':
      case 'neutral':
      default:
        return {
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800',
          dotColor: 'bg-gray-500',
          icon: HelpCircle,
          defaultText: 'Unknown'
        };
    }
  };

  const getSizeConfig = (size: StatusSize) => {
    switch (size) {
      case 'sm':
        return {
          dotSize: 'w-2 h-2',
          iconSize: 'w-3 h-3',
          textSize: 'text-xs',
          padding: 'px-2 py-1',
          spacing: 'space-x-1'
        };
      case 'lg':
        return {
          dotSize: 'w-4 h-4',
          iconSize: 'w-5 h-5',
          textSize: 'text-base',
          padding: 'px-4 py-2',
          spacing: 'space-x-3'
        };
      case 'md':
      default:
        return {
          dotSize: 'w-3 h-3',
          iconSize: 'w-4 h-4',
          textSize: 'text-sm',
          padding: 'px-3 py-1.5',
          spacing: 'space-x-2'
        };
    }
  };

  const statusConfig = getStatusConfig(status);
  const sizeConfig = getSizeConfig(size);
  const Icon = statusConfig.icon;
  
  const displayText = text || statusConfig.defaultText;
  const shouldSpin = animated && statusConfig.spin;

  // Simple dot indicator
  if (!showText && !detailed) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <div 
          className={`${sizeConfig.dotSize} rounded-full ${statusConfig.dotColor} ${
            shouldSpin ? 'animate-pulse' : ''
          }`} 
        />
      </div>
    );
  }

  // Badge-style indicator
  if (!detailed) {
    return (
      <span className={`
        inline-flex items-center ${sizeConfig.spacing} ${sizeConfig.padding} rounded-full 
        ${sizeConfig.textSize} font-medium ${statusConfig.color} ${statusConfig.bgColor}
        ${className}
      `}>
        {showIcon && (
          <Icon className={`${sizeConfig.iconSize} ${shouldSpin ? 'animate-spin' : ''}`} />
        )}
        {showText && displayText}
      </span>
    );
  }

  // Detailed card-style indicator
  return (
    <div className={`
      inline-flex items-center ${sizeConfig.spacing} ${sizeConfig.padding} 
      rounded-lg border ${statusConfig.borderColor} ${statusConfig.bgColor}
      ${className}
    `}>
      <div className="flex items-center space-x-2">
        {showIcon && (
          <div className={`p-1 rounded-full ${statusConfig.bgColor}`}>
            <Icon className={`${sizeConfig.iconSize} ${statusConfig.color} ${shouldSpin ? 'animate-spin' : ''}`} />
          </div>
        )}
        {showText && (
          <div>
            <span className={`${sizeConfig.textSize} font-medium ${statusConfig.color} capitalize`}>
              {displayText}
            </span>
            {/* Additional status info can be added here if needed */}
          </div>
        )}
      </div>
    </div>
  );
};

// Convenience components for common status types
export const HealthIndicator: React.FC<Omit<StatusIndicatorProps, 'status'> & { 
  health: 'healthy' | 'warning' | 'critical' | 'loading' 
}> = ({ health, ...props }) => (
  <StatusIndicator status={health} {...props} />
);

export const ConnectionIndicator: React.FC<Omit<StatusIndicatorProps, 'status'> & { 
  connected: boolean;
  loading?: boolean;
}> = ({ connected, loading = false, ...props }) => (
  <StatusIndicator 
    status={loading ? 'loading' : connected ? 'connected' : 'disconnected'} 
    animated={loading}
    {...props} 
  />
);

export const ServiceIndicator: React.FC<Omit<StatusIndicatorProps, 'status'> & { 
  enabled: boolean;
  working?: boolean;
  loading?: boolean;
}> = ({ enabled, working = true, loading = false, ...props }) => {
  const getStatus = (): StatusType => {
    if (loading) return 'loading';
    if (!enabled) return 'disabled';
    return working ? 'active' : 'error';
  };

  return (
    <StatusIndicator 
      status={getStatus()} 
      animated={loading}
      {...props} 
    />
  );
};

export default StatusIndicator;