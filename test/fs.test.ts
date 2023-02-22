import { describe, expect, it } from "vitest";
import { getMtime, getMtimeSync } from "../src";

describe("fs", () => {
  it("getMtime", async () => {
    expect(
      await getMtime("./package.json"),
    ).toMatchInlineSnapshot("1675144039337");
  });

  it("getMtimeSync", () => {
    expect(
      getMtimeSync("./package.json"),
    ).toMatchInlineSnapshot("1675144039337");
  });

  it("getMtime", async () => {
    expect(
      await getMtime("test/fixture"),
    ).toMatchInlineSnapshot("1675145560660");
  });
});
