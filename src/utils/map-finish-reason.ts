import type {
  LanguageModelV2FinishReason,
  LanguageModelV3FinishReason,
} from "@ai-sdk/provider";

type NormalizedFinishReason =
  | "stop"
  | "length"
  | "tool-calls"
  | "content-filter"
  | "other";

function normalizeFinishReason(
  finishReason: string | null | undefined,
): NormalizedFinishReason {
  switch (finishReason) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "tool_calls":
      return "tool-calls";
    case "content_filter":
      return "content-filter";
    default:
      return "other";
  }
}

export function mapApertisFinishReason(
  finishReason: string | null | undefined,
): LanguageModelV3FinishReason {
  return {
    unified: normalizeFinishReason(finishReason),
    raw: finishReason ?? undefined,
  };
}

export function mapApertisFinishReasonV2(
  finishReason: string | null | undefined,
): LanguageModelV2FinishReason {
  return normalizeFinishReason(finishReason);
}
