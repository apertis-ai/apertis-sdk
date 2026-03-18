import type { EmbeddingModelV2 } from "@ai-sdk/provider";
import {
  createJsonResponseHandler,
  postJsonToApi,
} from "@ai-sdk/provider-utils";
import type { ApertisEmbeddingConfig } from "./apertis-embedding-model";
import type {
  ApertisEmbeddingModelId,
  ApertisEmbeddingSettings,
} from "./apertis-embedding-settings";
import { apertisFailedResponseHandler } from "./apertis-error";
import { openAIEmbeddingResponseSchema } from "./schemas/embedding-response";

export class ApertisEmbeddingModelV2 implements EmbeddingModelV2<string> {
  readonly specificationVersion = "v2" as const;

  readonly maxEmbeddingsPerCall: number;
  readonly supportsParallelCalls: boolean;

  constructor(
    readonly modelId: ApertisEmbeddingModelId,
    private readonly settings: ApertisEmbeddingSettings,
    private readonly config: ApertisEmbeddingConfig,
  ) {
    this.maxEmbeddingsPerCall = settings.maxEmbeddingsPerCall ?? 2048;
    this.supportsParallelCalls = settings.supportsParallelCalls ?? true;
  }

  get provider(): string {
    return this.config.provider;
  }

  async doEmbed(options: {
    values: string[];
    abortSignal?: AbortSignal;
    headers?: Record<string, string | undefined>;
  }) {
    const body: Record<string, unknown> = {
      model: this.modelId,
      input: options.values,
      encoding_format: "float",
    };

    if (this.settings.dimensions !== undefined) {
      body.dimensions = this.settings.dimensions;
    }
    if (this.settings.user !== undefined) {
      body.user = this.settings.user;
    }

    const { value: response } = await postJsonToApi({
      url: `${this.config.baseURL}/embeddings`,
      headers: this.config.headers(),
      body,
      failedResponseHandler: apertisFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        openAIEmbeddingResponseSchema,
      ),
      fetch: this.config.fetch,
      abortSignal: options.abortSignal,
    });

    return {
      embeddings: response.data.map((item) => item.embedding),
      usage: response.usage
        ? { tokens: response.usage.prompt_tokens }
        : undefined,
    };
  }
}
