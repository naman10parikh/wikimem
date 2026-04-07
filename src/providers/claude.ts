import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, LLMMessage, LLMResponse, LLMOptions } from './types.js';

export class ClaudeProvider implements LLMProvider {
  name = 'claude';
  private client: Anthropic;
  private defaultModel: string;

  constructor(model?: string, apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey ?? process.env['ANTHROPIC_API_KEY'],
    });
    this.defaultModel = model ?? 'claude-sonnet-4-20250514';
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    if (!process.env['ANTHROPIC_API_KEY'] && !this.client.apiKey) {
      throw new Error(
        'Anthropic API key not found.\n' +
        'Set it via:  export ANTHROPIC_API_KEY=sk-ant-...\n' +
        'Or add to config.yaml:  api_key: sk-ant-...\n' +
        'Get a key at: https://console.anthropic.com/settings/keys',
      );
    }

    const systemMessages = messages.filter((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const systemPrompt = options?.systemPrompt
      ?? systemMessages.map((m) => m.content).join('\n\n')
      ?? undefined;

    try {
      const response = await this.client.messages.create({
        model: options?.model ?? this.defaultModel,
        max_tokens: options?.maxTokens ?? 4096,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: nonSystemMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      const content = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      return {
        content,
        model: response.model,
        tokensUsed: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
        },
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('authentication')) {
          throw new Error(
            'Anthropic API key is invalid or expired.\n' +
            'Check your key at: https://console.anthropic.com/settings/keys',
          );
        }
        if (error.message.includes('429')) {
          throw new Error(
            'Anthropic rate limit exceeded. Wait a moment and try again.\n' +
            'Check your usage at: https://console.anthropic.com',
          );
        }
        if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          throw new Error(
            'Network error: could not reach Anthropic API.\n' +
            'Check your internet connection and try again.',
          );
        }
      }
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env['ANTHROPIC_API_KEY'];
  }
}
