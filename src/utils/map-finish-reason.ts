import type { LanguageModelV3FinishReason } from "@ai-sdk/provider";

export function mapApertisFinishReason(
  finishReason: string | null | undefined,
): LanguageModelV3FinishReason {
  const raw = finishReason ?? undefined;

  switch (finishReason) {
    case "stop":
      return { unified: "stop", raw };
    case "length":
      return { unified: "length", raw };
    case "tool_calls":
      return { unified: "tool-calls", raw };
    case "content_filter":
      return { unified: "content-filter", raw };
    default:
      return { unified: "other", raw };
  }
}
