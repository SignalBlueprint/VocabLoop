/**
 * VocabLoop API Client
 */

import type { APIResponse, VocabWord, VocabStats, AuthTokens } from '../types';

const DEFAULT_API_URL = 'https://api.vocabloop.app/v1';
const TOKEN_STORAGE_KEY = 'vocabloop_sdk_token';

interface APIClientConfig {
  apiKey?: string;
  apiUrl?: string;
  accessToken?: string;
}

export class APIClient {
  private apiUrl: string;
  private apiKey?: string;
  private accessToken?: string;

  constructor(config: APIClientConfig = {}) {
    this.apiUrl = config.apiUrl || DEFAULT_API_URL;
    this.apiKey = config.apiKey;
    this.accessToken = config.accessToken || this.loadToken();
  }

  private loadToken(): string | undefined {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY) || undefined;
    } catch {
      return undefined;
    }
  }

  private saveToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // Storage not available
    }
  }

  private clearToken(): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Storage not available
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<APIResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(`${this.apiUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.code || 'API_ERROR',
            message: data.message || 'An error occurred',
          },
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }

  // Authentication
  async authenticate(code: string, redirectUri: string): Promise<APIResponse<AuthTokens>> {
    const result = await this.request<AuthTokens>('POST', '/oauth/token', {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    if (result.success && result.data) {
      this.accessToken = result.data.accessToken;
      this.saveToken(result.data.accessToken);
    }

    return result;
  }

  async refreshToken(refreshToken: string): Promise<APIResponse<AuthTokens>> {
    const result = await this.request<AuthTokens>('POST', '/oauth/token', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    if (result.success && result.data) {
      this.accessToken = result.data.accessToken;
      this.saveToken(result.data.accessToken);
    }

    return result;
  }

  logout(): void {
    this.accessToken = undefined;
    this.clearToken();
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Vocabulary
  async getVocabulary(): Promise<APIResponse<VocabWord[]>> {
    return this.request<VocabWord[]>('GET', '/vocabulary');
  }

  async isWordKnown(word: string): Promise<boolean> {
    const result = await this.request<{ known: boolean }>('GET', `/vocabulary/${encodeURIComponent(word)}`);
    return result.success && result.data?.known === true;
  }

  async addWord(word: string, context?: string): Promise<APIResponse<VocabWord>> {
    return this.request<VocabWord>('POST', '/vocabulary', {
      word,
      context,
      source: 'widget-sdk',
    });
  }

  // Reviews
  async getRandomCard(): Promise<APIResponse<VocabWord>> {
    return this.request<VocabWord>('GET', '/cards/random');
  }

  async submitReview(
    cardId: string,
    grade: 'again' | 'hard' | 'good' | 'easy',
    timeMs: number
  ): Promise<APIResponse<void>> {
    return this.request<void>('POST', '/reviews', {
      cardId,
      grade,
      timeMs,
    });
  }

  // Stats
  async getStats(): Promise<APIResponse<VocabStats>> {
    return this.request<VocabStats>('GET', '/stats');
  }
}

// Singleton instance
let apiClient: APIClient | null = null;

export function initAPIClient(config: APIClientConfig): APIClient {
  apiClient = new APIClient(config);
  return apiClient;
}

export function getAPIClient(): APIClient {
  if (!apiClient) {
    apiClient = new APIClient();
  }
  return apiClient;
}
