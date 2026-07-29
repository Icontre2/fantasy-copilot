import assert from "node:assert/strict";
import test from "node:test";
import {
  LALIGA_CLIENT_ID,
  LALIGA_EXPECTED_ISSUER,
  getLaligaTokenMaxAge,
  openLaligaSession,
  sealLaligaSession,
} from "./laliga-session.ts";

process.env.LALIGA_SESSION_SECRET =
  "test-only-secret-that-is-longer-than-thirty-two-bytes";

function base64Url(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function token(exp: number, overrides: Record<string, unknown> = {}) {
  return [
    base64Url({ alg: "none", typ: "JWT" }),
    base64Url({
      aud: LALIGA_CLIENT_ID,
      exp,
      iss: LALIGA_EXPECTED_ISSUER,
      ...overrides,
    }),
    "test-signature",
  ].join(".");
}

test("encrypts a session and binds it to the Fantasy Copilot user", async () => {
  const now = 1_800_000_000;
  const accessToken = token(now + 3_600);
  const sealed = await sealLaligaSession(accessToken, "user-1", now);

  assert.notEqual(sealed.value.includes(accessToken), true);
  assert.equal(sealed.maxAge, 3_600);
  assert.deepEqual(await openLaligaSession(sealed.value, "user-1", now), {
    accessToken,
    expiresAt: now + 3_600,
  });
  assert.equal(await openLaligaSession(sealed.value, "user-2", now), null);
});

test("rejects tampered, expired and unexpected tokens", async () => {
  const now = 1_800_000_000;
  const valid = token(now + 3_600);
  const sealed = await sealLaligaSession(valid, "user-1", now);
  const tamperIndex = sealed.value.length - 5;
  const tampered =
    sealed.value.slice(0, tamperIndex) +
    (sealed.value[tamperIndex] === "a" ? "b" : "a") +
    sealed.value.slice(tamperIndex + 1);

  assert.equal(await openLaligaSession(tampered, "user-1", now), null);
  assert.equal(getLaligaTokenMaxAge(token(now - 1), now), null);
  assert.equal(
    getLaligaTokenMaxAge(token(now + 3_600, { aud: "other-client" }), now),
    null,
  );
  assert.equal(
    getLaligaTokenMaxAge(token(now + 3_600, { iss: "https://example.com/" }), now),
    null,
  );
});
