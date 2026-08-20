/*
 * Ruta relativa y no el alias `@/src`: el alias solo lo resuelve el compilador,
 * así que sirve para `import type` —que se borra— pero no para traerse una
 * función de verdad cuando los tests corren con `node --experimental-strip-types`.
 */
import { codigoB2C } from '../laliga/auth-errors.ts';

/**
 * Cuánta gente entra, cuánta rebota y por qué.
 *
 * ── Por qué esto y no una herramienta de analítica ──────────────────────────
 * La pregunta más cara que tiene abierta la app es «¿cuánta gente se queda
 * fuera en el login, y por cuál de los motivos?». En concreto: cuántos tienen
 * una cuenta de LALIGA creada con Google, Apple o Facebook —que no tiene
 * contraseña— y por tanto NO PUEDEN entrar por esta vía por mucho que lo
 * intenten. Hoy ese número es una incógnita total.
 *
 * Se resuelve con una línea de log por intento, y no con un SDK de terceros, a
 * propósito:
 *
 *   1. **No se manda nada a nadie.** Meter un rastreador en una app con
 *      usuarios reales y sin política de privacidad publicada sería el problema
 *      que este registro pretende evitar.
 *   2. **No hay cookies ni identificadores.** Nada que consentir bajo el RGPD:
 *      no se puede reconstruir quién hizo qué.
 *   3. Vercel ya recoge la salida estándar. No hay infraestructura que montar.
 *
 * ── Qué NO se registra, y es lo importante ──────────────────────────────────
 * Ni el email, ni el dominio del email, ni la contraseña, ni el token, ni la IP,
 * ni el identificador de sesión. Solo el CÓDIGO del error de Azure B2C, que es
 * una constante de su catálogo (`AADB2C90225`), no un dato de nadie.
 *
 * Con eso basta para contar, que es lo único que hace falta: los números salen
 * de agregar líneas iguales, no de seguir a una persona.
 */

/** Por dónde ha intentado entrar. */
export type ViaDeAcceso = 'password' | 'token' | 'social';

/** En qué punto se ha quedado. */
export type ResultadoDeAcceso = 'ok' | 'credenciales' | 'bloqueado' | 'error';

const PREFIJO = '[auth/metrics]';

/** Un intento de entrar empieza. */
export function registrarIntento(via: ViaDeAcceso): void {
  console.info(`${PREFIJO} intento`, { via });
}

/** Ha entrado. */
export function registrarAcceso(via: ViaDeAcceso): void {
  console.info(`${PREFIJO} acceso`, { via, resultado: 'ok' satisfies ResultadoDeAcceso });
}

/**
 * No ha entrado, y por qué.
 *
 * `codigo` es el de B2C cuando se puede sacar. `AADB2C90225` es el que importa:
 * significa «usuario o contraseña incorrectos» Y TAMBIÉN «esta cuenta se creó
 * con Google/Apple/Facebook y no tiene contraseña». B2C no los distingue, así
 * que tampoco puede hacerlo este registro — pero su volumen ya dice si merece la
 * pena invertir en resolver ese camino.
 */
export function registrarFallo(via: ViaDeAcceso, detalle: unknown): void {
  /*
   * Primero el codigo que el error trae guardado, y solo si no lo hay se busca
   * en el texto.
   *
   * El orden importa y costo descubrirlo: `LaligaError` traduce el mensaje a
   * lenguaje humano AL LANZARLO, asi que rebuscar el codigo en `message` no
   * encontraba nada y todo fallo de credenciales se registraba como «error»
   * generico. Justo el caso que este modulo existe para contar.
   */
  const guardado = (detalle as { codigoProveedor?: unknown } | null)?.codigoProveedor;
  const texto = detalle instanceof Error ? detalle.message : String(detalle ?? '');
  const codigo = (typeof guardado === 'string' ? guardado : null) ?? codigoB2C(texto);
  const resultado: ResultadoDeAcceso =
    codigo === 'AADB2C90225' ? 'credenciales' : codigo === 'AADB2C90157' ? 'bloqueado' : 'error';

  console.info(`${PREFIJO} fallo`, {
    via,
    resultado,
    // Solo el código del catálogo de B2C. Nunca el texto crudo: puede llevar
    // dentro el correo que se tecleó.
    codigo: codigo ?? null,
    // La pista que hace falta para decidir si arreglar el acceso social es
    // rentable. Se deja explícita para poder contarla de un vistazo.
    puedeSerCuentaSocial: codigo === 'AADB2C90225',
  });
}
