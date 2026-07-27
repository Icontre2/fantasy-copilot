import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "../../database.types";
import {
  isLaligaPrivateBetaConfigured,
  LALIGA_SESSION_COOKIE,
  openLaligaSession,
  type LaligaSession,
} from "../../laliga-session";

const LALIGA_API_BASE = "https://fantasy-api.llt-services.com/api";
const SAFE_SEGMENT = /^[A-Za-z0-9_-]{1,100}$/;
const MAX_UPSTREAM_BYTES = 2_000_000;

export class LaligaUpstreamError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function noStoreJson(
  body: unknown,
  init?: Parameters<typeof NextResponse.json>[1],
): NextResponse {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export function privateBetaUnavailable(): NextResponse | null {
  return isLaligaPrivateBetaConfigured()
    ? null
    : noStoreJson(
        { error: "El piloto privado de LALIGA no está activado." },
        { status: 503 },
      );
}

export function isSafeLaligaSegment(value: string): boolean {
  return SAFE_SEGMENT.test(value);
}

export async function readSmallJson(
  request: NextRequest,
  maxBytes = 8_192,
): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error("La solicitud es demasiado grande.");
  }

  const body = await request.text();
  if (body.length > maxBytes) throw new Error("La solicitud es demasiado grande.");
  if (!body) return {};
  return JSON.parse(body) as unknown;
}

function isAllowlistedReadPath(path: string): boolean {
  const patterns = [
    /^\/v4\/user\/me$/,
    /^\/v3\/teams-master$/,
    /^\/v1\/competition\/1\/leagues$/,
    /^\/v1\/competition\/1\/leagues\/[A-Za-z0-9_-]+\/teams\/[A-Za-z0-9_-]+$/,
    /^\/v1\/competition\/1\/teams\/[A-Za-z0-9_-]+\/money$/,
    /^\/v1\/competition\/1\/teams\/[A-Za-z0-9_-]+\/lineup$/,
    /^\/v1\/competition\/1\/league\/[A-Za-z0-9_-]+\/market$/,
  ];
  return patterns.some((pattern) => pattern.test(path));
}

export async function laligaGet(path: string, token: string): Promise<unknown> {
  if (!isAllowlistedReadPath(path)) {
    throw new LaligaUpstreamError("Ruta de lectura no permitida.", 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(LALIGA_API_BASE + path, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + token,
        "x-lang": "es",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new LaligaUpstreamError("La sesión de LALIGA ha caducado.", 401);
      }
      if (response.status === 429) {
        throw new LaligaUpstreamError(
          "LALIGA está limitando temporalmente las consultas.",
          429,
        );
      }
      throw new LaligaUpstreamError("No se pudo leer LALIGA Fantasy.", 502);
    }

    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_UPSTREAM_BYTES) {
      throw new LaligaUpstreamError("La respuesta de LALIGA es demasiado grande.", 502);
    }

    const text = await response.text();
    if (text.length > MAX_UPSTREAM_BYTES) {
      throw new LaligaUpstreamError("La respuesta de LALIGA es demasiado grande.", 502);
    }
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof LaligaUpstreamError) throw error;
    throw new LaligaUpstreamError(
      "No se pudo conectar con LALIGA Fantasy.",
      502,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function respondToLaligaError(error: unknown): NextResponse {
  if (error instanceof LaligaUpstreamError) {
    return noStoreJson({ error: error.message }, { status: error.status });
  }
  return noStoreJson(
    { error: "No se ha podido completar la operación con LALIGA." },
    { status: 500 },
  );
}

type UserScopedSupabase = {
  client: SupabaseClient<Database>;
  user: User;
};

export async function getUserScopedSupabase(
  request: NextRequest,
): Promise<UserScopedSupabase | null> {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken || accessToken.length > 8_192) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;

  const client = createClient<Database>(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: "Bearer " + accessToken },
    },
  });

  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return { client, user: data.user };
}

export async function getLaligaSession(
  request: NextRequest,
  userId: string,
): Promise<LaligaSession | null> {
  const value = request.cookies.get(LALIGA_SESSION_COOKIE)?.value;
  if (!value || value.length > 8_192) return null;
  return openLaligaSession(value, userId);
}
