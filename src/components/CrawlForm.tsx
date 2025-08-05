import React, { useState } from "react";
import { EmbeddingProvider } from "@/utils/embeddings";

interface CrawlFormProps {
  onCrawlComplete?: () => void;
}

const CrawlForm: React.FC<CrawlFormProps> = ({ onCrawlComplete }) => {
  const [url, setUrl] = useState("");
  const [embeddingProvider, setEmbeddingProvider] = useState<EmbeddingProvider>("openai");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/crawl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          embeddingProvider,
          options: {
            splittingMethod: "recursive",
            chunkSize: 1000,
            chunkOverlap: 200,
          },
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult({ success: true, message: "Successfully crawled and indexed the website!" });
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
          {isLoading ? "Crawling..." : "Crawl Website"}
        </button>
      </form>

      {result && (
        <div className={`mt-4 p-3 rounded-lg ${
          result.success 
            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200" 
            : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
        }`}>
          {result.message}
        </div>
      )}
    </div>
  );
};

export default CrawlForm; 