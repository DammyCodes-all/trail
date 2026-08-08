import { describe, expect, it } from "vitest";
import { redactBody, redactText, redactUrl, scrubShapes } from "./redaction";

describe("redactBody JSON", () => {
  it("masks values under sensitive keys and keeps everything else", () => {
    const out = redactBody(
      JSON.stringify({ email: "a@b.com", password: "hunter2", qty: 2, user: "alice" }),
    )!;
    const parsed = JSON.parse(out) as Record<string, unknown>;
    expect(parsed.password).toBe("[redacted]");
    expect(parsed.user).toBe("alice");
    expect(parsed.qty).toBe(2);
    expect(parsed.email).toBe("[redacted]@b.com");
    expect(out).not.toContain("hunter2");
    expect(out).not.toContain("a@b.com");
  });

  it("recurse into nested objects, preserving structure", () => {
    const out = redactBody(
      JSON.stringify({ auth: { type: "basic" }, user: { token: "abc123" } }),
    )!;
    expect(JSON.parse(out)).toEqual({
      auth: { type: "basic" },
      user: { token: "[redacted]" },
    });
  });

  it("masks numbers under sensitive keys, arrays get shape-scrubbed", () => {
    const out = redactBody(JSON.stringify({ cvv: 123, users: ["a@b.com"] }))!;
    const parsed = JSON.parse(out) as Record<string, unknown>;
    expect(parsed.cvv).toBe("[redacted]");
    expect(parsed.users).toEqual(["[redacted]@b.com"]);
  });

  it("keeps valid JSON parseable and unchanged when nothing is sensitive", () => {
    const body = JSON.stringify({ user: "alice", roles: ["admin"], id: 42 });
    expect(redactBody(body)).toBe(body);
  });

  it("re-appends the truncation marker", () => {
    const out = redactBody('{"password":"hunter2"}\n...(truncated)')!;
    expect(out).toContain('"password":"[redacted]"');
    expect(out.endsWith("\n...(truncated)")).toBe(true);
  });

  it("scrubs a truncated JSON document anyway", () => {
    const out = redactBody('{"password": "hunter2"')!;
    expect(out).not.toContain("hunter2");
    expect(out).toContain("[redacted]");
  });
});

describe("redactBody urlencoded", () => {
  it("masks sensitive keys and shape-checks values, decoded", () => {
    const out = redactBody("email=a%40b.com&password=hunter2&q=search")!;
    expect(out).toContain("password=[redacted]");
    expect(out).toContain("email=[redacted]@b.com");
    expect(out).toContain("q=search");
    expect(out).not.toContain("hunter2");
    expect(out).not.toContain("a@b.com");
  });
});

describe("redactBody plain text", () => {
  it("masks key-value pairs and secret shapes in prose", () => {
    const out = redactBody("login failed for a@b.com, token=sekret123, bearer abc")!;
    expect(out).toContain("[redacted]@b.com");
    expect(out).toContain("token=[redacted]");
    expect(out).not.toContain("sekret123");
    expect(out).not.toContain("a@b.com");
  });

  it("leaves undefined as undefined", () => {
    expect(redactBody(undefined)).toBeUndefined();
  });
});

describe("scrubShapes", () => {
  it("masks card numbers (Luhn-valid), emails keep their domain", () => {
    expect(scrubShapes("card 4242 4242 4242 4242 paid")).toBe("card [redacted] paid");
    expect(scrubShapes("4242424242424242")).toBe("[redacted]");
    expect(scrubShapes("contact a@b.com now")).toBe("contact [redacted]@b.com now");
  });

  it("masks JWTs, Bearer tokens, and provider-prefixed secrets", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    expect(scrubShapes(`token ${jwt}`)).toBe(`token ${"[redacted]"}`);
    expect(scrubShapes("Authorization: Bearer aaaa.bbbb.cccc.dddd.eeee.ffff")).toBe(
      "Authorization: [redacted]",
    );
    expect(scrubShapes("key ghp_12345678901234567890123456")).toBe(
      "key [redacted]",
    );
  });

  it("keeps prose and short values untouched (conservative)", () => {
    expect(scrubShapes("error code=500")).toBe("error code=500");
    expect(scrubShapes("supercalifragilisticexpialidocious")).toBe(
      "supercalifragilisticexpialidocious",
    );
    expect(scrubShapes("id abc123")).toBe("id abc123");
    expect(scrubShapes("a href=/home/user/src/very/long/path/segment/here/file.js")).toBe(
      "a href=/home/user/src/very/long/path/segment/here/file.js",
    );
  });

  it("masks long mixed token runs but not pure-word runs", () => {
    const hex = "a3f0b1c2d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5";
    expect(scrubShapes(`nonce ${hex}`)).toBe("nonce [redacted]");
  });
});

describe("redactUrl", () => {
  it("masks sensitive query params and keeps path plus other params", () => {
    const out = redactUrl("https://x.com/checkout?token=sekret&q=hi&email=a@b.com");
    expect(out).toBe("https://x.com/checkout?token=[redacted]&q=hi&email=[redacted]@b.com");
  });

  it("leaves URLs without a query string untouched", () => {
    expect(redactUrl("https://x.com/checkout")).toBe("https://x.com/checkout");
  });

  it("handles relative targets", () => {
    expect(redactUrl("/missing?token=abc")).toBe("/missing?token=[redacted]");
  });
});

describe("redactText", () => {
  it("scrubs key-value pairs and shapes in console output", () => {
    const out = redactText('login failed: {"password": "hunter2"} contact a@b.com');
    expect(out).not.toContain("hunter2");
    expect(out).not.toContain("a@b.com");
    expect(out).toContain("[redacted]");
  });

  it("leaves ordinary messages alone", () => {
    expect(redactText("TypeError: x is undefined")).toBe("TypeError: x is undefined");
  });
});
