import {
  type OpenAICompatibleProvider,
  createOpenAICompatible,
} from "@ai-sdk/openai-compatible";
import type {
  ApertisChatSettings,
  ApertisModelId,
  ApertisProviderSettings,
} from "./apertis-chat-settings";

export type ApertisProvider = OpenAICompatibleProvider<
  ApertisModelId,
  string,
  string,
  string
>;

export function createApertis(
  options: ApertisProviderSettings = {},
): ApertisProvider {
  return createOpenAICompatible({
    name: "apertis",
    baseURL: options.baseURL ?? "https://api.apertis.ai/v1",
    apiKey: options.apiKey ?? process.env.APERTIS_API_KEY,
    headers: options.headers,
    fetch: options.fetch,
  });
}

/**
 * Default Apertis provider instance.
 */
export const apertis = createApertis();
