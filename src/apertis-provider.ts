import type {
  EmbeddingModelV3,
  LanguageModelV3,
  ProviderV3,
} from "@ai-sdk/provider";
import { loadApiKey, withoutTrailingSlash } from "@ai-sdk/provider-utils";
import { ApertisChatLanguageModel } from "./apertis-chat-language-model";
import type {
  ApertisChatSettings,
  ApertisModelId,
  ApertisProviderSettings,
} from "./apertis-chat-settings";
import { ApertisEmbeddingModel } from "./apertis-embedding-model";
import type {
  ApertisEmbeddingModelId,
  ApertisEmbeddingSettings,
} from "./apertis-embedding-settings";

export interface ApertisProvider extends ProviderV3 {
  /**
   * Creates a chat model for text generation.
   * Default call creates a chat model.
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
   * Creates a language model (alias for chat).
   * Required by ProviderV3 interface.
   */
  languageModel(modelId: string): LanguageModelV3;

  /**
   * Creates an embedding model.
   * Required by ProviderV3 interface.
   */
  embeddingModel(modelId: string): EmbeddingModelV3;

  /**
   * Creates a text embedding model.
   */
  textEmbeddingModel(
    modelId: ApertisEmbeddingModelId,
    settings?: ApertisEmbeddingSettings,
  ): EmbeddingModelV3;

  /**
   * Image models are not supported by Apertis.
   * Required by ProviderV3 interface.
   */
  imageModel(modelId: string): never;
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

  const createEmbeddingModel = (
    modelId: ApertisEmbeddingModelId,
    settings: ApertisEmbeddingSettings = {},
  ): EmbeddingModelV3 =>
    new ApertisEmbeddingModel(modelId, settings, {
      provider: "apertis.embedding",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    });

  const provider: ApertisProvider = Object.assign(
    (modelId: ApertisModelId, settings?: ApertisChatSettings) =>
      createChatModel(modelId, settings),
    {
      specificationVersion: "v3" as const,
      chat: createChatModel,
      languageModel: (modelId: string) => createChatModel(modelId),
      embeddingModel: (modelId: string) => createEmbeddingModel(modelId),
      textEmbeddingModel: createEmbeddingModel,
      imageModel: (): never => {
        throw new Error("Image models are not supported by Apertis");
      },
    },
  );

  return provider;
}

/**
 * Default Apertis provider instance.
 */
export const apertis = createApertis();
