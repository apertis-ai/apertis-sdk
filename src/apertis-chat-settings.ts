export type ApertisModelId =
  | 'gpt-5.2'
  | 'gpt-5.2-codex'
  | 'gpt-5.1'
  | 'claude-opus-4-5-20251101'
  | 'claude-sonnet-4.5'
  | 'claude-haiku-4.5'
  | 'gemini-3-pro-preview'
  | 'gemini-3-flash-preview'
  | 'gemini-2.5-flash-preview'
  // eslint-disable-next-line @typescript-eslint/ban-types
  | (string & {});

export interface ApertisProviderSettings {
  /**
   * Apertis API key. Default: APERTIS_API_KEY env var
   */
  apiKey?: string;

  /**
   * Base URL for Apertis API.
   * @default "https://api.apertis.ai/v1"
   */
  baseURL?: string;

  /**
   * Custom headers to include in requests.
   */
  headers?: Record<string, string>;

  /**
   * Custom fetch implementation for testing or middleware.
   */
  fetch?: typeof fetch;
}

export interface ApertisChatSettings {
  /**
   * A unique identifier for the user (for abuse monitoring).
   */
  user?: string;

  /**
   * Whether to return log probabilities of output tokens.
   */
  logprobs?: boolean;

  /**
   * Number of most likely tokens to return at each position (0-20).
   * Requires logprobs to be true.
   */
  topLogprobs?: number;
}
