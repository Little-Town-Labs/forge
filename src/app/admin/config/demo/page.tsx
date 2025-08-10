"use client";

import React, { useState } from "react";
import { Settings, Database, Activity, Shield, Key } from "lucide-react";
import ConfigSection from "@/components/shared/ConfigSection";
import ValidationInput, { validationRules } from "@/components/shared/ValidationInput";
import StatusIndicator, { HealthIndicator, ConnectionIndicator, ServiceIndicator } from "@/components/shared/StatusIndicator";

/**
 * Demo page showcasing all the admin configuration UI components
 * This demonstrates how the components integrate and work together
 */
const AdminConfigDemo: React.FC = () => {
  const [formData, setFormData] = useState({
    apiKey: "",
    email: "",
    url: "",
    namespace: "",
    temperature: ""
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Admin Configuration Components Demo
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Showcase of all available UI components for the admin configuration system
          </p>
        </div>

        {/* Status Indicators Demo */}
        <ConfigSection
          title="Status Indicators"
          description="Various status indicators for system health and connectivity"
          icon={Activity}
        >
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Basic Status Indicators</h4>
              <div className="flex flex-wrap gap-4">
                <StatusIndicator status="healthy" />
                <StatusIndicator status="warning" />
                <StatusIndicator status="critical" />
                <StatusIndicator status="loading" animated />
                <StatusIndicator status="unknown" />
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Different Sizes</h4>
              <div className="flex flex-wrap items-center gap-4">
                <StatusIndicator status="healthy" size="sm" />
                <StatusIndicator status="healthy" size="md" />
                <StatusIndicator status="healthy" size="lg" />
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Specialized Indicators</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                  <h5 className="font-medium mb-2">Health Indicator</h5>
                  <HealthIndicator health="healthy" />
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                  <h5 className="font-medium mb-2">Connection Status</h5>
                  <ConnectionIndicator connected={true} />
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                  <h5 className="font-medium mb-2">Service Status</h5>
                  <ServiceIndicator enabled={true} working={true} />
                </div>
              </div>
            </div>
          </div>
        </ConfigSection>

        {/* Validation Input Demo */}
        <ConfigSection
          title="Validation Input Components"
          description="Form inputs with built-in validation, visual feedback, and accessibility features"
          icon={Settings}
          headerActions={
            <button className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded">
              Clear All
            </button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ValidationInput
              label="OpenAI API Key"
              value={formData.apiKey}
              onChange={(value) => setFormData(prev => ({ ...prev, apiKey: value }))}
              type="password"
              placeholder="sk-..."
              required
              validationRules={[
                validationRules.required(),
                validationRules.apiKey('openai')
              ]}
              helperText="Enter your OpenAI API key starting with 'sk-'"
            />

            <ValidationInput
              label="Admin Email"
              value={formData.email}
              onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
              type="email"
              placeholder="admin@company.com"
              required
              validationRules={[
                validationRules.required(),
                validationRules.email()
              ]}
              helperText="Must be a valid email address"
            />

            <ValidationInput
              label="Crawl URL"
              value={formData.url}
              onChange={(value) => setFormData(prev => ({ ...prev, url: value }))}
              type="url"
              placeholder="https://example.com"
              required
              validationRules={[
                validationRules.required(),
                validationRules.url()
              ]}
              helperText="Enter a valid HTTP or HTTPS URL"
            />

            <ValidationInput
              label="Namespace"
              value={formData.namespace}
              onChange={(value) => setFormData(prev => ({ ...prev, namespace: value }))}
              type="text"
              placeholder="my-namespace"
              required
              validationRules={[
                validationRules.required(),
                validationRules.namespace(),
                validationRules.minLength(3)
              ]}
              helperText="Letters, numbers, hyphens, and underscores only"
              maxLength={50}
            />

            <ValidationInput
              label="Temperature"
              value={formData.temperature}
              onChange={(value) => setFormData(prev => ({ ...prev, temperature: value }))}
              type="number"
              placeholder="0.7"
              min={0}
              max={2}
              step={0.1}
              validationRules={[
                validationRules.numeric(),
                validationRules.range(0, 2)
              ]}
              helperText="Controls randomness in AI responses (0.0 - 2.0)"
            />
          </div>
        </ConfigSection>

        {/* Config Section Variations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ConfigSection
            title="Database Configuration"
            description="Connection settings and credentials"
            icon={Database}
            headerActions={
              <div className="flex items-center space-x-2">
                <ConnectionIndicator connected={true} size="sm" />
                <span className="text-sm text-green-600 dark:text-green-400">Connected</span>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Database:</span>
                <span className="font-medium">forge_production</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Response Time:</span>
                <span className="font-medium">42ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Tables:</span>
                <span className="font-medium">3</span>
              </div>
            </div>
          </ConfigSection>

          <ConfigSection
            title="Security Settings"
            description="Encryption and access control"
            icon={Shield}
            headerActions={
              <ServiceIndicator enabled={true} working={true} size="sm" text="Secure" />
            }
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Encryption</span>
                <StatusIndicator status="healthy" size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">API Keys</span>
                <StatusIndicator status="healthy" size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Access Control</span>
                <StatusIndicator status="healthy" size="sm" />
              </div>
            </div>
          </ConfigSection>
        </div>

        {/* Feature Showcase */}
        <ConfigSection
          title="Component Features"
          description="Demonstration of advanced component capabilities"
          icon={Key}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Status Types</h4>
              <div className="space-y-2">
                {(['healthy', 'warning', 'critical', 'loading', 'unknown'] as const).map(status => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{status}</span>
                    <StatusIndicator status={status} size="sm" animated={status === 'loading'} />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Validation Features</h4>
              <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Real-time validation</li>
                <li>• Custom validation rules</li>
                <li>• Visual feedback indicators</li>
                <li>• Password visibility toggle</li>
                <li>• Character count display</li>
                <li>• Accessibility support</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Design System</h4>
              <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Consistent styling</li>
                <li>• Dark mode support</li>
                <li>• Responsive design</li>
                <li>• Loading states</li>
                <li>• Error handling</li>
                <li>• Accessibility compliant</li>
              </ul>
            </div>
          </div>
        </ConfigSection>
      </div>
    </div>
  );
};

export default AdminConfigDemo;