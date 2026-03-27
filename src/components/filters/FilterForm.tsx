/**
 * FilterForm Component
 * 
 * Form for creating or editing knowledge filter configuration.
 * Validates input and provides user-friendly error messages.
 */

'use client';

import { useState, useEffect } from 'react';
import type { FilterConfig, FilterFormData } from '@/types/filter-management';

interface FilterFormProps {
  /** Existing filter to edit (null for create) */
  filter?: FilterConfig | null;
  /** Callback when form is submitted */
  onSubmit: (data: FilterFormData) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel: () => void;
  /** Whether form is submitting */
  isSubmitting?: boolean;
}

// Available color options matching OpenRAG scheme
const COLOR_OPTIONS = [
  { value: 'teal', label: 'Teal', bgClass: 'bg-unkey-teal', borderClass: 'border-unkey-teal' },
  { value: 'red', label: 'Red', bgClass: 'bg-red-600', borderClass: 'border-red-600' },
  { value: 'emerald', label: 'Emerald', bgClass: 'bg-emerald-600', borderClass: 'border-emerald-600' },
  { value: 'blue', label: 'Blue', bgClass: 'bg-blue-600', borderClass: 'border-blue-600' },
  { value: 'purple', label: 'Purple', bgClass: 'bg-purple-600', borderClass: 'border-purple-600' },
  { value: 'amber', label: 'Amber', bgClass: 'bg-amber-600', borderClass: 'border-amber-600' },
  { value: 'green', label: 'Green', bgClass: 'bg-green-600', borderClass: 'border-green-600' },
  { value: 'indigo', label: 'Indigo', bgClass: 'bg-indigo-600', borderClass: 'border-indigo-600' },
  { value: 'pink', label: 'Pink', bgClass: 'bg-pink-600', borderClass: 'border-pink-600' },
  { value: 'orange', label: 'Orange', bgClass: 'bg-orange-600', borderClass: 'border-orange-600' },
];

