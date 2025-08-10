"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, TestTube, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";

interface AiModelConfig {
  id: number;
  provider: 'openai' | 'google';
  modelName: string;
  isDefault: boolean;
  isEnabled: boolean;
  temperature: number;
  maxTokens: number;
  topP: number;
  systemPrompt?: string;
  apiKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ModelFormData {
  provider: 'openai' | 'google';
  modelName: string;
  isDefault: boolean;
  isEnabled: boolean;
  temperature: number;
  maxTokens: number;
  topP: number;
  systemPrompt: string;
  apiKey: string;
}

interface TestResult {
  success: boolean;
  responseTime: number;
  error?: string;
  provider: string;
}

const AIModelConfig: React.FC = () => {
  const [models, setModels] = useState<AiModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState<AiModelConfig | null>(null);
  const [showApiKey, setShowApiKey] = useState<{[key: number]: boolean}>({});
  const [testResults, setTestResults] = useState<{[key: number]: TestResult}>({});
  const [testing, setTesting] = useState<{[key: number]: boolean}>({});

  const [formData, setFormData] = useState<ModelFormData>({
    provider: 'openai',
    modelName: 'gpt-4o-mini',
    isDefault: false,
    isEnabled: true,
    temperature: 0.7,
    maxTokens: 4000,
    topP: 1.0,
    systemPrompt: '',
    apiKey: ''
  });

  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch("/api/admin/config/models");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setModels(data.data.models);
        }
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.modelName.trim()) errors.modelName = "Model name is required";
    if (formData.temperature < 0 || formData.temperature > 2) errors.temperature = "Temperature must be between 0 and 2";
    if (formData.maxTokens < 1 || formData.maxTokens > 100000) errors.maxTokens = "Max tokens must be between 1 and 100,000";
    if (formData.topP < 0 || formData.topP > 1) errors.topP = "Top P must be between 0 and 1";
    if (!formData.apiKey.trim()) errors.apiKey = "API key is required";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const url = editingModel ? "/api/admin/config/models" : "/api/admin/config/models";
      const method = editingModel ? "PUT" : "POST";
      const payload = editingModel ? { ...formData, id: editingModel.id } : formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await fetchModels();
        resetForm();
      } else {
        const error = await response.json();
        console.error("Failed to save model:", error);
      }
    } catch (error) {
      console.error("Failed to save model:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this model configuration?")) return;

    try {
      const response = await fetch("/api/admin/config/models", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        await fetchModels();
      }
    } catch (error) {
      console.error("Failed to delete model:", error);
    }
  };

  const handleTestConnection = async (model: AiModelConfig) => {
    setTesting(prev => ({ ...prev, [model.id]: true }));
    
    try {
      const response = await fetch("/api/admin/config/models/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: model.provider,
          apiKey: model.apiKey,
          modelName: model.modelName
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTestResults(prev => ({ ...prev, [model.id]: data.data }));
        }
      }
    } catch (error) {
      console.error("Failed to test model:", error);
    } finally {
      setTesting(prev => ({ ...prev, [model.id]: false }));
    }
  };

  const startEditing = (model: AiModelConfig) => {
    setEditingModel(model);
    setFormData({
      provider: model.provider,
      modelName: model.modelName,
      isDefault: model.isDefault,
      isEnabled: model.isEnabled,
      temperature: model.temperature,
      maxTokens: model.maxTokens,
      topP: model.topP,
      systemPrompt: model.systemPrompt || '',
      apiKey: model.apiKey || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingModel(null);
    setFormData({
      provider: 'openai',
      modelName: 'gpt-4o-mini',
      isDefault: false,
      isEnabled: true,
      temperature: 0.7,
      maxTokens: 4000,
      topP: 1.0,
      systemPrompt: '',
      apiKey: ''
    });
    setFormErrors({});
  };

  const toggleApiKeyVisibility = (modelId: number) => {
    setShowApiKey(prev => ({ ...prev, [modelId]: !prev[modelId] }));
  };

  const providerOptions = [
    { value: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
    { value: 'google', label: 'Google AI', models: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro', 'gemini-1.5-flash'] }
  ];

  const selectedProviderModels = providerOptions.find(p => p.value === formData.provider)?.models || [];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI Model Configuration</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Configure OpenAI and Google AI models with API keys and parameters
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Model
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingModel ? 'Edit Model' : 'Add New Model'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Provider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Provider
                </label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    provider: e.target.value as 'openai' | 'google',
                    modelName: providerOptions.find(p => p.value === e.target.value)?.models[0] || ''
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {providerOptions.map(provider => (
                    <option key={provider.value} value={provider.value}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Model Name
                </label>
                <select
                  value={formData.modelName}
                  onChange={(e) => setFormData(prev => ({ ...prev, modelName: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                    formErrors.modelName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {selectedProviderModels.map(model => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                {formErrors.modelName && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.modelName}</p>
                )}
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Temperature ({formData.temperature})
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Precise (0)</span>
                  <span>Creative (2)</span>
                </div>
                {formErrors.temperature && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.temperature}</p>
                )}
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Tokens
                </label>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={formData.maxTokens}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                    formErrors.maxTokens ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {formErrors.maxTokens && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.maxTokens}</p>
                )}
              </div>

              {/* Top P */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Top P ({formData.topP})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.topP}
                  onChange={(e) => setFormData(prev => ({ ...prev, topP: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                {formErrors.topP && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.topP}</p>
                )}
              </div>

              {/* Checkboxes */}
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Default Model</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, isEnabled: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Enabled</span>
                </label>
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Enter API key..."
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                  formErrors.apiKey ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {formErrors.apiKey && (
                <p className="text-red-500 text-xs mt-1">{formErrors.apiKey}</p>
              )}
            </div>

            {/* System Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                System Prompt (Optional)
              </label>
              <textarea
                value={formData.systemPrompt}
                onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                placeholder="Enter system prompt..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
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
                {editingModel ? 'Update Model' : 'Add Model'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Models List */}
      <div className="space-y-4">
        {models.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No AI models configured. Add your first model to get started.
          </div>
        ) : (
          models.map((model) => {
            const testResult = testResults[model.id];
            const isTestingModel = testing[model.id];
            
            return (
              <div key={model.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-600">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {model.modelName}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        model.provider === 'openai' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                      }`}>
                        {model.provider === 'openai' ? 'OpenAI' : 'Google AI'}
                      </span>
                      {model.isDefault && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
                          Default
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        model.isEnabled
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                      }`}>
                        {model.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Temperature:</span>
                        <span className="ml-1 font-medium text-gray-900 dark:text-white">{model.temperature}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Max Tokens:</span>
                        <span className="ml-1 font-medium text-gray-900 dark:text-white">{model.maxTokens.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Top P:</span>
                        <span className="ml-1 font-medium text-gray-900 dark:text-white">{model.topP}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">API Key:</span>
                        <div className="flex items-center space-x-1">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {showApiKey[model.id] ? (model.apiKey || '[None]') : '••••••••'}
                          </span>
                          <button
                            onClick={() => toggleApiKeyVisibility(model.id)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showApiKey[model.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Test Result */}
                    {testResult && (
                      <div className={`mt-3 p-3 rounded-lg ${
                        testResult.success 
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      }`}>
                        <div className="flex items-center space-x-2">
                          {testResult.success ? (
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          )}
                          <span className={`text-sm font-medium ${
                            testResult.success 
                              ? 'text-green-800 dark:text-green-300' 
                              : 'text-red-800 dark:text-red-300'
                          }`}>
                            {testResult.success ? 'Connection successful' : 'Connection failed'}
                          </span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            ({testResult.responseTime}ms)
                          </span>
                        </div>
                        {!testResult.success && testResult.error && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {testResult.error}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleTestConnection(model)}
                      disabled={isTestingModel}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                      title="Test Connection"
                    >
                      {isTestingModel ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => startEditing(model)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(model.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {model.systemPrompt && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">System Prompt:</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      {model.systemPrompt}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AIModelConfig;