import React, { useState } from "react";
import { EmbeddingProvider } from "@/utils/embeddings";
import { CrawlConfig, CrawlStats } from "@/types";

interface CrawlFormProps {
  onCrawlComplete?: () => void;
}

interface CrawlResult {
  success: boolean; 
  message: string;
  crawlStats?: CrawlStats;
  crawlConfig?: CrawlConfig;
  warning?: string;
}

const CrawlForm: React.FC<CrawlFormProps> = ({ onCrawlComplete }) => {
  const [url, setUrl] = useState("");
  const [embeddingProvider, setEmbeddingProvider] = useState<EmbeddingProvider>("openai");
  const [crawlMode, setCrawlMode] = useState<'single' | 'limited' | 'deep'>('single');
  const [maxPages, setMaxPages] = useState<number>(10);
  const [maxDepth, setMaxDepth] = useState<number>(2);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CrawlResult | null>(null);

  // Client-side validation
  const validateForm = (): string | null => {
    if (crawlMode === 'limited' && (maxPages < 1 || maxPages > 50)) {
      return "For limited crawl, pages must be between 1 and 50";
    }
    if (crawlMode === 'deep' && ![2, 3].includes(maxDepth)) {
      return "For deep crawl, depth must be 2 or 3 levels";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setResult({ success: false, message: validationError });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // Build crawl configuration
      const crawlConfig: CrawlConfig = {
        mode: crawlMode,
        ...(crawlMode === 'limited' && { maxPages }),
        ...(crawlMode === 'deep' && { maxDepth }),
      };

      const response = await fetch("/api/crawl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          embeddingProvider,
          crawlConfig,
          options: {
            splittingMethod: "recursive",
            chunkSize: 1000,
            chunkOverlap: 200,
          },
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        const stats = data.data.crawlStats;
        const statsMessage = stats ? 
          ` Processed ${stats.pagesProcessed} pages in ${Math.round(stats.crawlDuration / 1000)}s` : "";
        
        // Check for warnings about failed pages
        const warningMessage = data.data.warning || 
          (stats?.failedPages?.length > 0 ? ` Warning: ${stats.failedPages.length} pages failed to crawl.` : "");
        
        setResult({ 
          success: true, 
          message: "Successfully crawled and indexed the website!" + statsMessage,
          crawlStats: stats,
          crawlConfig: data.data.crawlConfig,
          warning: warningMessage
        });
        onCrawlComplete?.();
      } else {
        setResult({ success: false, message: data.error || "Failed to crawl website" });
      }
    } catch {
      setResult({ success: false, message: "An error occurred while crawling" });
    } finally {
      setIsLoading(false);
    }
  };

  // Get estimated time hint
  const getTimeEstimate = (): string => {
    switch (crawlMode) {
      case 'single': return "~30 seconds";
      case 'limited': return `~${Math.ceil(maxPages / 5)} minutes`;
      case 'deep': return "~5-10 minutes";
      default: return "";
    }
  };

  // Get loading message based on mode
  const getLoadingMessage = (): string => {
    switch (crawlMode) {
      case 'single': return "Crawling page...";
      case 'limited': return `Crawling ${maxPages} pages...`;
      case 'deep': return `Deep crawling ${maxDepth} levels...`;
      default: return "Crawling...";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
        Crawl Website
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Website URL
          </label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Crawl Mode
          </label>
          <div className="space-y-3">
            <label className="flex items-start">
              <input
                type="radio"
                name="crawlMode"
                value="single"
                checked={crawlMode === "single"}
                onChange={(e) => setCrawlMode(e.target.value as 'single' | 'limited' | 'deep')}
                className="mr-3 mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Single Page</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Crawl only the specified URL (~30 seconds)</p>
              </div>
            </label>
            <label className="flex items-start">
              <input
                type="radio"
                name="crawlMode"
                value="limited"
                checked={crawlMode === "limited"}
                onChange={(e) => setCrawlMode(e.target.value as 'single' | 'limited' | 'deep')}
                className="mr-3 mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Limited Crawl</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Crawl a specific number of pages from the site</p>
              </div>
            </label>
            <label className="flex items-start">
              <input
                type="radio"
                name="crawlMode"
                value="deep"
                checked={crawlMode === "deep"}
                onChange={(e) => setCrawlMode(e.target.value as 'single' | 'limited' | 'deep')}
                className="mr-3 mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Deep Crawl</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Crawl multiple levels deep across the site (5-10 minutes)</p>
              </div>
            </label>
          </div>
        </div>

        {/* Conditional fields */}
        {crawlMode === 'limited' && (
          <div>
            <label htmlFor="maxPages" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pages to Crawl (1-50)
            </label>
            <input
              type="number"
              id="maxPages"
              min="1"
              max="50"
              value={maxPages}
              onChange={(e) => setMaxPages(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Estimated time: {getTimeEstimate()}
            </p>
          </div>
        )}

        {crawlMode === 'deep' && (
          <div>
            <label htmlFor="maxDepth" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Depth
            </label>
            <select
              id="maxDepth"
              value={maxDepth}
              onChange={(e) => setMaxDepth(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value={2}>2 levels</option>
              <option value={3}>3 levels</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Estimated time: {getTimeEstimate()}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Embedding Provider
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="embeddingProvider"
                value="openai"
                checked={embeddingProvider === "openai"}
                onChange={(e) => setEmbeddingProvider(e.target.value as EmbeddingProvider)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">OpenAI (1024 dim)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="embeddingProvider"
                value="google"
                checked={embeddingProvider === "google"}
                onChange={(e) => setEmbeddingProvider(e.target.value as EmbeddingProvider)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Google (768 dim)</span>
            </label>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !url}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? getLoadingMessage() : "Crawl Website"}
        </button>
      </form>

      {result && (
        <div className={`mt-4 p-3 rounded-lg ${
          result.success 
            ? (result.warning ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200" : "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200")
            : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
        }`}>
          <p>{result.message}</p>
          
          {result.warning && (
            <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded text-sm">
              <p className="font-medium">⚠️ Warning:</p>
              <p>{result.warning}</p>
            </div>
          )}
          
          {result.success && result.crawlStats && (
            <div className="mt-2 text-sm">
              <p>📄 Pages found: {result.crawlStats.pagesFound}</p>
              <p>✅ Pages processed: {result.crawlStats.pagesProcessed}</p>
              <p>🔍 Total tokens: {result.crawlStats.totalTokens.toLocaleString()}</p>
              
              {result.crawlStats.failedPages && result.crawlStats.failedPages.length > 0 && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded">
                  <p className="font-medium">❌ Failed Pages ({result.crawlStats.failedPages.length}):</p>
                  <ul className="mt-1 text-xs max-h-20 overflow-y-auto">
                    {result.crawlStats.failedPages.map((url, index) => (
                      <li key={index} className="truncate" title={url}>• {url}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {result.crawlStats.errors && result.crawlStats.errors.length > 0 && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded">
                  <p className="font-medium">🔍 Error Details ({result.crawlStats.errors.length}):</p>
                  <ul className="mt-1 text-xs max-h-20 overflow-y-auto">
                    {result.crawlStats.errors.map((error, index) => (
                      <li key={index} className="text-red-600 dark:text-red-400">{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CrawlForm; 