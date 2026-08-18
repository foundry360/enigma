import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret";

const previous = process.env.TOKEN_ENCRYPTION_KEY;

afterEach(() => {
  process.env.TOKEN_ENCRYPTION_KEY = previous;
});

describe("secret encryption", () => {
  it("round-trips a refresh token", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "ab".repeat(32);
    const cipher = encryptSecret("refresh-token-value");
    expect(cipher).not.toContain("refresh-token-value");
    expect(decryptSecret(cipher)).toBe("refresh-token-value");
  });
});
