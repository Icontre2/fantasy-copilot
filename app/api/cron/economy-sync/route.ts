import { isAuthorizedCronRequest, runScheduledSyncs } from "@/src/server/laliga/economy/schedule";

export const dynamic = "force-dynamic";
/** Varias ligas x varios managers cada una: el limite por defecto se queda corto. */
export const maxDuration = 300;

/**
 * GET /api/cron/economy-sync
 *
 * Punto de entrada de la tarea programada (`vercel.json`). Sincroniza las ligas
 * con auto-sync activado.
 *
 * Autorizacion por `CRON_SECRET`, obligatorio: sin la variable configurada la
 * ruta responde 401 a todo el mundo. Vercel Cron manda ese secreto como
 * `Authorization: Bearer`.
 *
 * Devuelve 200 aunque alguna liga falle: el fallo de una no es un fallo de la
 * ejecucion, queda registrado en su propia fila y se reintenta en el siguiente
 * ciclo. Un 500 aqui haria que el planificador reintentara todas.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return new Response(JSON.stringify({ error: "No autorizado." }), {
      status: 401,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  try {
    const result = await runScheduledSyncs();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[fantasy] fallo la tarea de sincronizacion:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Fallo la sincronizacion." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      },
    );
  }
}
