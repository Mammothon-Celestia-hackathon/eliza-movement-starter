import { describe, it, expect } from "vitest";
import { stringToUuid } from "@elizaos/core";

describe("Test Cases", () => {
  it("Test Generating UUID", () => {
    const str = "production";
    console.log(stringToUuid(str));

    const str2 = "dev";
    console.log(stringToUuid(str2));
  });
});
