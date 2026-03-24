/**
 * Check Filename API Route
 *
 * Checks if a filename already exists in OpenSearch before upload.
 * This helps prevent duplicate uploads and provides user feedback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

/**
 * Maximum duration for this API route in seconds
 * Set to 30 seconds for quick filename checks
 */
export const maxDuration = 30;

/**
 * Response structure for filename check
 */
interface CheckFilenameResponse {
  success: boolean;
  exists: boolean;
  document?: {
    id: string;
    filename: string;
    uploadedAt?: string;
    [key: string]: any;
  };
  error?: string;
}

/**
 * Sanitizes filename input to prevent injection attacks
 * 
 * @param filename - Filename to sanitize
 * @returns Sanitized filename
 */
function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return '';
  }
  
  return filename
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * GET /api/rag-comparison/check-filename
 * 
 * Checks if a filename already exists in OpenSearch.
 * 
 * Query Parameters:
 * - filename: The filename to check (required)
 * 
 * Response:
 * ```json
 * {
 *   "success": true,
 *   "exists": false
 * }
 * ```
 * 
 * Or if file exists:
 * ```json
 * {
 *   "success": true,
 *   "exists": true,
 *   "document": {
 *     "id": "doc-123",
 *     "filename": "example.pdf",
 *     "uploadedAt": "2026-03-23T17:30:00Z"
 *   }
 * }
 * ```
 */
export async function GET(request: NextRequest): Promise<NextResponse<CheckFilenameResponse>> {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   CHECK FILENAME API ROUTE - START     ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    // Extract filename from query parameters
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    
    console.log('Query parameters:', { filename });
    
    // Validate filename parameter
    if (!filename) {
      console.warn('⚠️  Missing filename parameter');
      return NextResponse.json(
        {
          success: false,
          exists: false,
          error: 'Filename parameter is required'
        },
        { status: 400 }
      );
    }
    
    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(filename);
    
    if (!sanitizedFilename) {
      console.warn('⚠️  Invalid filename after sanitization');
      return NextResponse.json(
        {
          success: false,
          exists: false,
          error: 'Invalid filename provided'
        },
        { status: 400 }
      );
    }
    
    console.log('Sanitized filename:', sanitizedFilename);
    
    // Build backend API URL
    const backendUrl = `${env.OPENRAG_URL}/api/documents/check-filename?filename=${encodeURIComponent(sanitizedFilename)}`;
    console.log('Backend URL:', backendUrl);
    
    // Extract authorization header from request
    const authHeader = request.headers.get('authorization');
    
    // Prepare headers for backend request
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Include authorization if provided
    if (authHeader) {
      headers['Authorization'] = authHeader;
      console.log('✅ Authorization header included');
    } else {
      // Use API key from environment if no auth header
      if (env.OPENRAG_API_KEY) {
        headers['Authorization'] = `Bearer ${env.OPENRAG_API_KEY}`;
        console.log('✅ Using API key from environment');
      } else {
        console.warn('⚠️  No authorization provided');
      }
    }
    
    // Call backend API
    console.log('Calling backend API...');
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(25000), // 25 second timeout
    });
    
    console.log('Backend response status:', response.status);
    
    // Handle non-OK responses
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      // Handle specific error cases
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          {
            success: false,
            exists: false,
            error: 'Authentication failed. Please check your credentials.'
          },
          { status: response.status }
        );
      }
      
      if (response.status === 404) {
        // 404 might mean the endpoint doesn't exist or file doesn't exist
        // Treat as file not found
        console.log('Backend returned 404 - treating as file not found');
        return NextResponse.json(
          {
            success: true,
            exists: false
          },
          { status: 200 }
        );
      }
      
      return NextResponse.json(
        {
          success: false,
          exists: false,
          error: `Backend API error: ${response.statusText}`
        },
        { status: response.status }
      );
    }
    
    // Parse response
    const data = await response.json();
    console.log('Backend response data:', JSON.stringify(data, null, 2));
    
    // Validate response structure
    if (typeof data.exists !== 'boolean') {
      console.error('Invalid response structure from backend:', data);
      return NextResponse.json(
        {
          success: false,
          exists: false,
          error: 'Invalid response from backend API'
        },
        { status: 500 }
      );
    }
    
    // Return successful response
    const result: CheckFilenameResponse = {
      success: true,
      exists: data.exists,
      ...(data.document && { document: data.document })
    };
    
    console.log('✅ Filename check complete:', result);
    console.log('╔════════════════════════════════════════╗');
    console.log('║   CHECK FILENAME API ROUTE - END       ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    return NextResponse.json(result, { status: 200 });
    
  } catch (error) {
    console.error('Check filename error:', error);
    
    // Handle timeout errors
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        {
          success: false,
          exists: false,
          error: 'Request timeout - backend API did not respond in time'
        },
        { status: 504 }
      );
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        {
          success: false,
          exists: false,
          error: 'Network error - unable to reach backend API'
        },
        { status: 503 }
      );
    }
    
    // Generic error handler
    return NextResponse.json(
      {
        success: false,
        exists: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// Made with Bob