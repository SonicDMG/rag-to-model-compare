import { env } from './env';
import type { RagQuery, RagResponse } from '@/types';

export class OpenRAGClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = env.OPENRAG_URL;
    this.apiKey = env.OPENRAG_API_KEY;
  }

  async query(params: RagQuery): Promise<RagResponse> {
    const response = await fetch(`${this.baseUrl}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`OpenRAG API error: ${response.statusText}`);
    }

    return response.json();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const openragClient = new OpenRAGClient();

// Made with Bob
