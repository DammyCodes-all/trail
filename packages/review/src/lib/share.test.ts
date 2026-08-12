import { describe, expect, it } from "vitest";
import { isShareLink, resolveSharePayloadUrl, toWebShareLink } from "./share";

describe("isShareLink", () => {
  it("accepts web-app links", () => {
    expect(isShareLink("http://localhost:3000/r/9f8e7d6c-5b4a-4c3b-2a19-876543210fed")).toBe(
      true,
    );
    expect(isShareLink("https://trail-web.example.com/r/9f8e7d6c")).toBe(true);
  });

  it("accepts legacy replay-server links", () => {
    expect(
      isShareLink("https://trail-roan.vercel.app/api/replays/9f8e7d6c"),
    ).toBe(true);
    expect(isShareLink("http://localhost:8898/api/replays/abc-123")).toBe(true);
  });

  it("rejects non-TRAIL links", () => {
    expect(isShareLink("https://example.com/not-a-trail-link")).toBe(false);
    expect(isShareLink("https://example.com/r/")).toBe(false);
    expect(isShareLink("http://localhost:8898/other/route")).toBe(false);
    expect(isShareLink("not a url")).toBe(false);
    expect(isShareLink("https://example.com/api/replays/")).toBe(false);
    expect(isShareLink("https://example.com/api/")).toBe(false);
  });
});

describe("toWebShareLink", () => {
  it("normalizes legacy payload links to the web replay route", () => {
    expect(toWebShareLink("https://trail-roan.vercel.app/api/replays/xyz")).toBe(
      "http://localhost:3000/r/xyz",
    );
  });

  it("leaves web replay links unchanged", () => {
    const link = "https://trail-web.example.com/r/xyz";
    expect(toWebShareLink(link)).toBe(link);
  });
});

describe("resolveSharePayloadUrl", () => {
  it("maps a web link to this deployment's replay payload route", () => {
    expect(
      resolveSharePayloadUrl("http://localhost:3000/r/abc-123"),
    ).toBe("http://localhost:8898/api/replays/abc-123");
  });

  it("passes legacy payload links through unchanged", () => {
    expect(
      resolveSharePayloadUrl("https://trail-roan.vercel.app/api/replays/xyz"),
    ).toBe("https://trail-roan.vercel.app/api/replays/xyz");
  });
});
