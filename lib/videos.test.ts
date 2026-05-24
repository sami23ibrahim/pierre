import { describe, it, expect } from "vitest";
import { parseVimeoId, prepareVideos, type DraftVideo } from "./videos";

describe("parseVimeoId", () => {
  it("accepts a bare numeric ID", () => {
    expect(parseVimeoId("803985634")).toBe("803985634");
  });
  it("accepts a standard vimeo.com URL", () => {
    expect(parseVimeoId("https://vimeo.com/803985634")).toBe("803985634");
  });
  it("accepts a vimeo URL with a privacy hash", () => {
    expect(parseVimeoId("https://vimeo.com/803985634/abc123def")).toBe("803985634");
  });
  it("accepts a player.vimeo.com URL", () => {
    expect(parseVimeoId("https://player.vimeo.com/video/803985634")).toBe("803985634");
  });
  it("trims surrounding whitespace", () => {
    expect(parseVimeoId("  803985634  ")).toBe("803985634");
  });
  it("rejects an empty string", () => {
    expect(parseVimeoId("")).toBeNull();
  });
  it("rejects a non-Vimeo string", () => {
    expect(parseVimeoId("not a link")).toBeNull();
  });
});

describe("prepareVideos", () => {
  const draft = (over: Partial<DraftVideo>): DraftVideo => ({
    id: "x", link: "803985634", client: "Acme", title: "", ...over,
  });

  it("accepts a fully valid list", () => {
    const r = prepareVideos([draft({}), draft({ id: "y" })]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.videos).toHaveLength(2);
  });
  it("parses each link into a numeric vimeoId", () => {
    const r = prepareVideos([draft({ link: "https://vimeo.com/12345" })]);
    expect(r.ok && r.videos[0].vimeoId).toBe("12345");
  });
  it("allows an empty title", () => {
    expect(prepareVideos([draft({ title: "" })]).ok).toBe(true);
  });
  it("rejects an entry with an empty link (no blank cards)", () => {
    const r = prepareVideos([draft({ link: "" })]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].index).toBe(0);
  });
  it("rejects an entry with a blank client", () => {
    expect(prepareVideos([draft({ client: "   " })]).ok).toBe(false);
  });
  it("reports the index of a bad entry in the middle of the list", () => {
    const r = prepareVideos([draft({}), draft({ link: "" }), draft({})]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.index === 1)).toBe(true);
  });
});
