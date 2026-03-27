/**
 * FilterManagementModal Component
 * 
 * Modal dialog for managing knowledge filters (CRUD operations).
 * Displays list of filters with edit/delete actions and create new filter form.
 */

'use client';

import { useState } from 'react';
import { useFilter } from '@/contexts/FilterContext';
import { FilterForm } from './FilterForm';
import type { FilterConfig, FilterFormData } from '@/types/filter-management';

interface FilterManagementModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
}

type ModalView = 'list' | 'create' | 'edit';

export function FilterManagementModal({ isOpen, onClose }: FilterManagementModalProps) {
  const { availableFilters, currentFilter, createFilter, updateFilter, deleteFilter, refreshFilters } = useFilter();
  
  const [view, setView] = useState<ModalView>('list');
  const [editingFilter, setEditingFilter] = useState<FilterConfig | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setView('list');
    setEditingFilter(null);
    setError(null);
    setDeleteConfirmId(null);
    onClose();
  };

  const handleCreateClick = () => {
    setView('create');
    setError(null);
  };

  const handleEditClick = (filter: FilterConfig) => {
    setEditingFilter(filter);
    setView('edit');
    setError(null);
  };

  const handleCancelForm = () => {
    setView('list');
    setEditingFilter(null);
    setError(null);
  };

  const handleCreateSubmit = async (data: FilterFormData) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      await createFilter(data);
      setView('list');
      await refreshFilters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create filter');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (data: FilterFormData) => {
    if (!editingFilter) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await updateFilter(editingFilter.id, data);
      setView('list');
      setEditingFilter(null);
      await refreshFilters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update filter');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (filterId: string) => {
    setDeleteConfirmId(filterId);
  };

  const handleDeleteConfirm = async (filterId: string) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      await deleteFilter(filterId);
      setDeleteConfirmId(null);
      await refreshFilters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete filter');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-unkey-gray-900 border border-unkey-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-unkey-gray-800">
          <h2 className="text-2xl font-bold text-white">
            {view === 'create' ? 'Create New Filter' : view === 'edit' ? 'Edit Filter' : 'Manage Filters'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-unkey-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6 text-unkey-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* List View */}
          {view === 'list' && (
            <div className="space-y-4">
              {/* Create Button */}
              <button
                onClick={handleCreateClick}
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-unkey-teal hover:bg-unkey-teal/90 
                         rounded-lg text-white font-medium transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Filter
              </button>

              {/* Filters List */}
              {availableFilters.length === 0 ? (
                <div className="text-center py-12 text-unkey-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <p className="text-lg">No filters yet</p>
                  <p className="text-sm mt-2">Create your first filter to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableFilters.map((filter) => (
                    <div
                      key={filter.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        currentFilter?.id === filter.id
                          ? 'bg-unkey-teal/10 border-unkey-teal/30'
                          : 'bg-unkey-gray-800 border-unkey-gray-700 hover:border-unkey-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-white truncate">
                              {filter.name}
                            </h3>
                            {currentFilter?.id === filter.id && (
                              <span className="px-2 py-0.5 bg-unkey-teal/20 text-unkey-teal text-xs font-medium rounded">
                                Active
                              </span>
                            )}
                          </div>
                          {filter.description && (
                            <p className="text-sm text-unkey-gray-400 mb-2">{filter.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-unkey-gray-400">
                            <span>Limit: <span className="text-white">{filter.queryData.limit}</span></span>
                            <span>•</span>
                            <span>Threshold: <span className="text-white">{filter.queryData.scoreThreshold.toFixed(2)}</span></span>
                            <span>•</span>
                            <span>Sources: <span className="text-white">{filter.queryData.filters.data_sources.length}</span></span>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditClick(filter)}
                            disabled={isSubmitting}
                            className="p-2 hover:bg-unkey-gray-700 rounded-lg transition-colors disabled:opacity-50"
                            title="Edit filter"
                          >
                            <svg className="w-4 h-4 text-unkey-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(filter.id)}
                            disabled={isSubmitting}
                            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete filter"
                          >
                            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Delete Confirmation */}
                      {deleteConfirmId === filter.id && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <p className="text-sm text-red-400 mb-3">
                            Are you sure you want to delete this filter? This will not delete associated documents.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={handleDeleteCancel}
                              disabled={isSubmitting}
                              className="flex-1 px-3 py-1.5 bg-unkey-gray-700 hover:bg-unkey-gray-600 rounded text-sm text-white transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDeleteConfirm(filter.id)}
                              disabled={isSubmitting}
                              className="flex-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded text-sm text-white transition-colors disabled:opacity-50"
                            >
                              {isSubmitting ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Create View */}
          {view === 'create' && (
            <FilterForm
              onSubmit={handleCreateSubmit}
              onCancel={handleCancelForm}
              isSubmitting={isSubmitting}
            />
          )}

          {/* Edit View */}
          {view === 'edit' && editingFilter && (
            <FilterForm
              filter={editingFilter}
              onSubmit={handleEditSubmit}
              onCancel={handleCancelForm}
              isSubmitting={isSubmitting}
            />
          )}
        </div>

        {/* Footer */}
        {view === 'list' && (
          <div className="p-6 border-t border-unkey-gray-800">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 bg-unkey-gray-800 hover:bg-unkey-gray-700 
                       border border-unkey-gray-700 hover:border-unkey-gray-600
                       rounded-lg text-sm text-unkey-gray-300 hover:text-white
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Made with Bob