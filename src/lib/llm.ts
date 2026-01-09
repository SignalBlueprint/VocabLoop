/**
 * LLM Client Abstraction
 *
 * Provides a unified interface for multiple LLM providers:
 * - OpenAI (GPT-4o-mini) - Primary, best cost-to-quality ratio
 * - Anthropic (Claude 3.5 Haiku) - Secondary, excellent instruction following
 * - Ollama (local) - Optional, for privacy-conscious users
 */

/**
 * Message format for LLM conversations
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Configuration for LLM requests
 */
export interface LLMConfig {
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

/**
 * LLM Provider type
 */
export type LLMProviderType = 'openai' | 'anthropic' | 'ollama';

/**
 * Provider configuration
 */
export interface ProviderConfig {
  type: LLMProviderType;
  apiKey?: string;
  endpoint?: string; // For Ollama custom endpoints
  model?: string;
}

/**
 * LLM response with metadata
 */
export interface LLMResponse {
  content: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Error types for LLM operations
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public code:
      | 'rate_limit'
      | 'invalid_key'
      | 'network'
      | 'content_filtered'
      | 'timeout'
      | 'unknown',
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * Abstract LLM Provider interface
 */
export interface LLMProvider {
  /**
   * Send a message and get a complete response
   */
  sendMessage(messages: LLMMessage[], config?: LLMConfig): Promise<LLMResponse>;

  /**
   * Stream a message response token by token
   */
  streamMessage(
    messages: LLMMessage[],
    config?: LLMConfig
  ): AsyncGenerator<string, void, unknown>;

  /**
   * Check if the provider is available (has valid config)
   */
  isAvailable(): boolean;

  /**
   * Get the provider type
   */
  getType(): LLMProviderType;
}

// Default configurations
const DEFAULT_CONFIG: LLMConfig = {
  maxTokens: 500,
  temperature: 0.7,
};

const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
  ollama: 'llama3.2',
};

/**
 * OpenAI Provider Implementation
 */
class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey || '';
    this.model = config.model || DEFAULT_MODELS.openai;
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey.startsWith('sk-');
  }

  getType(): LLMProviderType {
    return 'openai';
  }

  async sendMessage(
    messages: LLMMessage[],
    config: LLMConfig = {}
  ): Promise<LLMResponse> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: mergedConfig.maxTokens,
          temperature: mergedConfig.temperature,
          stop: mergedConfig.stopSequences,
        }),
      });

      if (!response.ok) {
        throw await this.handleError(response);
      }

      const data = await response.json();
      const choice = data.choices[0];

      return {
        content: choice.message.content || '',
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof LLMError) throw error;
      throw new LLMError(
        error instanceof Error ? error.message : 'Unknown error',
        'network',
        true
      );
    }
  }

  async *streamMessage(
    messages: LLMMessage[],
    config: LLMConfig = {}
  ): AsyncGenerator<string, void, unknown> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: mergedConfig.maxTokens,
          temperature: mergedConfig.temperature,
          stop: mergedConfig.stopSequences,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw await this.handleError(response);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new LLMError('No response body', 'network', true);

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) yield content;
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof LLMError) throw error;
      throw new LLMError(
        error instanceof Error ? error.message : 'Unknown error',
        'network',
        true
      );
    }
  }

  private async handleError(response: Response): Promise<LLMError> {
    const status = response.status;
    let message = `OpenAI API error: ${status}`;

    try {
      const data = await response.json();
      message = data.error?.message || message;
    } catch {
      // Use default message
    }

    if (status === 429) {
      return new LLMError(message, 'rate_limit', true);
    }
    if (status === 401) {
      return new LLMError(message, 'invalid_key', false);
    }
    if (status >= 500) {
      return new LLMError(message, 'network', true);
    }
    return new LLMError(message, 'unknown', false);
  }

  private mapFinishReason(
    reason: string
  ): 'stop' | 'length' | 'content_filter' | 'error' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'error';
    }
  }
}

/**
 * Anthropic Provider Implementation
 */
class AnthropicProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://api.anthropic.com/v1';
  private apiVersion = '2023-06-01';

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey || '';
    this.model = config.model || DEFAULT_MODELS.anthropic;
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey.startsWith('sk-ant-');
  }

  getType(): LLMProviderType {
    return 'anthropic';
  }

  async sendMessage(
    messages: LLMMessage[],
    config: LLMConfig = {}
  ): Promise<LLMResponse> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    // Extract system message for Anthropic's format
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: mergedConfig.maxTokens,
          system: systemMessage?.content,
          messages: conversationMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw await this.handleError(response);
      }

      const data = await response.json();

      return {
        content: data.content[0]?.text || '',
        finishReason: this.mapStopReason(data.stop_reason),
        usage: data.usage
          ? {
              promptTokens: data.usage.input_tokens,
              completionTokens: data.usage.output_tokens,
              totalTokens: data.usage.input_tokens + data.usage.output_tokens,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof LLMError) throw error;
      throw new LLMError(
        error instanceof Error ? error.message : 'Unknown error',
        'network',
        true
      );
    }
  }

  async *streamMessage(
    messages: LLMMessage[],
    config: LLMConfig = {}
  ): AsyncGenerator<string, void, unknown> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    // Extract system message for Anthropic's format
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: mergedConfig.maxTokens,
          system: systemMessage?.content,
          messages: conversationMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
        }),
      });

      if (!response.ok) {
        throw await this.handleError(response);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new LLMError('No response body', 'network', true);

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta') {
                const text = parsed.delta?.text;
                if (text) yield text;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof LLMError) throw error;
      throw new LLMError(
        error instanceof Error ? error.message : 'Unknown error',
        'network',
        true
      );
    }
  }

  private async handleError(response: Response): Promise<LLMError> {
    const status = response.status;
    let message = `Anthropic API error: ${status}`;

    try {
      const data = await response.json();
      message = data.error?.message || message;
    } catch {
      // Use default message
    }

    if (status === 429) {
      return new LLMError(message, 'rate_limit', true);
    }
    if (status === 401) {
      return new LLMError(message, 'invalid_key', false);
    }
    if (status >= 500) {
      return new LLMError(message, 'network', true);
    }
    return new LLMError(message, 'unknown', false);
  }

  private mapStopReason(
    reason: string
  ): 'stop' | 'length' | 'content_filter' | 'error' {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      default:
        return 'error';
    }
  }
}

/**
 * Ollama Provider Implementation (Local)
 */
class OllamaProvider implements LLMProvider {
  private endpoint: string;
  private model: string;

  constructor(config: ProviderConfig) {
    this.endpoint = config.endpoint || 'http://localhost:11434';
    this.model = config.model || DEFAULT_MODELS.ollama;
  }

  isAvailable(): boolean {
    // Ollama availability is checked by attempting to connect
    // For now, return true if endpoint is set
    return !!this.endpoint;
  }

  getType(): LLMProviderType {
    return 'ollama';
  }

