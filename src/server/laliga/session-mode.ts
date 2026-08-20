/**
 * Cuanto dura tu sesion y por que.
 *
 * Esto existe porque el modo de sesion se decidia en silencio a partir de que
 * variables de entorno hubiera, y el sintoma de elegir mal era "la app me echa
 * cada dos por tres" sin un solo error en ningun log. Quien lo sufre no puede
 * saber si es un fallo, LALIGA, o una variable que falta.
 *
 * Puro a proposito: recibe los cuatro booleanos y devuelve el diagnostico. Asi
 * se puede comprobar cada combinacion sin montar un entorno.
 */

export type EntornoDeSesion = {
  /** Hay `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`: sitio donde guardar. */
  supabase: boolean;
  /** Hay `SESSION_ENCRYPTION_KEY`: una clave que NO cambia entre despliegues. */
  claveExplicita: boolean;
  /** Hay `VERCEL_OIDC_TOKEN`: sirve para cifrar, pero rota. */
  oidc: boolean;
  produccion: boolean;
};

export type ModoDeSesion = 'PERSISTENTE' | 'CLAVE_INESTABLE' | 'SOLO_COOKIE' | 'DESARROLLO';

export type DiagnosticoDeSesion = {
  modo: ModoDeSesion;
  /** Frase corta: «30 días», «hasta el siguiente despliegue»… */
  duracion: string;
  /** `true` cuando la sesion dura menos de lo que podria. */
  degradado: boolean;
  titulo: string;
  explicacion: string;
  /** Que hacer para arreglarlo, o `null` si no hay nada que arreglar. */
  arreglo: string | null;
  /**
   * De donde sale la clave con la que se cifra, SIEMPRE, aunque el modo se haya
   * decidido antes por otra cosa.
   *
   * Existe porque el diagnostico mentia por omision: sin Supabase salia
   * `SOLO_COOKIE` y ahi se acababa el analisis, asi que no habia forma de saber
   * desde fuera si faltaba tambien la clave de cifrado. Y esa clave es justo la
   * que decide si el enlace con Google puede recordarse.
   */
  clave: OrigenDeClave;
};

/**
 * `explicita` = `SESSION_ENCRYPTION_KEY`, fija entre despliegues.
 * `vercel` = derivada de `VERCEL_OIDC_TOKEN`, que rota.
 * `ninguna` = no hay; en produccion no se puede guardar nada cifrado.
 */
export type OrigenDeClave = 'explicita' | 'vercel' | 'ninguna';

function origenDeClave(entorno: EntornoDeSesion): OrigenDeClave {
  if (entorno.claveExplicita) return 'explicita';
  return entorno.oidc ? 'vercel' : 'ninguna';
}

/**
 * El diagnostico del entorno dado.
 *
 * El caso interesante es `CLAVE_INESTABLE`, que parecia estar bien: con
 * `VERCEL_OIDC_TOKEN` y sin `SESSION_ENCRYPTION_KEY` la app SI cifra y SI guarda
 * en Supabase, asi que por dentro todo son caminos "buenos". Pero ese token rota,
 * y la clave AES se deriva de el: cuando cambia, las sesiones guardadas dejan de
 * poder descifrarse y hay que volver a entrar. Ningun error, ningun log, solo un
 * login que reaparece.
 */
export function diagnosticarSesion(entorno: EntornoDeSesion): DiagnosticoDeSesion {
  return { ...modoDeSesion(entorno), clave: origenDeClave(entorno) };
}

function modoDeSesion(entorno: EntornoDeSesion): Omit<DiagnosticoDeSesion, 'clave'> {
  const { supabase, claveExplicita, oidc, produccion } = entorno;

  if (!produccion && !claveExplicita) {
    return {
      modo: 'DESARROLLO',
      duracion: 'lo que dure el servidor local',
      degradado: false,
      titulo: 'Sesión de desarrollo',
      explicacion:
        'En local la clave de cifrado se genera al arrancar y muere con el proceso. ' +
        'Al reiniciar el servidor hay que volver a entrar, y así debe ser.',
      arreglo: null,
    };
  }

  if (!supabase) {
    return {
      modo: 'SOLO_COOKIE',
      duracion: 'hasta 24 h',
      degradado: true,
      titulo: 'Sesión guardada solo en el navegador',
      explicacion:
        'Sin base de datos no hay dónde guardar la sesión renovada, así que dura lo que dure ' +
        'el permiso de LALIGA: unas 24 horas. Después toca volver a entrar.',
      arreglo:
        'Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para que la sesión se renueve sola y dure 30 días.',
    };
  }

  if (!claveExplicita) {
    // Con OIDC cifra igual, pero con una clave que rota; sin OIDC ni clave, en
    // produccion la app ya falla al cifrar. Los dos casos acaban en lo mismo
    // desde fuera: te echa sin avisar.
    return {
      modo: 'CLAVE_INESTABLE',
      duracion: oidc ? 'hasta el siguiente despliegue' : 'no se puede guardar',
      degradado: true,
      titulo: 'La clave de cifrado no es estable',
      explicacion: oidc
        ? 'La sesión se cifra con un token que Vercel renueva por su cuenta. Cuando ese token ' +
          'cambia —en cada despliegue, y también solo—, las sesiones ya guardadas dejan de poder ' +
          'descifrarse y te pide entrar otra vez. No es un fallo de LALIGA ni de tu contraseña.'
        : 'No hay ninguna clave con la que cifrar la sesión, así que no se puede guardar.',
      arreglo:
        'Genera una clave con «openssl rand -base64 48» y guárdala en Vercel como SESSION_ENCRYPTION_KEY. ' +
        'Al ser fija, las sesiones sobreviven a los despliegues.',
    };
  }

  return {
    modo: 'PERSISTENTE',
    duracion: '30 días',
    degradado: false,
    titulo: 'Sesión persistente',
    explicacion:
      'La sesión se guarda cifrada en la base de datos y se renueva sola, así que dura 30 días ' +
      'sin tener que volver a escribir la contraseña.',
    arreglo: null,
  };
}
