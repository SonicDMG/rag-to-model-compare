/**
 * API Route: Create Knowledge Filter
 * 
 * Creates a new knowledge filter in OpenRAG with specified configuration.
 * Filters start with empty data_sources array and are populated during document ingestion.
 * 
 * @route POST /api/filters/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOpenRAGClient } from '@/lib/rag-comparison/utils/pipeline-utils';
import { RAGPipelineError } from '@/lib/rag-comparison/pipelines/rag-pipeline';
import type { CreateFilterRequest, CreateFilterResponse, FilterConfig } from '@/types/filter-management';

/**
 * POST handler to create a new knowledge filter
 * 
 * @param request - Request with filter configuration
 * @returns JSON response with created filter or error
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateFilterRequest = await request.json();
    const { name, description, limit, scoreThreshold, color } = body;
    
    console.log('[Filters API] Creating new filter:', { name, limit, scoreThreshold, color });
    
    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      const response: CreateFilterResponse = {
        success: false,
        error: 'Filter name is required',
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    if (name.length > 50) {
      const response: CreateFilterResponse = {
        success: false,
        error: 'Filter name must be 50 characters or less',
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    if (typeof limit !== 'number' || limit < 1 || limit > 50) {
      const response: CreateFilterResponse = {
        success: false,
        error: 'Limit must be a number between 1 and 50',
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    if (typeof scoreThreshold !== 'number' || scoreThreshold < 0 || scoreThreshold > 1) {
      const response: CreateFilterResponse = {
        success: false,
        error: 'Score threshold must be a number between 0 and 1',
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    const client = getOpenRAGClient(RAGPipelineError);
    
    // Create filter with empty data_sources (will be populated during ingestion)
    const result = await client.knowledgeFilters.create({
      name: name.trim(),
      description: description?.trim() || `Filter: ${name.trim()}`,
      queryData: {
        limit,
        scoreThreshold,
        color: color || 'teal', // Default to teal if not provided
        filters: {
          data_sources: [], // Start empty
        },
      },
    });
    
    if (!result.success || !result.id) {
      throw new Error('Failed to create filter in OpenRAG');
    }
    
    console.log(`[Filters API] Filter created successfully with ID: ${result.id}`);
    
    // Fetch the created filter to return full details
    const createdFilter = await client.knowledgeFilters.get(result.id);
    
    if (!createdFilter) {
      throw new Error('Failed to retrieve created filter');
    }
    
    // Map to our FilterConfig type
    const filter: FilterConfig = {
      id: createdFilter.id,
      name: createdFilter.name,
      description: createdFilter.description,
      queryData: {
        limit: createdFilter.queryData?.limit ?? limit,
        scoreThreshold: createdFilter.queryData?.scoreThreshold ?? scoreThreshold,
        color: createdFilter.queryData?.color ?? color ?? 'teal',
        filters: {
          data_sources: createdFilter.queryData?.filters?.data_sources || [],
        },
      },
    };
    
    const response: CreateFilterResponse = {
      success: true,
      filter,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[Filters API] Failed to create filter:', error);
    
    const response: CreateFilterResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create filter',
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// Made with Bob