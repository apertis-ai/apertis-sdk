import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2CallWarning,
  LanguageModelV2Content,
  LanguageModelV2FinishReason,
  LanguageModelV2FunctionTool,
  LanguageModelV2StreamPart,
  LanguageModelV2Usage,
} from "@ai-sdk/provider";
import {
  type ParseResult,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  generateId,
  postJsonToApi,
} from "@ai-sdk/provider-utils";
import type { ApertisChatConfig } from "./apertis-chat-language-model";
import type { ApertisChatSettings } from "./apertis-chat-settings";
import { apertisFailedResponseHandler } from "./apertis-error";
import {
  type OpenAIChatChunk,
  openAIChatChunkSchema,
  openAIChatResponseSchema,
} from "./schemas/chat-response";
import {
  convertToOpenAIMessages,
  convertToOpenAIToolChoice,
  convertToOpenAITools,
  mapApertisFinishReasonV2,
} from "./utils";

export class ApertisChatLanguageModelV2 implements LanguageModelV2 {
  readonly specificationVersion = "v2" as const;

  readonly supportedUrls: Record<string, RegExp[]> = {
    "image/*": [/^https?:\/\/.+$/],
  };

  constructor(
    readonly modelId: string,
    private readonly settings: ApertisChatSettings,
    private readonly config: ApertisChatConfig,
  ) {}

  get provider(): string {
    return this.config.provider;
  }

  async doGenerate(options: LanguageModelV2CallOptions): Promise<{
    content: Array<LanguageModelV2Content>;
    finishReason: LanguageModelV2FinishReason;
    usage: LanguageModelV2Usage;
    warnings: Array<LanguageModelV2CallWarning>;
    request?: { body?: unknown };
    response?: { headers?: Record<string, string>; body?: unknown };
  }> {
    const body = this.buildRequestBody(options, false);

    const { value: response } = await postJsonToApi({
      url: `${this.config.baseURL}/chat/completions`,
      headers: this.config.headers(),
      body,
      failedResponseHandler: apertisFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        openAIChatResponseSchema,
      ),
      fetch: this.config.fetch,
      abortSignal: options.abortSignal,
    });

    const choice = response.choices[0];

    const content: LanguageModelV2Content[] = [];

    if (choice.message.content) {
      content.push({
        type: "text",
        text: choice.message.content,
      });
    }

