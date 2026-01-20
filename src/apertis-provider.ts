import type { LanguageModelV3 } from "@ai-sdk/provider";
import { loadApiKey, withoutTrailingSlash } from "@ai-sdk/provider-utils";
import { ApertisChatLanguageModel } from "./apertis-chat-language-model";
import type {
  ApertisChatSettings,
  ApertisModelId,
  ApertisProviderSettings,
} from "./apertis-chat-settings";

export interface ApertisProvider {
  /**
   * Creates a chat model for text generation.
   */
  (modelId: ApertisModelId, settings?: ApertisChatSettings): LanguageModelV3;

  /**
   * Creates a chat model for text generation.
   */
  chat(
    modelId: ApertisModelId,
    settings?: ApertisChatSettings,
  ): LanguageModelV3;

  /**
   * Creates a chat model for text generation (alias for languageModel).
   */
  languageModel(
    modelId: ApertisModelId,
    settings?: ApertisChatSettings,
  ): LanguageModelV3;
}

export function createApertis(
  options: ApertisProviderSettings = {},
): ApertisProvider {
  const baseURL =
    withoutTrailingSlash(options.baseURL) ?? "https://api.apertis.ai/v1";

  const getHeaders = () => ({
    ...options.headers,
    Authorization: `Bearer ${loadApiKey({
      apiKey: options.apiKey,
      environmentVariableName: "APERTIS_API_KEY",
      description: "Apertis API key",
    })}`,
    "Content-Type": "application/json",
  });

  const createChatModel = (
    modelId: ApertisModelId,
    settings: ApertisChatSettings = {},
  ): LanguageModelV3 =>
    new ApertisChatLanguageModel(modelId, settings, {
      provider: "apertis.chat",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    });

  const provider: ApertisProvider = Object.assign(
    (modelId: ApertisModelId, settings?: ApertisChatSettings) =>
      createChatModel(modelId, settings),
    {
      chat: createChatModel,
      languageModel: createChatModel,
    },
  );

  return provider;
}

/**
 * Default Apertis provider instance.
 */
export const apertis = createApertis();
