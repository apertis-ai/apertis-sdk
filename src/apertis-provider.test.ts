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
    expect(typeof provider.languageModel).toBe("function");
    expect(typeof provider.textEmbeddingModel).toBe("function");
  });

  it("creates a chat model with correct model id", () => {
    const provider = createApertis({ apiKey: "test-key" });
    const model = provider.languageModel("gpt-5.2");

    expect(model.modelId).toBe("gpt-5.2");
  });

  it("creates a chat model via callable", () => {
    const provider = createApertis({ apiKey: "test-key" });
    const model = provider("claude-sonnet-4.5");

    expect(model.modelId).toBe("claude-sonnet-4.5");
  });

  it("accepts custom base URL", () => {
    const provider = createApertis({
      apiKey: "test-key",
      baseURL: "https://custom.api.com/v1",
    });
    const model = provider.languageModel("gpt-5.2");

    expect(model.modelId).toBe("gpt-5.2");
  });

  it("defaults base URL to apertis.ai", () => {
    const provider = createApertis({ apiKey: "test-key" });
    const model = provider.languageModel("test");
    expect(model).toBeDefined();
  });
});
