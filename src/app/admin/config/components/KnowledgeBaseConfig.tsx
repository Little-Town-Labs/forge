"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Play, RefreshCw, Link, Globe, Clock, CheckCircle, AlertCircle, XCircle, Loader, WifiOff } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";

interface CrawlConfig {
  mode: 'single' | 'limited' | 'deep';
  maxPages?: number;
  maxDepth?: number;
}

interface RagUrlConfig {
  id: number;
  url: string;
  namespace: string;
  crawlConfig: CrawlConfig;
  isActive: boolean;
  lastCrawled?: Date;
  crawlStatus: 'pending' | 'success' | 'failed' | 'in_progress';
  pagesIndexed: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UrlFormData {
  url: string;
  namespace: string;
  crawlConfig: CrawlConfig;
  isActive: boolean;
}

// Enhanced error state interface
interface ErrorState {
  type: 'fetch' | 'submit' | 'delete' | 'crawl' | 'network';
  message: string;
  details?: string;
  timestamp: number;
}

// Loading state interface
interface LoadingState {
  initial: boolean;
  refreshing: boolean;
  submitting: boolean;
  deleting: { [key: number]: boolean };
  crawling: { [key: number]: boolean };
}

const KnowledgeBaseConfig: React.FC = () => {
  const [urls, setUrls] = useState<RagUrlConfig[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUrl, setEditingUrl] = useState<RagUrlConfig | null>(null);
  
  // Enhanced state management
  const [loadingState, setLoadingState] = useState<LoadingState>({
    initial: true,
    refreshing: false,
    submitting: false,
    deleting: {},
    crawling: {}
  });
  
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [lastSuccessOperation, setLastSuccessOperation] = useState<{
    type: 'create' | 'update' | 'delete' | 'crawl';
    message: string;
    timestamp: number;
  } | null>(null);

  const [formData, setFormData] = useState<UrlFormData>({
    url: '',
    namespace: '',
    crawlConfig: {
      mode: 'limited',
      maxPages: 10,
      maxDepth: 2
    },
    isActive: true
  });

  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  // Helper functions for state management
  const clearError = useCallback(() => setErrorState(null), []);
  const clearSuccess = useCallback(() => setLastSuccessOperation(null), []);
  
  const showError = useCallback((type: ErrorState['type'], message: string, details?: string) => {
    setErrorState({ type, message, details, timestamp: Date.now() });
    // Auto-clear error after 10 seconds
    setTimeout(() => setErrorState(null), 10000);
  }, []);
  
  const showSuccess = useCallback((type: 'create' | 'update' | 'delete' | 'crawl', message: string) => {
    setLastSuccessOperation({ type, message, timestamp: Date.now() });
    // Auto-clear success after 5 seconds
    setTimeout(() => setLastSuccessOperation(null), 5000);
  }, []);

  const fetchUrls = useCallback(async (isRefresh = false) => {
    try {
      // Set appropriate loading state
      setLoadingState(prev => ({ 
        ...prev, 
        initial: !isRefresh && prev.initial, 
        refreshing: isRefresh 
      }));
      
      clearError(); // Clear any existing errors
      
      const response = await fetch("/api/admin/config/knowledge-base");
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'API returned unsuccessful response');
      }
      
      setUrls(data.data.urls);
      
      // Show success only on manual refresh
      if (isRefresh) {
        showSuccess('update', 'Knowledge base URLs refreshed successfully');
      }
      
    } catch (error) {
      console.error("Failed to fetch URLs:", error);
      
      // Determine error type
      let errorType: ErrorState['type'] = 'fetch';
      let errorMessage = 'Failed to load knowledge base URLs';
      let errorDetails = '';
      
      if (error instanceof Error) {
        if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
          errorType = 'network';
          errorMessage = 'Network connection failed';
          errorDetails = 'Please check your internet connection and try again';
        } else {
          errorDetails = error.message;
        }
      }
      
      showError(errorType, errorMessage, errorDetails);
      
    } finally {
      setLoadingState(prev => ({ 
        ...prev, 
        initial: false, 
        refreshing: false 
      }));
    }
  }, [showSuccess, clearError, showError]);

  // Retry function for failed operations
  const retryOperation = (operationType: ErrorState['type']) => {
    clearError();
    
    switch (operationType) {
      case 'fetch':
        fetchUrls(true);
        break;
      case 'network':
        fetchUrls(true);
        break;
      default:
        // For other operations, just clear the error
        break;
    }
  };

  useEffect(() => {
    fetchUrls();
    // Set up polling for active crawls
    const interval = setInterval(() => {
      const activeCrawls = urls.filter(url => url.crawlStatus === 'in_progress');
      if (activeCrawls.length > 0) {
        fetchUrls();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [urls, fetchUrls]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close form
      if (e.key === 'Escape' && showForm && !loadingState.submitting) {
        resetForm();
      }
      
      // Ctrl/Cmd + R to refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r' && !loadingState.refreshing) {
        e.preventDefault();
        fetchUrls(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showForm, loadingState.submitting, loadingState.refreshing, fetchUrls]);

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.url.trim()) {
      errors.url = "URL is required";
    } else {
      try {
        new URL(formData.url);
      } catch {
        errors.url = "Invalid URL format";
      }
    }

    if (!formData.namespace.trim()) {
      errors.namespace = "Namespace is required";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.namespace)) {
      errors.namespace = "Namespace can only contain letters, numbers, hyphens, and underscores";
    }

    if (formData.crawlConfig.mode !== 'single') {
      if (!formData.crawlConfig.maxPages || formData.crawlConfig.maxPages < 1 || formData.crawlConfig.maxPages > 1000) {
        errors.maxPages = "Max pages must be between 1 and 1000";
      }
      if (!formData.crawlConfig.maxDepth || formData.crawlConfig.maxDepth < 1 || formData.crawlConfig.maxDepth > 10) {
        errors.maxDepth = "Max depth must be between 1 and 10";
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (loadingState.submitting) return;
    
    if (!validateForm()) return;

    // Set submitting state
    setLoadingState(prev => ({ ...prev, submitting: true }));
    clearError();
    clearSuccess();

    try {
      const url = "/api/admin/config/knowledge-base";
      const method = editingUrl ? "PUT" : "POST";
      const payload = editingUrl ? { ...formData, id: editingUrl.id } : formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle validation errors
        if (response.status === 400 && errorData.validationErrors) {
          setFormErrors(errorData.validationErrors);
          showError('submit', 'Please fix the validation errors below');
          return;
        }
        
        // Handle duplicate URL error
        if (response.status === 409) {
          showError('submit', 'URL already exists', 'This URL is already configured in the knowledge base');
          return;
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Operation failed');
      }

      // Success - refresh data and reset form
      await fetchUrls();
      resetForm();
      
      const operation = editingUrl ? 'update' : 'create';
      const message = editingUrl 
        ? `URL configuration updated successfully`
        : `URL added successfully and ready for crawling`;
        
      showSuccess(operation, message);
      
    } catch (error) {
      console.error("Failed to save URL:", error);
      
      // Determine error type and message
      let errorType: ErrorState['type'] = 'submit';
      let errorMessage = editingUrl ? 'Failed to update URL configuration' : 'Failed to add URL configuration';
      let errorDetails = '';
      
      if (error instanceof Error) {
        if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
          errorType = 'network';
          errorMessage = 'Network connection failed';
          errorDetails = 'Please check your internet connection and try again';
        } else if (error.message.includes('timeout')) {
          errorType = 'network';
          errorMessage = 'Request timed out';
          errorDetails = 'The server took too long to respond. Please try again';
        } else {
          errorDetails = error.message;
        }
      }
      
      showError(errorType, errorMessage, errorDetails);
      
    } finally {
      setLoadingState(prev => ({ ...prev, submitting: false }));
    }
  };

  const handleDelete = async (id: number) => {
    const urlToDelete = urls.find(u => u.id === id);
    const confirmMessage = urlToDelete 
      ? `Are you sure you want to delete "${urlToDelete.url}"?\n\nThis will permanently remove the URL configuration and all associated indexed pages from the knowledge base.`
      : "Are you sure you want to delete this URL configuration?";
      
    if (!confirm(confirmMessage)) return;

    // Set deleting state for this specific URL
    setLoadingState(prev => ({ 
      ...prev, 
      deleting: { ...prev.deleting, [id]: true }
    }));
    clearError();
    clearSuccess();

    try {
      const response = await fetch("/api/admin/config/knowledge-base", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific error cases
        if (response.status === 404) {
          showError('delete', 'URL configuration not found', 'The URL may have been already deleted');
          // Still refresh to sync state
          await fetchUrls();
          return;
        }
        
        if (response.status === 409) {
          showError('delete', 'Cannot delete URL', 'URL is currently being crawled. Please wait for crawl to complete');
          return;
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Delete operation failed');
      }

      // Success - refresh data
      await fetchUrls();
      showSuccess('delete', `URL configuration deleted successfully`);
      
    } catch (error) {
      console.error("Failed to delete URL:", error);
      
      // Determine error type and message
      let errorType: ErrorState['type'] = 'delete';
      let errorMessage = 'Failed to delete URL configuration';
      let errorDetails = '';
      
      if (error instanceof Error) {
        if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
          errorType = 'network';
          errorMessage = 'Network connection failed';
          errorDetails = 'Please check your internet connection and try again';
        } else if (error.message.includes('timeout')) {
          errorType = 'network';
          errorMessage = 'Request timed out';
          errorDetails = 'The server took too long to respond. Please try again';
        } else {
          errorDetails = error.message;
        }
      }
      
      showError(errorType, errorMessage, errorDetails);
      
    } finally {
      setLoadingState(prev => ({ 
        ...prev, 
        deleting: { ...prev.deleting, [id]: false }
      }));
    }
  };

  const handleCrawl = async (id: number) => {
    const urlToCrawl = urls.find(u => u.id === id);
    
    // Pre-flight validation
    if (!urlToCrawl) {
      showError('crawl', 'URL not found', 'Please refresh the page and try again');
      return;
    }
    
    if (!urlToCrawl.isActive) {
      showError('crawl', 'Cannot crawl inactive URL', 'Please activate the URL first');
      return;
    }
    
    if (urlToCrawl.crawlStatus === 'in_progress') {
      showError('crawl', 'Crawl already in progress', 'Please wait for the current crawl to complete');
      return;
    }

    // Set crawling state for this specific URL
    setLoadingState(prev => ({ 
      ...prev, 
      crawling: { ...prev.crawling, [id]: true }
    }));
    clearError();
    clearSuccess();
    
    try {
      const response = await fetch("/api/admin/config/knowledge-base/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific error cases
        if (response.status === 404) {
          showError('crawl', 'URL configuration not found', 'The URL may have been deleted');
          await fetchUrls(); // Refresh to sync state
          return;
        }
        
        if (response.status === 400) {
          showError('crawl', 'Invalid crawl request', errorData.message || 'Please check URL configuration');
          return;
        }
        
        if (response.status === 409) {
          showError('crawl', 'Crawl conflict', 'URL is already being crawled or is inactive');
          return;
        }
        
        if (response.status === 503) {
          showError('crawl', 'Service temporarily unavailable', 'The crawling service is busy. Please try again in a few minutes');
          return;
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to start crawl');
      }

      // Success - refresh data to show updated status
      await fetchUrls();
      showSuccess('crawl', `Crawl started successfully for ${urlToCrawl.url}`);
      
    } catch (error) {
      console.error("Failed to start crawl:", error);
      
      // Determine error type and message
      let errorType: ErrorState['type'] = 'crawl';
      let errorMessage = 'Failed to start crawling';
      let errorDetails = '';
      
      if (error instanceof Error) {
        if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
          errorType = 'network';
          errorMessage = 'Network connection failed';
          errorDetails = 'Please check your internet connection and try again';
        } else if (error.message.includes('timeout')) {
          errorType = 'network';
          errorMessage = 'Request timed out';
          errorDetails = 'The crawling service took too long to respond. Please try again';
        } else {
          errorDetails = error.message;
        }
      }
      
      showError(errorType, errorMessage, errorDetails);
      
    } finally {
      setLoadingState(prev => ({ 
        ...prev, 
        crawling: { ...prev.crawling, [id]: false }
      }));
    }
  };

  const startEditing = (url: RagUrlConfig) => {
    setEditingUrl(url);
    setFormData({
      url: url.url,
      namespace: url.namespace,
      crawlConfig: url.crawlConfig,
      isActive: url.isActive
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingUrl(null);
    setFormData({
      url: '',
      namespace: '',
      crawlConfig: {
        mode: 'limited',
        maxPages: 10,
        maxDepth: 2
      },
      isActive: true
    });
    setFormErrors({});
  };

  const generateNamespace = () => {
    if (formData.url) {
      try {
        const urlObj = new URL(formData.url);
        const domain = urlObj.hostname.replace(/^www\./, '');
        const namespace = domain.replace(/\./g, '-');
        setFormData(prev => ({ ...prev, namespace }));
      } catch {
        // Invalid URL, ignore
      }
    }
  };

  const getStatusIcon = (status: RagUrlConfig['crawlStatus']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'in_progress':
        return <Loader className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: RagUrlConfig['crawlStatus']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  if (loadingState.initial) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Base Configuration</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage URLs for RAG knowledge base with crawling configuration
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchUrls(true)}
            disabled={loadingState.refreshing}
            className="flex items-center px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            {loadingState.refreshing ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            disabled={loadingState.submitting}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add URL
          </button>
        </div>
      </div>

      {/* Error Notification */}
      {errorState && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              {errorState.type === 'network' ? (
                <WifiOff className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-300">
                  {errorState.message}
                </h4>
                {errorState.details && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {errorState.details}
                  </p>
                )}
                <div className="flex items-center space-x-3 mt-3">
                  <button
                    onClick={clearError}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                  >
                    Dismiss
                  </button>
                  {(errorState.type === 'network' || errorState.type === 'fetch') && (
                    <button
                      onClick={() => retryOperation(errorState.type)}
                      disabled={loadingState.refreshing}
                      className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 font-medium disabled:opacity-50 flex items-center"
                    >
                      {loadingState.refreshing && (
                        <Loader className="w-3 h-3 mr-1 animate-spin" />
                      )}
                      Retry
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {lastSuccessOperation && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-green-800 dark:text-green-300">
                  {lastSuccessOperation.message}
                </h4>
              </div>
            </div>
            <button
              onClick={clearSuccess}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {loadingState.refreshing && (
          <div className="absolute top-2 right-2 z-10">
            <Loader className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        )}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center">
            <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{urls.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total URLs</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mr-3" />
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {urls.filter(u => u.isActive).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center">
            <RefreshCw className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-3" />
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {urls.filter(u => u.crawlStatus === 'success').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Crawled</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center">
            <Link className="w-6 h-6 text-orange-600 dark:text-orange-400 mr-3" />
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {urls.reduce((sum, u) => sum + (u.pagesIndexed || 0), 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Pages Indexed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-600 relative">
          {loadingState.submitting && (
            <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 rounded-xl flex items-center justify-center z-10">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
                <div className="flex items-center space-x-3">
                  <Loader className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                  <span className="text-gray-900 dark:text-white font-medium">
                    {editingUrl ? 'Updating URL configuration...' : 'Adding URL configuration...'}
                  </span>
                </div>
              </div>
            </div>
          )}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingUrl ? 'Edit URL Configuration' : 'Add New URL'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* URL */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  onBlur={generateNamespace}
                  placeholder="https://example.com"
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                    formErrors.url ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {formErrors.url && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.url}</p>
                )}
              </div>

              {/* Namespace */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Namespace
                </label>
                <input
                  type="text"
                  value={formData.namespace}
                  onChange={(e) => setFormData(prev => ({ ...prev, namespace: e.target.value }))}
                  placeholder="example-com"
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                    formErrors.namespace ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Used to organize content in vector database
                </p>
                {formErrors.namespace && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.namespace}</p>
                )}
              </div>

              {/* Crawl Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Crawl Mode
                </label>
                <select
                  value={formData.crawlConfig.mode}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    crawlConfig: { 
                      ...prev.crawlConfig, 
                      mode: e.target.value as CrawlConfig['mode']
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="single">Single Page</option>
                  <option value="limited">Limited Crawl</option>
                  <option value="deep">Deep Crawl</option>
                </select>
              </div>

              {/* Max Pages */}
              {formData.crawlConfig.mode !== 'single' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Pages
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.crawlConfig.maxPages || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      crawlConfig: { 
                        ...prev.crawlConfig, 
                        maxPages: parseInt(e.target.value) || undefined
                      }
                    }))}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                      formErrors.maxPages ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {formErrors.maxPages && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.maxPages}</p>
                  )}
                </div>
              )}

              {/* Max Depth */}
              {formData.crawlConfig.mode !== 'single' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Depth
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.crawlConfig.maxDepth || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      crawlConfig: { 
                        ...prev.crawlConfig, 
                        maxDepth: parseInt(e.target.value) || undefined
                      }
                    }))}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                      formErrors.maxDepth ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {formErrors.maxDepth && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.maxDepth}</p>
                  )}
                </div>
              )}

              {/* Active checkbox */}
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                disabled={loadingState.submitting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loadingState.submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loadingState.submitting && (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                )}
                {loadingState.submitting
                  ? (editingUrl ? 'Updating...' : 'Adding...')
                  : (editingUrl ? 'Update URL' : 'Add URL')
                }
              </button>
            </div>
          </form>
        </div>
      )}

      {/* URLs List */}
      <div className="space-y-4">
        {urls.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No URLs configured. Add your first URL to start building your knowledge base.
          </div>
        ) : (
          urls.map((url) => (
            <div key={url.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-600">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {url.url}
                    </h3>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                      {url.namespace}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(url.crawlStatus)}`}>
                      {getStatusIcon(url.crawlStatus)}
                      <span className="ml-1 capitalize">{url.crawlStatus.replace('_', ' ')}</span>
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      url.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                    }`}>
                      {url.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Crawl Mode:</span>
                      <span className="ml-1 font-medium text-gray-900 dark:text-white capitalize">
                        {url.crawlConfig.mode.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Pages Indexed:</span>
                      <span className="ml-1 font-medium text-gray-900 dark:text-white">
                        {url.pagesIndexed?.toLocaleString() || 0}
                      </span>
                    </div>
                    {url.crawlConfig.maxPages && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Max Pages:</span>
                        <span className="ml-1 font-medium text-gray-900 dark:text-white">
                          {url.crawlConfig.maxPages}
                        </span>
                      </div>
                    )}
                    {url.crawlConfig.maxDepth && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Max Depth:</span>
                        <span className="ml-1 font-medium text-gray-900 dark:text-white">
                          {url.crawlConfig.maxDepth}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Last Crawled */}
                  {url.lastCrawled && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Last crawled: {new Date(url.lastCrawled).toLocaleString()}
                    </div>
                  )}

                  {/* Error Message */}
                  {url.errorMessage && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-sm font-medium text-red-800 dark:text-red-300">
                          Crawl Error
                        </span>
                      </div>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {url.errorMessage}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleCrawl(url.id)}
                    disabled={
                      loadingState.crawling[url.id] || 
                      url.crawlStatus === 'in_progress' || 
                      !url.isActive ||
                      loadingState.deleting[url.id]
                    }
                    className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      loadingState.crawling[url.id] 
                        ? "Crawl starting..." 
                        : url.crawlStatus === 'in_progress'
                        ? "Crawl in progress"
                        : !url.isActive 
                        ? "Activate URL first" 
                        : "Start Crawl"
                    }
                  >
                    {loadingState.crawling[url.id] || url.crawlStatus === 'in_progress' ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => startEditing(url)}
                    disabled={
                      loadingState.crawling[url.id] || 
                      loadingState.deleting[url.id] || 
                      url.crawlStatus === 'in_progress'
                    }
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      loadingState.crawling[url.id] || loadingState.deleting[url.id] || url.crawlStatus === 'in_progress'
                        ? "Cannot edit during operation"
                        : "Edit URL configuration"
                    }
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(url.id)}
                    disabled={
                      loadingState.deleting[url.id] || 
                      loadingState.crawling[url.id] ||
                      url.crawlStatus === 'in_progress'
                    }
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      loadingState.deleting[url.id]
                        ? "Deleting..."
                        : loadingState.crawling[url.id] || url.crawlStatus === 'in_progress'
                        ? "Cannot delete during operation"
                        : "Delete URL configuration"
                    }
                  >
                    {loadingState.deleting[url.id] ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default KnowledgeBaseConfig;