/**
 * Las cuentas del gesto de cerrar una hoja deslizando hacia abajo.
 *
 * Puro y aparte del componente porque es donde estan las decisiones que se
 * pueden equivocar, y son las que hacen que un gesto se sienta bien o mal. Lo
 * demas —escuchar el dedo, mover el elemento— es fontaneria.
 *
 * ── Lo que hacen las apps que se sienten bien ────────────────────────────────
 * Ninguna cierra solo por distancia. Un empujon corto y rapido tiene que cerrar
 * igual que un arrastre largo y lento, porque las dos cosas significan lo mismo:
 * "fuera". Solo con distancia, un golpe rapido rebota y parece que la app no te
 * ha hecho caso. Solo con velocidad, arrastrar despacio hasta abajo no cierra y
 * parece que se ha quedado pillada. Asi que se miran las dos.
 *
 * Y hacia arriba no se estira: se resiste. Que el dedo suba y la hoja apenas se
 * mueva es lo que dice, sin palabras, "por aqui no hay nada mas".
 */

/** Fraccion de la altura que hay que recorrer para que cierre por distancia. */
export const UMBRAL_DISTANCIA = 0.25;

/** Velocidad (px por ms) a partir de la cual cierra aunque se haya movido poco. */
export const UMBRAL_VELOCIDAD = 0.5;

/** Pixeles que hay que mover antes de decidir que esto es un arrastre. */
export const MINIMO_PARA_ARRASTRAR = 6;

export type Gesto = {
  /** Cuanto ha bajado la hoja, en pixeles. Negativo si se tira hacia arriba. */
  desplazamiento: number;
  /** Alto de la hoja, para poder razonar en fracciones y no en pixeles sueltos. */
  altura: number;
  /** Pixeles por milisegundo del final del gesto. Positiva hacia abajo. */
  velocidad: number;
};

/**
 * Si al soltar hay que cerrar.
 *
 * Cierra si se ha arrastrado lo bastante O si se ha soltado con brio. Nunca si
 * el movimiento neto es hacia arriba, por muy rapido que se haya hecho: eso es
 * lo contrario de lo que se pide.
 */
export function debeCerrarse({ desplazamiento, altura, velocidad }: Gesto): boolean {
  if (desplazamiento <= 0) return false;
  if (velocidad >= UMBRAL_VELOCIDAD) return true;
  return altura > 0 && desplazamiento >= altura * UMBRAL_DISTANCIA;
}

/**
 * Cuanto se mueve la hoja para un dedo que ha recorrido `delta`.
 *
 * Hacia abajo va uno a uno: la hoja tiene que ir pegada al dedo o se siente
 * rota. Hacia arriba se amortigua con una raiz, que es la forma barata de que
 * ceda un poco al principio y casi nada despues.
 */
export function desplazamientoDe(delta: number): number {
  if (delta >= 0) return delta;
  return -Math.pow(-delta, 0.7);
}

/**
 * Opacidad del fondo oscuro segun lo bajada que este la hoja.
 *
 * Se aclara segun baja, para que el gesto se vea a medias: aun no has soltado y
 * ya estas viendo lo que hay detras. Nunca baja de 0,25 — si llegara a cero, en
 * mitad del gesto no habria nada separando la hoja del fondo.
 */
export function opacidadDeFondo(desplazamiento: number, altura: number): number {
  if (altura <= 0 || desplazamiento <= 0) return 1;
  const recorrido = Math.min(desplazamiento / altura, 1);
  return Math.max(0.25, 1 - recorrido);
}

/** Velocidad del tramo final, en px/ms. `0` si no ha pasado tiempo medible. */
export function velocidadDe(distancia: number, milisegundos: number): number {
  return milisegundos > 0 ? distancia / milisegundos : 0;
}
