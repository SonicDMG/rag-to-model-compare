/**
 * API Route: Update Knowledge Filter
 * 
 * Updates an existing knowledge filter's configuration in OpenRAG.
 * Can update name, description, limit, scoreThreshold, and data_sources.
 * 
 * @route PUT /api/filters/update
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOpenRAGClient } from '@/lib/rag-comparison/utils/pipeline-utils';
import { RAGPipelineError } from '@/lib/rag-comparison/pipelines/rag-pipeline';
import type { UpdateFilterRequest, UpdateFilterResponse, FilterConfig } from '@/types/filter-management';

/**
 * PUT handler to update an existing knowledge filter
 * 
 * @param request - Request with filter ID and updated fields
 * @returns JSON response with updated filter or error
 */
export async function PUT(request: NextRequest) {
  try {
    const body: UpdateFilterRequest = await request.json();
    const { filterId, name, description, limit, scoreThreshold, color, icon, dataSources } = body;
    
    console.log('[Filters API] Updating filter:', filterId);
    
    // Validation
    if (!filterId || typeof filterId !== 'string') {
      const response: UpdateFilterResponse = {
        success: false,
        error: 'Filter ID is required',
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.length > 50)) {
      const response: UpdateFilterResponse = {
        success: false,
        error: 'Filter name must be 1-50 characters',
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    if (limit !== undefined && (typeof limit !== 'number' || limit < 1 || limit > 50)) {
      const response: UpdateFilterResponse = {
        success: false,
        error: 'Limit must be a number between 1 and 50',
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    if (scoreThreshold !== undefined && (typeof scoreThreshold !== 'number' || scoreThreshold < 0 || scoreThreshold > 1)) {
      const response: UpdateFilterResponse = {
        success: false,
        error: 'Score threshold must be a number between 0 and 1',
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    const client = getOpenRAGClient(RAGPipelineError);
    
    // Get current filter to merge updates
    const currentFilter = await client.knowledgeFilters.get(filterId);
    
    if (!currentFilter) {
      const response: UpdateFilterResponse = {
        success: false,
        error: 'Filter not found',
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    // Build update payload with only provided fields
    const updatePayload: any = {};
    
    if (name !== undefined) {
      updatePayload.name = name.trim();
    }
    
    if (description !== undefined) {
      updatePayload.description = description.trim();
    }
    
    // Update queryData if any query-related fields are provided
    // Preserve exact values without applying defaults
    if (limit !== undefined || scoreThreshold !== undefined || color !== undefined || icon !== undefined || dataSources !== undefined) {
      updatePayload.queryData = {
        limit: limit ?? currentFilter.queryData?.limit,
        scoreThreshold: scoreThreshold ?? currentFilter.queryData?.scoreThreshold,
        color: color ?? currentFilter.queryData?.color,
        icon: icon ?? currentFilter.queryData?.icon,
        filters: {
          data_sources: dataSources ?? currentFilter.queryData?.filters?.data_sources ?? [],
        },
      };
    }
    
    console.log('[Filters API] Update payload:', updatePayload);
    
    // Update the filter
    await client.knowledgeFilters.update(filterId, updatePayload);
    
    console.log(`[Filters API] Filter ${filterId} updated successfully`);
    
    // Fetch the updated filter to return
    const updatedFilter = await client.knowledgeFilters.get(filterId);
    
    if (!updatedFilter) {
      throw new Error('Failed to retrieve updated filter');
    }
    
    // Map to our FilterConfig type
    // Preserve exact values from OpenRAG, with defaults for required fields
    const filter: FilterConfig = {
      id: updatedFilter.id,
      name: updatedFilter.name,
      description: updatedFilter.description,
      queryData: {
        limit: updatedFilter.queryData?.limit ?? 5,
        scoreThreshold: updatedFilter.queryData?.scoreThreshold ?? 0.5,
        color: updatedFilter.queryData?.color,
        icon: updatedFilter.queryData?.icon,
        filters: {
          data_sources: updatedFilter.queryData?.filters?.data_sources || [],
        },
      },
    };
    
    const response: UpdateFilterResponse = {
      success: true,
      filter,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[Filters API] Failed to update filter:', error);
    
    const response: UpdateFilterResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update filter',
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// Made with Bob