export function FilterForm({ filter, onSubmit, onCancel, isSubmitting = false }: FilterFormProps) {
  const [formData, setFormData] = useState<FilterFormData>({
    name: filter?.name || '',
    description: filter?.description || '',
    limit: filter?.queryData.limit || 5,
    scoreThreshold: filter?.queryData.scoreThreshold || 0.5,
    color: filter?.queryData?.color || 'teal',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FilterFormData, string>>>({});

  // Update form when filter prop changes
  useEffect(() => {
    if (filter) {
      setFormData({
        name: filter.name,
        description: filter.description || '',
        limit: filter.queryData.limit,
        scoreThreshold: filter.queryData.scoreThreshold,
        color: filter.queryData?.color || 'teal',
      });
    }
  }, [filter]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FilterFormData, string>> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Filter name is required';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Filter name must be 50 characters or less';
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(formData.name)) {
      newErrors.name = 'Filter name can only contain letters, numbers, spaces, hyphens, and underscores';
    }

    // Limit validation
    if (formData.limit < 1 || formData.limit > 50) {
      newErrors.limit = 'Limit must be between 1 and 50';
    }

    // Score threshold validation
    if (formData.scoreThreshold < 0 || formData.scoreThreshold > 1) {
      newErrors.scoreThreshold = 'Score threshold must be between 0 and 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      // Error handling is done by parent component
    }
  };

  const handleChange = (field: keyof FilterFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name Field */}
      <div>
        <label htmlFor="filter-name" className="block text-sm font-medium text-unkey-gray-300 mb-2">
          Filter Name <span className="text-red-400">*</span>
        </label>
        <input
          id="filter-name"
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          disabled={isSubmitting}
          placeholder="e.g., Research Papers"
          className={`w-full px-4 py-2.5 bg-unkey-gray-900 border rounded-lg text-white 
                     focus:outline-none focus:ring-2 focus:ring-unkey-teal focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed
                     ${errors.name ? 'border-red-500' : 'border-unkey-gray-700'}`}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-400">{errors.name}</p>
        )}
      </div>

      {/* Description Field */}
      <div>
        <label htmlFor="filter-description" className="block text-sm font-medium text-unkey-gray-300 mb-2">
          Description <span className="text-xs text-unkey-gray-500">(optional)</span>
        </label>
        <textarea
          id="filter-description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          disabled={isSubmitting}
          placeholder="e.g., Filter for academic research documents"
          rows={3}
          className="w-full px-4 py-2.5 bg-unkey-gray-900 border border-unkey-gray-700 rounded-lg text-white 
                     focus:outline-none focus:ring-2 focus:ring-unkey-teal focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed resize-none"
        />
      </div>

      {/* Limit Field */}
      <div>
        <label htmlFor="filter-limit" className="block text-sm font-medium text-unkey-gray-300 mb-2">
          Retrieval Limit <span className="text-red-400">*</span>
        </label>
        <input
          id="filter-limit"
          type="number"
          min="1"
          max="50"
          value={formData.limit}
          onChange={(e) => handleChange('limit', parseInt(e.target.value) || 5)}
          disabled={isSubmitting}
          className={`w-full px-4 py-2.5 bg-unkey-gray-900 border rounded-lg text-white 
                     focus:outline-none focus:ring-2 focus:ring-unkey-teal focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed
                     ${errors.limit ? 'border-red-500' : 'border-unkey-gray-700'}`}
        />
        <p className="mt-1 text-xs text-unkey-gray-500">
          Number of document chunks to retrieve (1-50)
        </p>
        {errors.limit && (
          <p className="mt-1 text-sm text-red-400">{errors.limit}</p>
        )}
      </div>

      {/* Score Threshold Field */}
      <div>
        <label htmlFor="filter-threshold" className="block text-sm font-medium text-unkey-gray-300 mb-2">
          Score Threshold <span className="text-red-400">*</span>
        </label>
        <input
          id="filter-threshold"
          type="number"
          min="0"
          max="1"
          step="0.1"
          value={formData.scoreThreshold}
          onChange={(e) => handleChange('scoreThreshold', parseFloat(e.target.value) || 0.5)}
          disabled={isSubmitting}
          className={`w-full px-4 py-2.5 bg-unkey-gray-900 border rounded-lg text-white 
                     focus:outline-none focus:ring-2 focus:ring-unkey-teal focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed
                     ${errors.scoreThreshold ? 'border-red-500' : 'border-unkey-gray-700'}`}
        />
        <p className="mt-1 text-xs text-unkey-gray-500">
          Minimum relevance score for retrieved chunks (0.0-1.0)
        </p>
        {errors.scoreThreshold && (
          <p className="mt-1 text-sm text-red-400">{errors.scoreThreshold}</p>
        )}
      </div>

      {/* Color Picker */}
      <div>
        <label className="block text-sm font-medium text-unkey-gray-300 mb-2">
          Filter Color <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-5 gap-2">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => handleChange('color', color.value)}
              disabled={isSubmitting}
              className={`
                relative h-12 rounded-lg border-2 transition-all
                ${formData.color === color.value
                  ? `${color.borderClass} ring-2 ring-offset-2 ring-offset-unkey-gray-900 ring-unkey-teal`
                  : 'border-unkey-gray-700 hover:border-unkey-gray-600'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-unkey-teal focus:ring-offset-2 focus:ring-offset-unkey-gray-900
              `}
              title={color.label}
            >
              <div className={`absolute inset-1 rounded ${color.bgClass}`} />
              {formData.color === color.value && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white drop-shadow-lg"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-unkey-gray-500">
          Choose a color to visually identify this filter
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2.5 bg-unkey-gray-800 hover:bg-unkey-gray-700 
                     border border-unkey-gray-700 hover:border-unkey-gray-600
                     rounded-lg text-sm text-unkey-gray-300 hover:text-white
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2.5 bg-unkey-teal hover:bg-unkey-teal/90 
                     rounded-lg text-sm text-white font-medium
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {filter ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>{filter ? 'Update Filter' : 'Create Filter'}</>
          )}
        </button>
      </div>
    </form>
  );
}

// Made with Bob