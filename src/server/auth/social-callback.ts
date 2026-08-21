// Rutas relativas a proposito: el alias `@/` solo existe al compilar, asi que un
// import de VALOR con alias no se puede ejecutar desde una prueba de node.
import {
  actualizarTokens,
  claveDeEnlace,
  guardarEnlace,
  leerEnlace,
  type Credencial,
} from './links.ts';
import {
  buildSessionCookies,
  createSession,
  readSessionId,
  tokenSetDeSesion,
  tokensVigentes,
} from '../laliga/session.ts';

/**
 * Lo que hay que contarle al usuario al volver. Las dos mitades pueden estar
 * vacías: la primera vez que entras con Google no hay nada que enlazar todavía y
 * tampoco nada que celebrar.
 */
export type ResultadoDelEnlace = { bien?: string; problema?: string };

/**
 * Guarda o restaura el enlace, y añade a la respuesta las cookies que hagan
 * falta.
 *
 * Vive fuera de `route.ts` a propósito: es la parte con lógica de verdad, y
 * separarla de la ruta es lo único que permite probarla con `node --test` sin
 * pasar por el compilador de Next —que es quien resuelve el alias `@/` que usa
 * el resto de la ruta.
 *
 * Ningún fallo de aquí tumba el acceso: identificarse con el proveedor ha
 * funcionado y eso ya vale. Lo peor que puede pasar es que haya que conectar
 * LALIGA a mano, que es exactamente lo que pasaba siempre antes.
 */
export async function resolverEnlace(
  request: Request,
  credencial: Credencial,
  identidad: string,
  headers: Headers,
): Promise<ResultadoDelEnlace> {
  const sesionActual = await tokenSetDeSesion(readSessionId(request)).catch(() => null);

  /*
   * La clave con la que se cifra la fila. La deriva la propia base de datos a
   * partir de tu identidad, así que es estable entre despliegues sin necesidad
   * de configurar nada. Si además hay `SESSION_ENCRYPTION_KEY`, entra también.
   */
  const clave = await claveDeEnlace(credencial);
  if (!clave) {
    return {
      problema: sesionActual
        ? 'No se ha podido preparar el cifrado del enlace. Vuelve a intentarlo desde «Más».'
        : 'Te hemos identificado con Google, pero no se ha podido comprobar si tu cuenta de LALIGA está enlazada. Entra abajo con tu email y contraseña.',
    };
  }

  if (sesionActual) {
    const vigentes = await tokensVigentes(sesionActual);
    if (!vigentes) {
      return { problema: 'Tu sesión de LALIGA ha caducado. Vuelve a conectarla para dejarla enlazada.' };
    }

    try {
      // El correo lo guarda la ruta de contraseña, que es la que lo conoce. Aquí
      // solo tenemos el de Google, y meterlo en `laliga_email` sería mentir.
      await guardarEnlace(credencial, identidad, vigentes, null, clave);
    } catch {
      return { problema: 'No se ha podido dejar enlazada tu cuenta de LALIGA. Vuelve a intentarlo desde «Más».' };
    }
    return { bien: 'Cuenta enlazada. La próxima vez entra con Google y no te pedirá la contraseña de LALIGA.' };
  }

  const enlace = await leerEnlace(credencial, identidad, clave).catch(() => null);
  if (!enlace) {
    /*
     * Aquí es donde el botón se quedaba MUDO.
     *
     * Le das a «Entrar con Google», das la vuelta entera por Google, y vuelves a
     * la misma pantalla sin una palabra. Desde fuera es indistinguible de que no
     * funcione nada, y eso es exactamente lo que parecía.
     *
     * No es un error —la identificación ha ido bien— pero sí es un final del
     * camino que hay que contar, porque queda un paso y no es evidente cuál.
     */
    return {
      bien:
        'Te hemos identificado con Google. Solo falta conectar tu cuenta de LALIGA una vez: ' +
        'escribe abajo tu email y contraseña del juego y, a partir de ahí, entras con Google y ya está.',
    };
  }

  const vigentes = await tokensVigentes(enlace.tokens);
  if (!vigentes) {
    return { problema: 'Tu cuenta de LALIGA estaba enlazada, pero el permiso ha caducado. Conéctala otra vez.' };
  }

  /*
   * El fallo que dejaba el enlace inservible al segundo uso.
   *
   * `tokensVigentes` renueva el token de LALIGA cuando hace falta, y Azure B2C
   * ROTA el refresh token en cada renovación: el que devuelve no es el mismo
   * que el que se le mandó. Si aquí no se guarda el nuevo, la fila se queda con
   * uno YA GASTADO. La primera vez que entrabas con Google después de un rato
   * sin sesión, funcionaba —el token guardado aún servía—. La siguiente,
   * `tokensVigentes` intentaba renovar con ese token ya consumido, LALIGA lo
   * rechazaba, y el mensaje era «tu permiso ha caducado, reconéctala». No
   * había caducado: se había tirado sin querer.
   *
   * `access.ts` ya hacía esto bien en su propio camino de renovación
   * (`actualizarTokens` tras `refreshTokens`); aquí faltaba el mismo paso.
   * Si guardarlo falla, no se tumba el acceso: peor de los casos, la próxima
   * vez hay que reconectar, que es el fallo que ya existía y no uno nuevo.
   */
  await actualizarTokens(credencial, identidad, vigentes, clave).catch(() => undefined);

  // Aquí es donde «entrar con Google» pasa de identificarte a meterte dentro.
  for (const cookie of buildSessionCookies(await createSession(vigentes))) {
    headers.append('Set-Cookie', cookie);
  }
  return { bien: 'Has entrado con Google, sin escribir ninguna contraseña.' };
}
