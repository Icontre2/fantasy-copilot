/**
 * Saca la dirección de vuelta del login oficial de LALIGA de lo que pegue el
 * usuario.
 *
 * LALIGA ya no deja entrar con email y contraseña desde apps externas: su login
 * web solo devuelve a su propia app, a `authredirect://com.lfp.laligafantasy?code=…`.
 * En un ordenador esa dirección no abre nada, pero se puede copiar:
 *   - Chrome/Edge la escriben en la consola: «Failed to launch
 *     'authredirect://…' because the scheme does not have a registered handler.»
 *   - Firefox la deja en la barra de direcciones.
 * Así que se acepta tanto la dirección sola como la frase entera de la consola.
 */
const PATRON = /authredirect:\/\/com\.lfp\.laligafantasy[^\s'"<>`]*/i;

export function extraerCallback(texto: string): string | null {
  const encontrado = PATRON.exec(texto.trim());
  if (!encontrado) return null;
  // La consola de Chrome a veces corta con «…» o deja un punto final pegado.
  return encontrado[0].replace(/[.…,;)]+$/, '');
}
