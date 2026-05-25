import { describe, it, expect } from "vitest";
import { createSessionToken, verifySessionToken } from "./auth";

describe("session tokens", () => {
  it("verifies a token created with the same secret", async () => {
    const token = await createSessionToken("hunter2");
    expect(await verifySessionToken(token, "hunter2")).toBe(true);
  });
  it("rejects a token checked against the wrong secret", async () => {
    const token = await createSessionToken("hunter2");
    expect(await verifySessionToken(token, "wrong-secret")).toBe(false);
  });
  it("rejects an empty token", async () => {
    expect(await verifySessionToken("", "hunter2")).toBe(false);
  });
  it("rejects a garbage token", async () => {
    expect(await verifySessionToken("deadbeef", "hunter2")).toBe(false);
  });
});
