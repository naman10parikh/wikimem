import OpenAI from 'openai';
import type { LLMProvider, LLMMessage, LLMResponse, LLMOptions } from './types.js';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private client: OpenAI;
  private defaultModel: string;
  private readonly resolvedApiKey: string | undefined;

  constructor(model?: string, apiKey?: string) {
    this.resolvedApiKey = apiKey ?? process.env['OPENAI_API_KEY'];
    this.client = new OpenAI({
      apiKey: this.resolvedApiKey,
    });
    this.defaultModel = model ?? 'gpt-4o';
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    if (!this.resolvedApiKey) {
      throw new Error(
        'OpenAI API key not found.\n' +
        'Set it via:  export OPENAI_API_KEY=sk-...\n' +
        'Or add to config.yaml:  api_key: sk-...\n' +
        'Get a key at: https://platform.openai.com/api-keys',
      );
    }

    const allMessages = options?.systemPrompt
      ? [{ role: 'system' as const, content: options.systemPrompt }, ...messages.filter((m) => m.role !== 'system')]
      : messages;

    try {
      const response = await this.client.chat.completions.create({
        model: options?.model ?? this.defaultModel,
        max_tokens: options?.maxTokens ?? 4096,
        messages: allMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const content = response.choices[0]?.message?.content ?? '';

      return {
        content,
        model: response.model,
        tokensUsed: {
          input: response.usage?.prompt_tokens ?? 0,
          output: response.usage?.completion_tokens ?? 0,
        },
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Incorrect API key')) {
          throw new Error(
            'OpenAI API key is invalid or expired.\n' +
            'Check your key at: https://platform.openai.com/api-keys',
          );
        }
        if (error.message.includes('429')) {
          throw new Error(
            'OpenAI rate limit exceeded. Wait a moment and try again.\n' +
            'Check your usage at: https://platform.openai.com/usage',
          );
        }
        if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          throw new Error(
            'Network error: could not reach OpenAI API.\n' +
            'Check your internet connection and try again.',
          );
        }
      }
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.resolvedApiKey;
  }
}
