export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  tokensUsed: {
    input: number;
    output: number;
  };
}

export interface LLMProvider {
  name: string;
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
  isAvailable(): Promise<boolean>;
}

export interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface VisionProvider extends LLMProvider {
  describeImage(imagePath: string, prompt?: string): Promise<string>;
}

export interface ProviderConfig {
  provider: 'claude' | 'openai' | 'ollama';
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}

/** Canonical IDs used in fallback chains */
export type ProviderChainId = 'claude' | 'openai' | 'ollama';

export interface ProviderChainKeys {
  anthropic?: string;
  openai?: string;
  /** Base URL for Ollama (e.g. http://localhost:11434) */
  ollama_url?: string;
}

/**
 * Config for createProviderChain — primary + fallbacks with optional per-provider keys.
 */
export interface ProviderChainConfig {
  primary: ProviderChainId;
  fallback: ProviderChainId[];
  keys?: ProviderChainKeys;
  /** Default model passed to each concrete provider */
  model?: string;
}
