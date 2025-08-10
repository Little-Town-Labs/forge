"use client";

import React, { useState, useEffect } from "react";
import { Filter, Download, RefreshCw, Eye, Calendar, User, Activity, Database, Brain } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";

interface ConfigAuditEntry {
  id: number;
  adminEmail: string;
  action: string;
  resourceType: 'ai_model' | 'rag_url' | 'system';
  resourceId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

interface AuditLogFilters {
  adminEmail: string;
  resourceType: string;
  action: string;
  startDate: string;
  endDate: string;
  limit: number;
  offset: number;
}

interface AuditLogSummary {
  entriesInPage: number;
  uniqueAdmins: number;
  uniqueActions: number;
  resourceTypes: {
    ai_model: number;
    rag_url: number;
    system: number;
  };
}

interface PaginationInfo {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  offset: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const AuditLogsViewer: React.FC = () => {
  const [entries, setEntries] = useState<ConfigAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);
  const [summary, setSummary] = useState<AuditLogSummary | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  const [filters, setFilters] = useState<AuditLogFilters>({
    adminEmail: '',
    resourceType: '',
    action: '',
    startDate: '',
    endDate: '',
    limit: 50,
    offset: 0
  });

  useEffect(() => {
    fetchAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchAuditLogs = async () => {
    try {
      const searchParams = new URLSearchParams();
      
      if (filters.adminEmail) searchParams.set('adminEmail', filters.adminEmail);
      if (filters.resourceType) searchParams.set('resourceType', filters.resourceType);
      if (filters.action) searchParams.set('action', filters.action);
      if (filters.startDate) searchParams.set('startDate', new Date(filters.startDate).toISOString());
      if (filters.endDate) searchParams.set('endDate', new Date(filters.endDate).toISOString());
      searchParams.set('limit', filters.limit.toString());
      searchParams.set('offset', filters.offset.toString());

      const response = await fetch(`/api/admin/config/audit?${searchParams}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEntries(data.data.entries);
          setSummary(data.data.summary);
          setPagination(data.data.pagination);
        }
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAuditLogs();
  };

  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const handleFilterChange = (key: keyof AuditLogFilters, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 })); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      adminEmail: '',
      resourceType: '',
      action: '',
      startDate: '',
      endDate: '',
      limit: 50,
      offset: 0
    });
  };

  const exportLogs = () => {
    // Create CSV content
    const csvHeaders = ['Timestamp', 'Admin', 'Action', 'Resource Type', 'Resource ID', 'IP Address'];
    const csvRows = entries.map(entry => [
      new Date(entry.createdAt).toISOString(),
      entry.adminEmail,
      entry.action,
      entry.resourceType,
      entry.resourceId || '',
      entry.ipAddress || ''
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'ai_model':
        return <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'rag_url':
        return <Database className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'system':
        return <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'text-green-600 dark:text-green-400';
    if (action.includes('update')) return 'text-blue-600 dark:text-blue-400';
    if (action.includes('delete')) return 'text-red-600 dark:text-red-400';
    if (action.includes('test')) return 'text-purple-600 dark:text-purple-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Track all configuration changes and administrative actions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-2 border rounded-lg transition-colors ${
              showFilters
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
          <button
            onClick={exportLogs}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center">
              <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.entriesInPage}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Entries Shown</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center">
              <User className="w-6 h-6 text-green-600 dark:text-green-400 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.uniqueAdmins}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Unique Admins</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center">
              <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.uniqueActions}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Unique Actions</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Models:</span>
                <span className="font-medium text-gray-900 dark:text-white">{summary.resourceTypes.ai_model}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">URLs:</span>
                <span className="font-medium text-gray-900 dark:text-white">{summary.resourceTypes.rag_url}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">System:</span>
                <span className="font-medium text-gray-900 dark:text-white">{summary.resourceTypes.system}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filter Audit Logs</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Admin Email
              </label>
              <input
                type="text"
                value={filters.adminEmail}
                onChange={(e) => handleFilterChange('adminEmail', e.target.value)}
                placeholder="Filter by admin email..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Resource Type
              </label>
              <select
                value={filters.resourceType}
                onChange={(e) => handleFilterChange('resourceType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="ai_model">AI Models</option>
                <option value="rag_url">RAG URLs</option>
                <option value="system">System</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Action
              </label>
              <input
                type="text"
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                placeholder="Filter by action..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Entries per Page
              </label>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
        {entries.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No audit log entries found matching the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {entries.map((entry) => (
                  <React.Fragment key={entry.id}>
                    <tr 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          {new Date(entry.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {entry.adminEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-medium ${getActionColor(entry.action)}`}>
                          {entry.action.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center">
                          {getResourceIcon(entry.resourceType)}
                          <span className="ml-2 capitalize">
                            {entry.resourceType.replace('_', ' ')}
                          </span>
                          {entry.resourceId && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              #{entry.resourceId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
                          {entry.ipAddress && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
                              {entry.ipAddress}
                            </span>
                          )}
                          <Eye className="w-4 h-4" />
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Details */}
                    {expandedEntry === entry.id && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 bg-gray-50 dark:bg-gray-700">
                          <div className="space-y-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">User Agent:</span>
                                <p className="text-gray-600 dark:text-gray-400 mt-1 break-all">
                                  {entry.userAgent || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">IP Address:</span>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                  {entry.ipAddress || 'N/A'}
                                </p>
                              </div>
                            </div>
                            
                            {/* Value Changes */}
                            {(entry.oldValue || entry.newValue) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {entry.oldValue && (
                                  <div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">Old Value:</span>
                                    <pre className="text-xs text-gray-600 dark:text-gray-400 mt-1 bg-white dark:bg-gray-800 p-2 rounded border overflow-auto max-h-32">
                                      {formatValue(entry.oldValue)}
                                    </pre>
                                  </div>
                                )}
                                {entry.newValue && (
                                  <div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">New Value:</span>
                                    <pre className="text-xs text-gray-600 dark:text-gray-400 mt-1 bg-white dark:bg-gray-800 p-2 rounded border overflow-auto max-h-32">
                                      {formatValue(entry.newValue)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.totalCount)} of {pagination.totalCount} entries
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.offset - pagination.limit)}
                  disabled={!pagination.hasPreviousPage}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.offset + pagination.limit)}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsViewer;