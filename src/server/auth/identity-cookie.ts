import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * La cookie que dice quien eres tras entrar con Google.
 *
 * No lleva nada secreto dentro —es `google:1234…`, el identificador de tu cuenta
 * de Google— pero SI es una llave: quien la tenga entra como tu. Asi que va
 * FIRMADA. Sin firma, cualquiera podria escribir `google:<el sub de otro>` en su
 * navegador y quedarse con la cuenta ajena, que es el fallo mas facil de cometer
 * en toda esta funcionalidad.
 *
 * Firmada y no cifrada a proposito: lo que hace falta es que no se pueda
 * FALSIFICAR, no que no se pueda leer. Y una firma se puede verificar sin
 * descifrar nada, asi que el fallo (clave cambiada) es "vuelve a entrar" y no
 * una excepcion a mitad de una peticion.
 *
 * Todo puro: se le pasa el secreto. Asi el test no depende del entorno.
 */

const VERSION = 'i1';

export function firmar(identidad: string, secreto: string): string {
  const mac = createHmac('sha256', secreto).update(identidad, 'utf8').digest('base64url');
  return `${VERSION}.${Buffer.from(identidad, 'utf8').toString('base64url')}.${mac}`;
}

/**
 * La identidad de una cookie firmada, o `null` si la firma no cuadra.
 *
 * `null` cubre todo lo que puede ir mal —formato raro, firma cambiada, otra
 * clave— porque desde fuera son lo mismo: esa cookie no vale y hay que volver a
 * entrar.
 */
export function verificar(valor: string, secreto: string): string | null {
  const [version, cuerpo, mac] = valor.split('.');
  if (version !== VERSION || !cuerpo || !mac) return null;

  let identidad: string;
  try {
    identidad = Buffer.from(cuerpo, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  if (identidad === '') return null;

  const esperado = Buffer.from(createHmac('sha256', secreto).update(identidad, 'utf8').digest('base64url'), 'utf8');
  const recibido = Buffer.from(mac, 'utf8');
  if (esperado.length !== recibido.length) return null;
  return timingSafeEqual(esperado, recibido) ? identidad : null;
}
