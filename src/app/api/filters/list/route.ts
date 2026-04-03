/**
 * API Route: List Knowledge Filters
 * 
 * Retrieves all knowledge filters from OpenRAG for display in the UI.
 * Filters are used to scope document retrieval during RAG queries.
 * 
 * @route GET /api/filters/list
 */

import { NextResponse } from 'next/server';
import { getOpenRAGClient } from '@/lib/rag-comparison/utils/pipeline-utils';
import { RAGPipelineError } from '@/lib/rag-comparison/pipelines/rag-pipeline';
import type { ListFiltersResponse, FilterConfig } from '@/types/filter-management';

/**
 * GET handler to list all knowledge filters
 *
 * @returns JSON response with filters array or error
 */
export async function GET() {
  try {
    console.log('[Filters API] Fetching all knowledge filters from OpenRAG...');
    
    const client = getOpenRAGClient(RAGPipelineError);
    
    // Search for all filters (empty query returns all)
    // Limit set to 100 to get all filters (reasonable upper bound)
    const openragFilters = await client.knowledgeFilters.search('', 100);
    
    console.log(`[Filters API] Found ${openragFilters?.length || 0} filters`);
    
    // Map OpenRAG filters to our FilterConfig type
    // Preserve exact values from OpenRAG, with defaults for required fields
    const filters: FilterConfig[] = (openragFilters || []).map(filter => ({
      id: filter.id,
      name: filter.name,
      description: filter.description,
      queryData: {
        limit: filter.queryData?.limit ?? 5,
        scoreThreshold: filter.queryData?.scoreThreshold ?? 0.5,
        color: filter.queryData?.color,
        icon: filter.queryData?.icon,
        filters: {
          data_sources: filter.queryData?.filters?.data_sources || [],
        },
      },
    }));
    
    const response: ListFiltersResponse = {
      success: true,
      filters,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[Filters API] Failed to list filters:', error);
    
    const response: ListFiltersResponse = {
      success: false,
      filters: [],
      error: error instanceof Error ? error.message : 'Failed to list filters',
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// Made with Bob