  async sendMessage(
    messages: LLMMessage[],
    config: LLMConfig = {}
  ): Promise<LLMResponse> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    // Convert to Ollama format (system message as separate field)
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    try {
      const response = await fetch(`${this.endpoint}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            ...(systemMessage
              ? [{ role: 'system', content: systemMessage.content }]
              : []),
            ...conversationMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          ],
          stream: false,
          options: {
            num_predict: mergedConfig.maxTokens,
            temperature: mergedConfig.temperature,
          },
        }),
      });

      if (!response.ok) {
        throw await this.handleError(response);
      }

      const data = await response.json();

      return {
        content: data.message?.content || '',
        finishReason: data.done ? 'stop' : 'length',
        usage: data.eval_count
          ? {
              promptTokens: data.prompt_eval_count || 0,
              completionTokens: data.eval_count,
              totalTokens: (data.prompt_eval_count || 0) + data.eval_count,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof LLMError) throw error;
      throw new LLMError(
        error instanceof Error ? error.message : 'Connection failed',
        'network',
        true
      );
    }
  }

  async *streamMessage(
    messages: LLMMessage[],
    config: LLMConfig = {}
  ): AsyncGenerator<string, void, unknown> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    // Convert to Ollama format
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    try {
      const response = await fetch(`${this.endpoint}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            ...(systemMessage
              ? [{ role: 'system', content: systemMessage.content }]
              : []),
            ...conversationMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          ],
          stream: true,
          options: {
            num_predict: mergedConfig.maxTokens,
            temperature: mergedConfig.temperature,
          },
        }),
      });

      if (!response.ok) {
        throw await this.handleError(response);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new LLMError('No response body', 'network', true);

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              const content = parsed.message?.content;
              if (content) yield content;
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof LLMError) throw error;
      throw new LLMError(
        error instanceof Error ? error.message : 'Connection failed',
        'network',
        true
      );
    }
  }

  private async handleError(response: Response): Promise<LLMError> {
    const status = response.status;
    let message = `Ollama error: ${status}`;

    try {
      const data = await response.json();
      message = data.error || message;
    } catch {
      // Use default message
    }

    if (status >= 500) {
      return new LLMError(message, 'network', true);
    }
    return new LLMError(message, 'unknown', false);
  }
}

/**
 * Create an LLM provider instance
 */
export function createLLMProvider(config: ProviderConfig): LLMProvider {
  switch (config.type) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}

/**
 * Get provider from environment variables
 */
export function getProviderFromEnv(): LLMProvider | null {
  // Try OpenAI first (primary)
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (openaiKey) {
    return createLLMProvider({ type: 'openai', apiKey: openaiKey });
  }

  // Try Anthropic
  const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (anthropicKey) {
    return createLLMProvider({ type: 'anthropic', apiKey: anthropicKey });
  }

  // Try Ollama
  const ollamaEndpoint = import.meta.env.VITE_OLLAMA_ENDPOINT;
  if (ollamaEndpoint) {
    return createLLMProvider({ type: 'ollama', endpoint: ollamaEndpoint });
  }

  return null;
}

/**
 * Storage key for user-provided API keys
 */
const API_KEY_STORAGE_PREFIX = 'vocabloop_llm_key_';

/**
 * Save an API key to localStorage (encrypted in a real app)
 */
export function saveApiKey(provider: LLMProviderType, apiKey: string): void {
  try {
    localStorage.setItem(`${API_KEY_STORAGE_PREFIX}${provider}`, apiKey);
  } catch (error) {
    console.error('Failed to save API key:', error);
  }
}

/**
 * Load an API key from localStorage
 */
export function loadApiKey(provider: LLMProviderType): string | null {
  try {
    return localStorage.getItem(`${API_KEY_STORAGE_PREFIX}${provider}`);
  } catch {
    return null;
  }
}

/**
 * Clear an API key from localStorage
 */
export function clearApiKey(provider: LLMProviderType): void {
  try {
    localStorage.removeItem(`${API_KEY_STORAGE_PREFIX}${provider}`);
  } catch (error) {
    console.error('Failed to clear API key:', error);
  }
}

/**
 * Get the best available provider (env vars > localStorage)
 */
export function getBestAvailableProvider(): LLMProvider | null {
  // First try environment variables
  const envProvider = getProviderFromEnv();
  if (envProvider?.isAvailable()) {
    return envProvider;
  }

  // Then try localStorage keys
  const providers: LLMProviderType[] = ['openai', 'anthropic', 'ollama'];
  for (const type of providers) {
    const key = loadApiKey(type);
    if (key) {
      const provider = createLLMProvider({
        type,
        apiKey: type !== 'ollama' ? key : undefined,
        endpoint: type === 'ollama' ? key : undefined,
      });
      if (provider.isAvailable()) {
        return provider;
      }
    }
  }

  return null;
}

/**
 * Check if any LLM provider is configured
 */
export function isLLMConfigured(): boolean {
  return getBestAvailableProvider() !== null;
}

/**
 * Retry helper for transient errors
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (error instanceof LLMError && !error.retryable) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
