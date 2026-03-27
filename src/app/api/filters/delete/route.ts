/**
 * API Route: Delete Knowledge Filter
 * 
 * Deletes a knowledge filter from OpenRAG.
 * Note: This does not delete the documents associated with the filter,
 * only the filter configuration itself.
 * 
 * @route DELETE /api/filters/delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOpenRAGClient } from '@/lib/rag-comparison/utils/pipeline-utils';
import { RAGPipelineError } from '@/lib/rag-comparison/pipelines/rag-pipeline';
import type { DeleteFilterRequest, DeleteFilterResponse } from '@/types/filter-management';

/**
 * DELETE handler to remove a knowledge filter
 * 
 * @param request - Request with filter ID to delete
 * @returns JSON response with success status or error
 */
export async function DELETE(request: NextRequest) {
  try {
    const body: DeleteFilterRequest = await request.json();
    const { filterId } = body;
    
    console.log('[Filters API] Deleting filter:', filterId);
    
    // Validation
    if (!filterId || typeof filterId !== 'string') {
      const response: DeleteFilterResponse = {
        success: false,
        error: 'Filter ID is required',
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    const client = getOpenRAGClient(RAGPipelineError);
    
    // Check if filter exists before attempting deletion
    const existingFilter = await client.knowledgeFilters.get(filterId);
    
    if (!existingFilter) {
      const response: DeleteFilterResponse = {
        success: false,
        error: 'Filter not found',
      };
      return NextResponse.json(response, { status: 404 });
    }
    
    // Delete the filter
    await client.knowledgeFilters.delete(filterId);
    
    console.log(`[Filters API] Filter ${filterId} deleted successfully`);
    
    const response: DeleteFilterResponse = {
      success: true,
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[Filters API] Failed to delete filter:', error);
    
    const response: DeleteFilterResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete filter',
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// Made with Bob