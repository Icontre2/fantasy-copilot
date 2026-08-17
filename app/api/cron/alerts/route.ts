import { evaluarYAvisar } from "@/src/server/alerts/notify-run";
import { ligasConSuscripcion } from "@/src/server/alerts/push-store";
import { hasPersistentStorage } from "@/src/server/laliga/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/alerts — la tarea programada que hace que las alertas avisen
 * solas, en vez de esperar a que alguien abra la app.
 *
 * La llama Vercel Cron (ver `vercel.json`), nunca el navegador de nadie. Por
 * eso pide un secreto compartido en vez de una sesión: aquí no hay ningún
 * usuario detrás de la petición.
 *
 * Recorre TODAS las combinaciones sesión+liga con alguna suscripción activa,
 * y evalúa cada una por separado. Un fallo en una no debe tumbar las demás: si
 * la sesión de un manager caducó, eso no tiene que impedir que se avise al
 * resto.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET?.trim();
  if (!secreto) {
    return Response.json({ error: "CRON_SECRET no está configurado." }, { status: 501 });
  }
  const recibido = request.headers.get("authorization");
  if (recibido !== `Bearer ${secreto}`) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!hasPersistentStorage()) {
    /*
     * Sin almacén persistente no hay sesiones que sobrevivan entre visitas, así
     * que no hay nada que este cron pueda evaluar: el usuario tendría que estar
     * mirando la app en el momento exacto en que algo cambia, que es
     * exactamente lo que esta función existe para evitar.
     */
    return Response.json({ error: "Sin base de datos persistente no hay sesiones que evaluar." }, { status: 501 });
  }

  const objetivos = await ligasConSuscripcion();
  const resultados: Array<{ leagueId: string; estado: string; avisos?: number; error?: string }> = [];

  for (const { sessionId, leagueId } of objetivos) {
    try {
      const resultado = await evaluarYAvisar(sessionId, leagueId);
      resultados.push({
        leagueId,
        estado: resultado.estado,
        avisos: resultado.estado === "EVALUADO" ? resultado.avisos : undefined,
      });
    } catch (error) {
      // Se registra y se sigue: una liga rota no puede parar el resto.
      resultados.push({ leagueId, estado: "ERROR", error: error instanceof Error ? error.message : String(error) });
    }
  }

  return Response.json({
    evaluadas: objetivos.length,
    avisosEnviados: resultados.reduce((total, r) => total + (r.avisos ?? 0), 0),
    resultados,
  });
}
