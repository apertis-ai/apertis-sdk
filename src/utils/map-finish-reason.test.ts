import { describe, expect, it } from "vitest";
import {
  mapApertisFinishReason,
  mapApertisFinishReasonV2,
} from "./map-finish-reason";

describe("mapApertisFinishReason", () => {
  it('maps "stop" to { unified: "stop", raw: "stop" }', () => {
    expect(mapApertisFinishReason("stop")).toEqual({
      unified: "stop",
      raw: "stop",
    });
  });

  it('maps "length" to { unified: "length", raw: "length" }', () => {
    expect(mapApertisFinishReason("length")).toEqual({
      unified: "length",
      raw: "length",
    });
  });

  it('maps "tool_calls" to { unified: "tool-calls", raw: "tool_calls" }', () => {
    expect(mapApertisFinishReason("tool_calls")).toEqual({
      unified: "tool-calls",
      raw: "tool_calls",
    });
  });

  it('maps "content_filter" to { unified: "content-filter", raw: "content_filter" }', () => {
    expect(mapApertisFinishReason("content_filter")).toEqual({
      unified: "content-filter",
      raw: "content_filter",
    });
  });

  it('maps null to { unified: "other", raw: undefined }', () => {
    expect(mapApertisFinishReason(null)).toEqual({
      unified: "other",
      raw: undefined,
    });
  });

  it('maps undefined to { unified: "other", raw: undefined }', () => {
    expect(mapApertisFinishReason(undefined)).toEqual({
      unified: "other",
      raw: undefined,
    });
  });

  it('maps unknown string to { unified: "other", raw: "something_else" }', () => {
    expect(mapApertisFinishReason("something_else")).toEqual({
      unified: "other",
      raw: "something_else",
    });
  });
});

describe("mapApertisFinishReasonV2", () => {
  it('maps "stop" to string "stop"', () => {
    expect(mapApertisFinishReasonV2("stop")).toBe("stop");
  });

  it('maps "length" to string "length"', () => {
    expect(mapApertisFinishReasonV2("length")).toBe("length");
  });

  it('maps "tool_calls" to string "tool-calls"', () => {
    expect(mapApertisFinishReasonV2("tool_calls")).toBe("tool-calls");
  });

  it('maps "content_filter" to string "content-filter"', () => {
    expect(mapApertisFinishReasonV2("content_filter")).toBe("content-filter");
  });

  it('maps null to string "other"', () => {
    expect(mapApertisFinishReasonV2(null)).toBe("other");
  });

  it('maps undefined to string "other"', () => {
    expect(mapApertisFinishReasonV2(undefined)).toBe("other");
  });

  it('maps unknown string to "other"', () => {
    expect(mapApertisFinishReasonV2("something_else")).toBe("other");
  });
});
