import { NextRequest } from "next/server";
import { parseLaligaLeagues } from "../../../laliga-contract";
import {
  getLaligaSession,
  getUserScopedSupabase,
  laligaGet,
  noStoreJson,
  privateBetaUnavailable,
  respondToLaligaError,
} from "../shared";
import { takeRateLimit } from "../rate-limit";

export async function GET(request: NextRequest) {
  const unavailable = privateBetaUnavailable();
  if (unavailable) return unavailable;

  const auth = await getUserScopedSupabase(request);
  if (!auth) {
    return noStoreJson(
      { error: "Inicia sesión en Fantasy Copilot para continuar." },
      { status: 401 },
    );
  }

  const session = await getLaligaSession(request, auth.user.id);
  if (!session) {
    return noStoreJson(
      { error: "Conecta tu cuenta de LALIGA Fantasy." },
      { status: 401 },
    );
  }

  const rate = takeRateLimit("read:" + auth.user.id, 30, 60_000);
  if (!rate.allowed) {
    const response = noStoreJson(
      { error: "Espera un momento antes de volver a sincronizar." },
      { status: 429 },
    );
    response.headers.set("Retry-After", String(rate.retryAfterSeconds));
    return response;
  }

  try {
    const upstream = await laligaGet(
      "/v1/competition/1/leagues",
      session.accessToken,
    );
    return noStoreJson({ leagues: parseLaligaLeagues(upstream) });
  } catch (error) {
    return respondToLaligaError(error);
  }
}
