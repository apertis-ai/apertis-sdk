import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApertis } from "./apertis-provider";

describe("createApertis", () => {
  beforeEach(() => {
    vi.stubEnv("APERTIS_API_KEY", "test-api-key");
  });

  it("creates a provider with default settings", () => {
    const provider = createApertis();
    expect(provider).toBeDefined();
    expect(typeof provider).toBe("function");
    expect(typeof provider.chat).toBe("function");
    expect(typeof provider.languageModel).toBe("function");
  });

  it("creates a chat model with correct provider id", () => {
    const provider = createApertis({ apiKey: "test-key" });
    const model = provider("gpt-5.2");

    expect(model.provider).toBe("apertis.chat");
    expect(model.modelId).toBe("gpt-5.2");
  });

  it("creates a chat model via chat method", () => {
    const provider = createApertis({ apiKey: "test-key" });
    const model = provider.chat("claude-sonnet-4.5");

    expect(model.provider).toBe("apertis.chat");
    expect(model.modelId).toBe("claude-sonnet-4.5");
  });

  it("creates a chat model via languageModel method", () => {
    const provider = createApertis({ apiKey: "test-key" });
    const model = provider.languageModel("gemini-3-pro-preview");

    expect(model.provider).toBe("apertis.chat");
    expect(model.modelId).toBe("gemini-3-pro-preview");
  });

  it("accepts custom base URL", () => {
    const provider = createApertis({
      apiKey: "test-key",
      baseURL: "https://custom.api.com/v1/",
    });
    const model = provider("gpt-5.2");

    expect(model.provider).toBe("apertis.chat");
  });

  it("model has correct capabilities", () => {
    const provider = createApertis({ apiKey: "test-key" });
    const model = provider("gpt-5.2");

    expect(model.specificationVersion).toBe("v3");
    expect(model.supportedUrls).toBeDefined();
    // supportedUrls is a Record with image/* key for HTTP(S) image URLs
    const urls = model.supportedUrls as Record<string, RegExp[]>;
    expect(urls["image/*"]).toBeDefined();
    expect(urls["image/*"][0]).toBeInstanceOf(RegExp);
  });
});
