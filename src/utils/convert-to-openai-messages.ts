import type { LanguageModelV3Prompt } from "@ai-sdk/provider";

export type OpenAIMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | OpenAIContentPart[] }
  | { role: "assistant"; content: string | null; tool_calls?: OpenAIToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type OpenAIContentPart =
  | { type: "text"; text: string }
  | {
      type: "image_url";
      image_url: { url: string; detail?: "auto" | "low" | "high" };
    };

export type OpenAIToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export function convertToOpenAIMessages(
  prompt: LanguageModelV3Prompt,
): OpenAIMessage[] {
  const messages: OpenAIMessage[] = [];

  for (const message of prompt) {
    switch (message.role) {
      case "system":
        // V3 system messages have content as string directly
        messages.push({ role: "system", content: message.content });
        break;

      case "user":
        messages.push({
          role: "user",
          content: message.content.map((part): OpenAIContentPart => {
            switch (part.type) {
              case "text":
                return { type: "text", text: part.text };
              case "file": {
                // V3 uses 'file' type with mediaType for images
                if (part.mediaType?.startsWith("image/")) {
                  let url: string;
                  if (part.data instanceof URL) {
                    url = part.data.toString();
                  } else if (typeof part.data === "string") {
                    // Assume it's a URL string or base64
                    if (
                      part.data.startsWith("http://") ||
                      part.data.startsWith("https://")
                    ) {
                      url = part.data;
                    } else {
                      // Base64 encoded string
                      url = `data:${part.mediaType};base64,${part.data}`;
                    }
                  } else {
                    // Uint8Array
                    url = `data:${part.mediaType};base64,${Buffer.from(part.data).toString("base64")}`;
                  }
                  return {
                    type: "image_url",
                    image_url: { url },
                  };
                }
                throw new Error(
                  `Unsupported file type: ${part.mediaType}. Only image/* is supported.`,
                );
              }
              default:
                throw new Error(
                  `Unsupported user content part type: ${(part as { type: string }).type}`,
                );
            }
          }),
        });
        break;

      case "assistant": {
        const textContent = message.content
          .filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("");

        const toolCalls = message.content
          .filter((p) => p.type === "tool-call")
          .map((tc) => {
            // V3 uses 'input' instead of 'args'
            let arguments_str = "{}";
            try {
              arguments_str =
                typeof tc.input === "string"
                  ? tc.input
                  : JSON.stringify(tc.input);
            } catch {
              arguments_str = "{}";
            }
            return {
              id: tc.toolCallId,
              type: "function" as const,
              function: { name: tc.toolName, arguments: arguments_str },
            };
          });

        messages.push({
          role: "assistant",
          content: textContent || null,
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        });
        break;
      }

      case "tool":
        for (const result of message.content) {
          if (result.type !== "tool-result") continue;

          // V3 uses 'output' instead of 'result'
          let content = "{}";
          const output = result.output;

          if (typeof output === "string") {
            content = output;
          } else if (Array.isArray(output)) {
            // Output can be an array of content parts
            const textParts = output
              .filter((p) => p.type === "text")
              .map((p) => p.text);
            content = textParts.join("");
          } else {
            try {
              content = JSON.stringify(output);
            } catch {
              content = "{}";
            }
          }

          messages.push({
            role: "tool",
            tool_call_id: result.toolCallId,
            content,
          });
        }
        break;
    }
  }

  return messages;
}
