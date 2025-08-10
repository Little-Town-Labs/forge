"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";

interface ValidationRule {
  test: (value: string) => boolean;
  message: string;
}

interface ValidationInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'url' | 'number';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  validationRules?: ValidationRule[];
  showValidation?: boolean;
  helperText?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
}

const ValidationInput: React.FC<ValidationInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  className = "",
  validationRules = [],
  showValidation = true,
  helperText,
  maxLength,
  min,
  max,
  step
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Run validation rules
  const validationErrors = validationRules
    .filter(rule => !rule.test(value))
    .map(rule => rule.message);

  const hasErrors = validationErrors.length > 0 && isTouched;
  const isValid = validationErrors.length === 0 && value.trim() !== '' && isTouched;

  const handleBlur = () => {
    setIsTouched(true);
    setIsFocused(false);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const inputType = type === 'password' && showPassword ? 'text' : type;

  const inputClassName = `
    w-full px-3 py-2 border rounded-lg transition-colors duration-200
    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
    focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:opacity-50 disabled:cursor-not-allowed
    ${hasErrors 
      ? 'border-red-500 focus:ring-red-500' 
      : isValid 
        ? 'border-green-500 focus:ring-green-500'
        : 'border-gray-300 dark:border-gray-600'
    }
    ${type === 'password' ? 'pr-10' : ''}
    ${className}
  `;

  return (
    <div className="space-y-2">
      {/* Label */}
      <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Input Container */}
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          min={min}
          max={max}
          step={step}
          className={inputClassName}
        />

        {/* Password visibility toggle */}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Validation icon */}
        {showValidation && isTouched && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {hasErrors ? (
              <AlertCircle className="w-4 h-4 text-red-500" />
            ) : isValid ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : null}
          </div>
        )}
      </div>

      {/* Helper text */}
      {helperText && !hasErrors && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}

      {/* Character count */}
      {maxLength && isFocused && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
          {value.length}/{maxLength}
        </p>
      )}

      {/* Validation errors */}
      {hasErrors && showValidation && (
        <div className="space-y-1">
          {validationErrors.map((error, index) => (
            <p key={index} className="text-xs text-red-600 dark:text-red-400 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
              {error}
            </p>
          ))}
        </div>
      )}

      {/* Success message */}
      {isValid && showValidation && !hasErrors && (
        <p className="text-xs text-green-600 dark:text-green-400 flex items-center">
          <CheckCircle className="w-3 h-3 mr-1" />
          Looks good!
        </p>
      )}
    </div>
  );
};

// Common validation rules
export const validationRules = {
  required: (message = "This field is required"): ValidationRule => ({
    test: (value) => value.trim() !== '',
    message
  }),

  email: (message = "Please enter a valid email address"): ValidationRule => ({
    test: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message
  }),

  url: (message = "Please enter a valid URL"): ValidationRule => ({
    test: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    test: (value) => value.length >= min,
    message: message || `Must be at least ${min} characters`
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    test: (value) => value.length <= max,
    message: message || `Must be no more than ${max} characters`
  }),

  numeric: (message = "Must be a valid number"): ValidationRule => ({
    test: (value) => !isNaN(Number(value)) && value.trim() !== '',
    message
  }),

  range: (min: number, max: number, message?: string): ValidationRule => ({
    test: (value) => {
      const num = Number(value);
      return !isNaN(num) && num >= min && num <= max;
    },
    message: message || `Must be between ${min} and ${max}`
  }),

  apiKey: (provider?: 'openai' | 'google', message?: string): ValidationRule => ({
    test: (value) => {
      if (!value.trim()) return false;
      
      // Basic API key format validation
      if (provider === 'openai') {
        return value.startsWith('sk-') && value.length > 20;
      } else if (provider === 'google') {
        return value.length > 10; // Google AI keys vary in format
      }
      
      return value.length > 10; // Generic minimum length
    },
    message: message || `Please enter a valid ${provider || 'API'} key`
  }),

  namespace: (message = "Namespace must contain only letters, numbers, hyphens, and underscores"): ValidationRule => ({
    test: (value) => /^[a-zA-Z0-9_-]+$/.test(value),
    message
  })
};

export default ValidationInput;