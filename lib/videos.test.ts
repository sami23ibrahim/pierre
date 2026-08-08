import { describe, it, expect, afterEach } from "vitest";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseVimeoId, prepareVideos, getVideos, SEED_VIDEOS, type DraftVideo } from "./videos";

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
  it("accepts a vimeo.com/manage/videos URL", () => {
    expect(parseVimeoId("https://vimeo.com/manage/videos/1131470962")).toBe("1131470962");
  });
  it("extracts the ID from a full Vimeo embed iframe", () => {
    const embed =
      '<iframe src="https://player.vimeo.com/video/898044833?title=0&amp;byline=0&amp;portrait=0" width="1920" height="1080" frameborder="0"></iframe>';
    expect(parseVimeoId(embed)).toBe("898044833");
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

describe("getVideos with VIDEOS_FILE override", () => {
  const fixture = join(tmpdir(), "pierre-videos-fixture.json");

  afterEach(() => {
    delete process.env.VIDEOS_FILE;
    try { unlinkSync(fixture); } catch {}
  });

  it("reads the list from the file instead of Blob", async () => {
    const list = [{ id: "t-1", vimeoId: "123", client: "Acme", title: "" }];
    writeFileSync(fixture, JSON.stringify(list));
    process.env.VIDEOS_FILE = fixture;
    expect(await getVideos()).toEqual(list);
  });

  it("falls back to the normal path when the file is missing", async () => {
    process.env.VIDEOS_FILE = join(tmpdir(), "does-not-exist.json");
    // No Blob credentials in tests, so the normal path resolves to the seeds.
    expect(await getVideos()).toEqual(SEED_VIDEOS);
  });
});
