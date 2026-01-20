import { z } from "zod";

export const openAIChatResponseSchema = z.object({
  id: z.string().optional(),
  object: z.literal("chat.completion").optional(),
  created: z.number().optional(),
  model: z.string().optional(),
  choices: z.array(
    z.object({
      index: z.number(),
      message: z.object({
        role: z.literal("assistant"),
        content: z.string().nullable(),
        tool_calls: z
          .array(
            z.object({
              id: z.string(),
              type: z.literal("function"),
              function: z.object({
                name: z.string(),
                arguments: z.string(),
              }),
            }),
          )
          .optional(),
      }),
      finish_reason: z.string().nullable(),
      logprobs: z.any().nullable().optional(),
    }),
  ),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      total_tokens: z.number().optional(),
    })
    .optional(),
});

export type OpenAIChatResponse = z.infer<typeof openAIChatResponseSchema>;

export const openAIChatChunkSchema = z.object({
  id: z.string().optional(),
  object: z.literal("chat.completion.chunk").optional(),
  created: z.number().optional(),
  model: z.string().optional(),
  choices: z.array(
    z.object({
      index: z.number(),
      delta: z.object({
        role: z.literal("assistant").optional(),
        content: z.string().nullable().optional(),
        tool_calls: z
          .array(
            z.object({
              index: z.number(),
              id: z.string().optional(),
              type: z.literal("function").optional(),
              function: z
                .object({
                  name: z.string().optional(),
                  arguments: z.string().optional(),
                })
                .optional(),
            }),
          )
          .optional(),
      }),
      finish_reason: z.string().nullable().optional(),
    }),
  ),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
    })
    .nullish(),
});

export type OpenAIChatChunk = z.infer<typeof openAIChatChunkSchema>;
