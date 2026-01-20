import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3Content,
  LanguageModelV3FinishReason,
  LanguageModelV3FunctionTool,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamPart,
  LanguageModelV3StreamResult,
  LanguageModelV3Usage,
  SharedV3Warning,
} from "@ai-sdk/provider";
import {
  type ParseResult,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  generateId,
  postJsonToApi,
} from "@ai-sdk/provider-utils";
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
  mapApertisFinishReason,
} from "./utils";

export interface ApertisChatConfig {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string>;
  fetch?: typeof fetch;
}

export class ApertisChatLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = "v3" as const;

  /**
   * Supported URL patterns for different media types.
   * Supports HTTP(S) image URLs for direct URL passing.
   */
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

  async doGenerate(
    options: LanguageModelV3CallOptions,
  ): Promise<LanguageModelV3GenerateResult> {
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

    // Build V3 content array
    const content: LanguageModelV3Content[] = [];

    // Add text content if present
    if (choice.message.content) {
      content.push({
        type: "text",
        text: choice.message.content,
      });
    }

    // Add tool calls if present
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
      finishReason: mapApertisFinishReason(choice.finish_reason),
      usage: {
        inputTokens: {
          total: response.usage?.prompt_tokens ?? 0,
          noCache: undefined,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: {
          total: response.usage?.completion_tokens ?? 0,
          text: undefined,
          reasoning: undefined,
        },
      },
      warnings: [],
      request: { body },
    };
  }

  async doStream(
    options: LanguageModelV3CallOptions,
  ): Promise<LanguageModelV3StreamResult> {
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
      LanguageModelV3StreamPart
    >({
      transform(parseResult, controller) {
        // Skip failed parse results
        if (!parseResult.success) {
          return;
        }

        const chunk = parseResult.value;
        const choice = chunk.choices[0];

        if (!choice) return;

        // Handle text delta with start/delta/end pattern
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

        // Handle tool calls
        if (choice.delta.tool_calls) {
          for (const tc of choice.delta.tool_calls) {
            let buffer = toolCallBuffers.get(tc.index);

            if (!buffer) {
              buffer = { id: tc.id ?? generateId(), name: "", arguments: "" };
              toolCallBuffers.set(tc.index, buffer);
            }

            if (tc.id) buffer.id = tc.id;
            if (tc.function?.name) buffer.name += tc.function.name;
            if (tc.function?.arguments)
              buffer.arguments += tc.function.arguments;
          }
        }

        // Handle finish
        if (choice.finish_reason) {
          // End text stream if started
          if (textId) {
            controller.enqueue({
              type: "text-end",
              id: textId,
            });
          }

          // Emit completed tool calls (only those with valid names)
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
          // Clear buffers after emitting
          toolCallBuffers.clear();

          controller.enqueue({
            type: "finish",
            finishReason: mapApertisFinishReason(choice.finish_reason),
            usage: {
              inputTokens: {
                total: chunk.usage?.prompt_tokens ?? 0,
                noCache: undefined,
                cacheRead: undefined,
                cacheWrite: undefined,
              },
              outputTokens: {
                total: chunk.usage?.completion_tokens ?? 0,
                text: undefined,
                reasoning: undefined,
              },
            },
          });
        }
      },
      flush(controller) {
        // End text stream if started but not ended
        if (textId) {
          controller.enqueue({
            type: "text-end",
            id: textId,
          });
        }

        // Emit any remaining buffered tool calls when stream closes early
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
    options: LanguageModelV3CallOptions,
    stream: boolean,
  ) {
    // Extract function tools from options.tools
    const tools = this.filterFunctionTools(options.tools);

    // Determine response format
    const responseFormat =
      options.responseFormat?.type === "json"
        ? { type: "json_object" as const }
        : undefined;

    const body: Record<string, unknown> = {
      model: this.modelId,
      messages: convertToOpenAIMessages(options.prompt),
      stream,
    };

    // Only add defined optional fields to avoid sending undefined to API
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
    tools: LanguageModelV3CallOptions["tools"],
  ): LanguageModelV3FunctionTool[] | undefined {
    if (!tools) return undefined;
    return tools.filter(
      (tool): tool is LanguageModelV3FunctionTool => tool.type === "function",
    );
  }
}
