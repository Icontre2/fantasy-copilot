/**
 * Los errores del login de LALIGA, dichos en castellano.
 *
 * El proveedor de identidad de LALIGA es un Azure AD B2C y contesta cosas como
 * «AADB2C90225: The username or password provided in the request are invalid.».
 * Eso llegaba a la pantalla tal cual: en ingles y con un codigo que no le dice
 * nada a nadie.
 *
 * Regla al traducir: solo se interpretan los codigos que sabemos lo que
 * significan. Uno que no este en la tabla se enseña con su texto original y un
 * encabezado que avisa de que viene de LALIGA — antes ocultarlo que adivinar
 * mal, y antes decir «no lo entiendo» que inventar una causa.
 *
 * Y lo mas importante que hay aqui: con `AADB2C90225` NO se puede distinguir una
 * contraseña equivocada de una cuenta social (Google/Apple/Facebook), porque el
 * proveedor devuelve el mismo codigo en los dos casos. Asi que el mensaje cuenta
 * las dos posibilidades en vez de elegir una y sonar seguro.
 */

/**
 * Codigos de B2C que sabemos leer.
 *
 * Corto a proposito. Cada entrada de aqui es una afirmacion sobre lo que le pasa
 * al usuario, y afirmar de mas en una pantalla de login es mandar a alguien a
 * cambiar una contraseña que estaba bien.
 */
const MENSAJES: Record<string, string> = {
  /*
   * Credenciales rechazadas. El mismo codigo sale con la contraseña mal Y con
   * una cuenta creada con Google/Apple/Facebook, que no tiene contraseña en el
   * proveedor. No se puede saber cual de las dos es, y se dicen las dos.
   */
  AADB2C90225:
    'El email o la contraseña no son correctos. ' +
    'Ojo con esto: si esa cuenta de LALIGA Fantasy se creó con Google, Apple o Facebook, ' +
    'no tiene contraseña propia y este acceso no puede funcionar — LALIGA solo permite ' +
    'entrar así a las cuentas de email y contraseña.',

  /* Demasiados intentos seguidos. Lo bloquea LALIGA, no esta app. */
  AADB2C90157:
    'LALIGA ha bloqueado temporalmente la cuenta por demasiados intentos seguidos. ' +
    'Hay que esperar un rato antes de volver a probar; no es cosa de esta app.',
};

/** El primer codigo `AADB2Cnnnnn` que aparezca en el texto, o `null`. */
export function codigoB2C(detalle: string): string | null {
  return /AADB2C\d{5}/.exec(detalle)?.[0] ?? null;
}

/**
 * El texto que se le enseña al usuario para un error del login.
 *
 * Se le pasa el `error_description` crudo de B2C. Si el codigo esta en la tabla,
 * devuelve la explicacion; si no, el texto original con un encabezado que dice
 * de donde viene, para que nadie lo confunda con un fallo de esta app.
 */
export function mensajeDeLogin(detalle: string): string {
  const codigo = codigoB2C(detalle);
  const conocido = codigo === null ? undefined : MENSAJES[codigo];
  if (conocido) return conocido;

  const limpio = detalle.trim();
  if (limpio === '') return 'El login de LALIGA ha rechazado el acceso sin decir por qué.';
  return `El login de LALIGA ha rechazado el acceso: ${limpio}`;
}
