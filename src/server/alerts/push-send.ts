import webPush from 'web-push';
import type { NotificacionPush } from './notify-message.ts';
import type { Suscripcion } from './push-store.ts';

/**
 * Mandar una notificación push de verdad, con VAPID.
 *
 * VAPID es como el navegador sabe que el aviso viene de NOSOTROS y no de
 * cualquiera que se haya hecho con el endpoint de la suscripción: se firma con
 * una clave privada que solo tiene el servidor, y el navegador la comprueba
 * contra la clave pública que le dimos al suscribirse.
 *
 * Las claves NO se generan aquí en caliente: tienen que ser SIEMPRE las mismas,
 * porque cada suscripción del usuario queda atada a la pública del momento en
 * que se suscribió. Cambiarlas invalidaría todas las suscripciones existentes.
 * Por eso se generan una vez (`npx web-push generate-vapid-keys`) y se guardan
 * en variables de entorno.
 */

export type ConfigVapid = { publicKey: string; privateKey: string; subject: string };

export function configVapid(): ConfigVapid | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return null;
  // `subject` es un contacto para que el proveedor push pueda avisarnos si algo
  // va mal a gran escala. `mailto:` es el formato que exige la especificación.
  const subject = process.env.VAPID_CONTACT_EMAIL?.trim();
  return { publicKey, privateKey, subject: subject ? `mailto:${subject}` : 'mailto:soporte@ligalab.app' };
}

export type ResultadoEnvio = { ok: true } | { ok: false; suscripcionMuerta: boolean; motivo: string };

/**
 * Manda una notificación a una suscripción concreta.
 *
 * `suscripcionMuerta: true` significa que el navegador ya no existe ahí —se
 * desinstaló la app, se borraron los datos— y el proveedor push lo dice con un
 * 404 o un 410. En ese caso hay que BORRAR la suscripción, porque seguir
 * intentando mandarle avisos para siempre es tirar peticiones a la nada.
 */
export async function mandarPush(
  config: ConfigVapid,
  sub: Suscripcion,
  mensaje: NotificacionPush,
): Promise<ResultadoEnvio> {
  webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  try {
    await webPush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(mensaje),
    );
    return { ok: true };
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    const muerta = status === 404 || status === 410;
    return { ok: false, suscripcionMuerta: muerta, motivo: error instanceof Error ? error.message : String(error) };
  }
}
