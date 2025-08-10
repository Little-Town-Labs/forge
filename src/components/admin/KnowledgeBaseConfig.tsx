"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Play, RefreshCw, Link, Globe, Clock, CheckCircle, AlertCircle, XCircle, Loader } from "lucide-react";
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

const KnowledgeBaseConfig: React.FC = () => {
  const [urls, setUrls] = useState<RagUrlConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUrl, setEditingUrl] = useState<RagUrlConfig | null>(null);
  const [crawling, setCrawling] = useState<{[key: number]: boolean}>({});

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
  }, [urls]);

  const fetchUrls = async () => {
    try {
      const response = await fetch("/api/admin/config/knowledge-base");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUrls(data.data.urls);
        }
      }
    } catch (error) {
      console.error("Failed to fetch URLs:", error);
    } finally {
      setLoading(false);
    }
  };

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
    if (!validateForm()) return;

    try {
      const url = "/api/admin/config/knowledge-base";
      const method = editingUrl ? "PUT" : "POST";
      const payload = editingUrl ? { ...formData, id: editingUrl.id } : formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await fetchUrls();
        resetForm();
      } else {
        const error = await response.json();
        console.error("Failed to save URL:", error);
      }
    } catch (error) {
      console.error("Failed to save URL:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this URL configuration?")) return;

    try {
      const response = await fetch("/api/admin/config/knowledge-base", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        await fetchUrls();
      }
    } catch (error) {
      console.error("Failed to delete URL:", error);
    }
  };

  const handleCrawl = async (id: number) => {
    setCrawling(prev => ({ ...prev, [id]: true }));
    
    try {
      const response = await fetch("/api/admin/config/knowledge-base/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        await fetchUrls();
      } else {
        const error = await response.json();
        console.error("Failed to start crawl:", error);
      }
    } catch (error) {
      console.error("Failed to start crawl:", error);
    } finally {
      setCrawling(prev => ({ ...prev, [id]: false }));
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

  if (loading) {
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
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add URL
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-600">
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
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingUrl ? 'Update URL' : 'Add URL'}
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
                    disabled={crawling[url.id] || url.crawlStatus === 'in_progress' || !url.isActive}
                    className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={url.isActive ? "Start Crawl" : "Activate URL first"}
                  >
                    {crawling[url.id] || url.crawlStatus === 'in_progress' ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => startEditing(url)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(url.id)}
                    disabled={url.crawlStatus === 'in_progress'}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
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