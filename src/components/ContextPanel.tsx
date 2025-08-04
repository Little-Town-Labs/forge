import React from "react";
import { ScoredVector } from "@/types";

interface ContextPanelProps {
  context: ScoredVector[] | null;
  isLoading?: boolean;
}

const ContextPanel: React.FC<ContextPanelProps> = ({ context, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-lg">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Loading context...
        </h3>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!context || context.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-lg">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          No relevant context found
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          The AI will respond based on its general knowledge.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-lg">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Relevant Context ({context.length} sources)
      </h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {context.map((item, index) => (
          <div key={index} className="border-l-2 border-blue-500 pl-3 bg-white dark:bg-gray-700 rounded-r-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Score: {(item.score * 100).toFixed(1)}%
              </span>
              <a
                href={item.metadata.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:text-blue-600 font-medium"
              >
                Source →
              </a>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {item.metadata.chunk.length > 300 
                ? `${item.metadata.chunk.substring(0, 300)}...`
                : item.metadata.chunk
              }
            </p>
            {item.metadata.title && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {item.metadata.title}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Context is used to provide accurate, relevant responses based on indexed knowledge.
        </p>
      </div>
    </div>
  );
};

export default ContextPanel; 