"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, Database, Key, Shield, Activity, Clock, CheckCircle, AlertTriangle, XCircle, Settings, Server, Zap, HardDrive } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  healthScore: number;
  timestamp: string;
  uptime: number;
}

interface DatabaseHealth {
  health: {
    connected: boolean;
    responseTime: number;
    error?: string;
  };
  stats: {
    tableStats: Array<{
      tableName: string;
      rowCount: number;
      sizeBytes: number;
    }>;
    connectionInfo: {
      database: string;
      user: string;
      applicationName: string;
    };
  };
  configured: boolean;
}

interface EncryptionHealth {
  test: {
    success: boolean;
    roundTripTime: number;
    error?: string;
  };
  validation: {
    isValid: boolean;
    error?: string;
  };
  configured: boolean;
}

interface Features {
  databaseEnabled: boolean;
  encryptionEnabled: boolean;
  pineconeEnabled: boolean;
  authEnabled: boolean;
  adminEnabled: boolean;
  openaiEnabled: boolean;
}

interface Performance {
  databaseResponseTime: number;
  encryptionResponseTime: number;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  };
}

interface SystemStatus {
  status: SystemHealth['status'];
  healthScore: number;
  timestamp: string;
  uptime: number;
  database: DatabaseHealth;
  encryption: EncryptionHealth;
  features: Features;
  performance: Performance;
}

const SystemStatusDashboard: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSystemStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch("/api/admin/config/system");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSystemStatus(data.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch system status:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSystemStatus();
  };

  const runSystemOperation = async (operation: string) => {
    try {
      setRefreshing(true);
      const response = await fetch("/api/admin/config/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation }),
      });

      if (response.ok) {
        await fetchSystemStatus();
      }
    } catch (error) {
      console.error(`Failed to run ${operation}:`, error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getFeatureIcon = (enabled: boolean) => {
    return enabled ? (
      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!systemStatus) {
    return (
      <div className="text-center py-8 text-red-600 dark:text-red-400">
        Failed to load system status. Please try refreshing the page.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Status Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Monitor system health, performance, and configuration
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overall System Health */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Overview</h3>
          <div className="flex items-center space-x-2">
            {getStatusIcon(systemStatus.status)}
            <span className={`font-medium capitalize ${getStatusColor(systemStatus.status)}`}>
              {systemStatus.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {systemStatus.healthScore}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Health Score</div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${
                  systemStatus.healthScore >= 80 ? 'bg-green-500' :
                  systemStatus.healthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${systemStatus.healthScore}%` }}
              />
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatUptime(systemStatus.uptime)}
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Uptime</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center">
              <Database className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {systemStatus.database.health.responseTime}ms
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">DB Response</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center">
              <Key className="w-6 h-6 text-orange-600 dark:text-orange-400 mr-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {systemStatus.encryption.test.roundTripTime}ms
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Encryption</div>
          </div>
        </div>
      </div>

      {/* Database Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Database Status
          </h3>
          <div className="flex items-center space-x-2">
            {systemStatus.database.health.connected ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
            <span className={`font-medium ${
              systemStatus.database.health.connected 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {systemStatus.database.health.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {systemStatus.database.health.connected ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Database:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-white">
                  {systemStatus.database.stats.connectionInfo.database}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">User:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-white">
                  {systemStatus.database.stats.connectionInfo.user}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Response Time:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-white">
                  {systemStatus.database.health.responseTime}ms
                </span>
              </div>
            </div>

            {systemStatus.database.stats.tableStats.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Table Statistics</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Table</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Operations</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Size</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {systemStatus.database.stats.tableStats.map(table => (
                        <tr key={table.tableName}>
                          <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                            {table.tableName}
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                            {table.rowCount.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                            {formatBytes(table.sizeBytes)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-red-600 dark:text-red-400">
            {systemStatus.database.health.error || 'Database connection failed'}
          </div>
        )}
      </div>

      {/* Encryption Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Encryption Status
          </h3>
          <div className="flex items-center space-x-2">
            {systemStatus.encryption.test.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
            <span className={`font-medium ${
              systemStatus.encryption.test.success 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {systemStatus.encryption.test.success ? 'Working' : 'Failed'}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Encryption Test:</span>
            <span className={`font-medium ${
              systemStatus.encryption.test.success 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {systemStatus.encryption.test.success ? 'Passed' : 'Failed'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Round Trip Time:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {systemStatus.encryption.test.roundTripTime}ms
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Key Validation:</span>
            <span className={`font-medium ${
              systemStatus.encryption.validation.isValid 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {systemStatus.encryption.validation.isValid ? 'Valid' : 'Invalid'}
            </span>
          </div>
          {systemStatus.encryption.test.error && (
            <div className="text-red-600 dark:text-red-400 mt-2">
              Error: {systemStatus.encryption.test.error}
            </div>
          )}
        </div>
      </div>

      {/* Feature Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-600">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Feature Status
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">Database</span>
              <div className="flex items-center space-x-1">
                {getFeatureIcon(systemStatus.features.databaseEnabled)}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {systemStatus.features.databaseEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">Encryption</span>
              <div className="flex items-center space-x-1">
                {getFeatureIcon(systemStatus.features.encryptionEnabled)}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {systemStatus.features.encryptionEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">Pinecone</span>
              <div className="flex items-center space-x-1">
                {getFeatureIcon(systemStatus.features.pineconeEnabled)}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {systemStatus.features.pineconeEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">Authentication</span>
              <div className="flex items-center space-x-1">
                {getFeatureIcon(systemStatus.features.authEnabled)}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {systemStatus.features.authEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">Admin Access</span>
              <div className="flex items-center space-x-1">
                {getFeatureIcon(systemStatus.features.adminEnabled)}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {systemStatus.features.adminEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">OpenAI</span>
              <div className="flex items-center space-x-1">
                {getFeatureIcon(systemStatus.features.openaiEnabled)}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {systemStatus.features.openaiEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-600">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2" />
          Performance Metrics
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
              <Server className="w-4 h-4 mr-1" />
              Response Times
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Database:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {systemStatus.performance.databaseResponseTime}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Encryption:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {systemStatus.performance.encryptionResponseTime}ms
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
              <HardDrive className="w-4 h-4 mr-1" />
              Memory Usage
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">RSS:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatBytes(systemStatus.performance.memoryUsage.rss)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Heap Used:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatBytes(systemStatus.performance.memoryUsage.heapUsed)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Heap Total:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatBytes(systemStatus.performance.memoryUsage.heapTotal)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">System Operations</h4>
            <div className="space-y-2">
              <button
                onClick={() => runSystemOperation('test_encryption')}
                disabled={refreshing}
                className="w-full px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-50"
              >
                Test Encryption
              </button>
              <button
                onClick={() => runSystemOperation('health_check')}
                disabled={refreshing}
                className="w-full px-3 py-2 text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 disabled:opacity-50"
              >
                Health Check
              </button>
              <button
                onClick={() => runSystemOperation('initialize_schema')}
                disabled={refreshing}
                className="w-full px-3 py-2 text-sm bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 disabled:opacity-50"
              >
                Initialize Schema
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        Last updated: {new Date(systemStatus.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

export default SystemStatusDashboard;