    if (choice.message.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        content.push({
          type: "tool-call",
          toolCallId: tc.id,
          toolName: tc.function.name,
          input: tc.function.arguments,
        });
      }
    }

    return {
      content,
      finishReason: mapApertisFinishReasonV2(choice.finish_reason),
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? undefined,
      },
      warnings: [],
      request: { body },
    };
  }

  async doStream(options: LanguageModelV2CallOptions): Promise<{
    stream: ReadableStream<LanguageModelV2StreamPart>;
    request?: { body?: unknown };
  }> {
    const body = this.buildRequestBody(options, true);

    const { value: response } = await postJsonToApi({
      url: `${this.config.baseURL}/chat/completions`,
      headers: this.config.headers(),
      body,
      failedResponseHandler: apertisFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler(
        openAIChatChunkSchema,
      ),
      fetch: this.config.fetch,
      abortSignal: options.abortSignal,
    });

    const toolCallBuffers: Map<
      number,
      { id: string; name: string; arguments: string }
    > = new Map();

    let textId: string | null = null;

    const transformStream = new TransformStream<
      ParseResult<OpenAIChatChunk>,
      LanguageModelV2StreamPart
    >({
      transform(parseResult, controller) {
        if (!parseResult.success) {
          return;
        }

        const chunk = parseResult.value;
        const choice = chunk.choices[0];

        if (!choice) return;

        if (choice.delta.content) {
          if (!textId) {
            textId = generateId();
            controller.enqueue({
              type: "text-start",
              id: textId,
            });
          }
          controller.enqueue({
            type: "text-delta",
            id: textId,
            delta: choice.delta.content,
          });
        }

        if (choice.delta.tool_calls) {
          for (const tc of choice.delta.tool_calls) {
            let buffer = toolCallBuffers.get(tc.index);

            if (!buffer) {
              buffer = {
                id: tc.id ?? generateId(),
                name: "",
                arguments: "",
              };
              toolCallBuffers.set(tc.index, buffer);
            }

            if (tc.id) buffer.id = tc.id;
            if (tc.function?.name) buffer.name += tc.function.name;
            if (tc.function?.arguments)
              buffer.arguments += tc.function.arguments;
          }
        }

        if (choice.finish_reason) {
          if (textId) {
            controller.enqueue({
              type: "text-end",
              id: textId,
            });
            textId = null;
          }

          for (const [, buffer] of toolCallBuffers) {
            if (buffer.name) {
              controller.enqueue({
                type: "tool-call",
                toolCallId: buffer.id,
                toolName: buffer.name,
                input: buffer.arguments,
              });
            }
          }
          toolCallBuffers.clear();

          controller.enqueue({
            type: "finish",
            finishReason: mapApertisFinishReasonV2(choice.finish_reason),
            usage: {
              inputTokens: chunk.usage?.prompt_tokens ?? 0,
              outputTokens: chunk.usage?.completion_tokens ?? 0,
              totalTokens: undefined,
            },
          });
        }
      },
      flush(controller) {
        if (textId) {
          controller.enqueue({
            type: "text-end",
            id: textId,
          });
        }

        for (const [, buffer] of toolCallBuffers) {
          if (buffer.name) {
            controller.enqueue({
              type: "tool-call",
              toolCallId: buffer.id,
              toolName: buffer.name,
              input: buffer.arguments,
            });
          }
        }
      },
    });

    return {
      stream: response.pipeThrough(transformStream),
      request: { body },
    };
  }

  private buildRequestBody(
    options: LanguageModelV2CallOptions,
    stream: boolean,
  ) {
    const tools = this.filterFunctionTools(options.tools);

    const responseFormat =
      options.responseFormat?.type === "json"
        ? { type: "json_object" as const }
        : undefined;

    const body: Record<string, unknown> = {
      model: this.modelId,
      messages: convertToOpenAIMessages(options.prompt),
      stream,
    };

    if (stream) body.stream_options = { include_usage: true };
    if (options.temperature !== undefined)
      body.temperature = options.temperature;
    if (options.maxOutputTokens !== undefined)
      body.max_tokens = options.maxOutputTokens;
    if (options.topP !== undefined) body.top_p = options.topP;
    if (options.frequencyPenalty !== undefined)
      body.frequency_penalty = options.frequencyPenalty;
    if (options.presencePenalty !== undefined)
      body.presence_penalty = options.presencePenalty;
    if (options.stopSequences !== undefined) body.stop = options.stopSequences;
    if (options.seed !== undefined) body.seed = options.seed;

    const convertedTools = convertToOpenAITools(tools);
    if (convertedTools !== undefined) body.tools = convertedTools;

    const convertedToolChoice = convertToOpenAIToolChoice(options.toolChoice);
    if (convertedToolChoice !== undefined)
      body.tool_choice = convertedToolChoice;

    if (responseFormat !== undefined) body.response_format = responseFormat;
    if (this.settings.user !== undefined) body.user = this.settings.user;
    if (this.settings.logprobs !== undefined)
      body.logprobs = this.settings.logprobs;
    if (this.settings.topLogprobs !== undefined)
      body.top_logprobs = this.settings.topLogprobs;

    return body;
  }

  private filterFunctionTools(
    tools: LanguageModelV2CallOptions["tools"],
  ): LanguageModelV2FunctionTool[] | undefined {
    if (!tools) return undefined;
    return tools.filter(
      (tool): tool is LanguageModelV2FunctionTool => tool.type === "function",
    );
  }
}
