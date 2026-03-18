import type {
  EmbeddingModelV2,
  EmbeddingModelV3,
  LanguageModelV2,
  LanguageModelV3,
  ProviderV2,
  ProviderV3,
} from "@ai-sdk/provider";
import { loadApiKey, withoutTrailingSlash } from "@ai-sdk/provider-utils";
import { ApertisChatLanguageModel } from "./apertis-chat-language-model";
import { ApertisChatLanguageModelV2 } from "./apertis-chat-language-model-v2";
import type {
  ApertisChatSettings,
  ApertisModelId,
  ApertisProviderSettings,
} from "./apertis-chat-settings";
import { ApertisEmbeddingModel } from "./apertis-embedding-model";
import { ApertisEmbeddingModelV2 } from "./apertis-embedding-model-v2";
import type {
  ApertisEmbeddingModelId,
  ApertisEmbeddingSettings,
} from "./apertis-embedding-settings";

interface ProviderConfig {
  baseURL: string;
  getHeaders: () => Record<string, string>;
  fetch?: typeof fetch;
}

function initializeProvider(
  options: ApertisProviderSettings = {},
): ProviderConfig {
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

  return { baseURL, getHeaders, fetch: options.fetch };
}

// --- Default Provider (V2 — compatible with OpenCode, ai SDK v5) ---

export interface ApertisProvider extends ProviderV2 {
  (modelId: ApertisModelId, settings?: ApertisChatSettings): LanguageModelV2;
  chat(
    modelId: ApertisModelId,
    settings?: ApertisChatSettings,
  ): LanguageModelV2;
  languageModel(modelId: string): LanguageModelV2;
  textEmbeddingModel(
    modelId: ApertisEmbeddingModelId,
    settings?: ApertisEmbeddingSettings,
  ): EmbeddingModelV2<string>;
  imageModel(modelId: string): never;
}

export function createApertis(
  options: ApertisProviderSettings = {},
): ApertisProvider {
  const { baseURL, getHeaders, fetch: fetchImpl } = initializeProvider(options);

  const createChatModel = (
    modelId: ApertisModelId,
    settings: ApertisChatSettings = {},
  ): LanguageModelV2 =>
    new ApertisChatLanguageModelV2(modelId, settings, {
      provider: "apertis.chat",
      baseURL,
      headers: getHeaders,
      fetch: fetchImpl,
    });

  const createEmbeddingModel = (
    modelId: ApertisEmbeddingModelId,
    settings: ApertisEmbeddingSettings = {},
  ): EmbeddingModelV2<string> =>
    new ApertisEmbeddingModelV2(modelId, settings, {
      provider: "apertis.embedding",
      baseURL,
      headers: getHeaders,
      fetch: fetchImpl,
    });

  const provider: ApertisProvider = Object.assign(
    (modelId: ApertisModelId, settings?: ApertisChatSettings) =>
      createChatModel(modelId, settings),
    {
      specificationVersion: "v2" as const,
      chat: createChatModel,
      languageModel: (modelId: string) => createChatModel(modelId),
      textEmbeddingModel: createEmbeddingModel,
      imageModel: (): never => {
        throw new Error("Image models are not supported by Apertis");
      },
    },
  );

  return provider;
}

// --- V3 Provider (for ai SDK v6+) ---

export interface ApertisProviderV3 extends ProviderV3 {
  (modelId: ApertisModelId, settings?: ApertisChatSettings): LanguageModelV3;
  chat(
    modelId: ApertisModelId,
    settings?: ApertisChatSettings,
  ): LanguageModelV3;
  languageModel(modelId: string): LanguageModelV3;
  embeddingModel(modelId: string): EmbeddingModelV3;
  textEmbeddingModel(
    modelId: ApertisEmbeddingModelId,
    settings?: ApertisEmbeddingSettings,
  ): EmbeddingModelV3;
  imageModel(modelId: string): never;
}

export function createApertisV3(
  options: ApertisProviderSettings = {},
): ApertisProviderV3 {
  const { baseURL, getHeaders, fetch: fetchImpl } = initializeProvider(options);

  const createChatModel = (
    modelId: ApertisModelId,
    settings: ApertisChatSettings = {},
  ): LanguageModelV3 =>
    new ApertisChatLanguageModel(modelId, settings, {
      provider: "apertis.chat",
      baseURL,
      headers: getHeaders,
      fetch: fetchImpl,
    });

  const createEmbeddingModel = (
    modelId: ApertisEmbeddingModelId,
    settings: ApertisEmbeddingSettings = {},
  ): EmbeddingModelV3 =>
    new ApertisEmbeddingModel(modelId, settings, {
      provider: "apertis.embedding",
      baseURL,
      headers: getHeaders,
      fetch: fetchImpl,
    });

  const provider: ApertisProviderV3 = Object.assign(
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
 * Default Apertis provider instance (V2).
 */
export const apertis = createApertis();
