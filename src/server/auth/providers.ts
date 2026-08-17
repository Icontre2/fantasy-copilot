/**
 * Que proveedores hay, y cual de ellos ha pedido el usuario.
 *
 * Puro: se le da lo que contesta Supabase y devuelve la lista. Vive aparte de la
 * red para poder comprobar lo unico que aqui puede salir mal de verdad — que se
 * cuele un proveedor que no es — sin montar un servidor.
 */

/** Los tres que esta app sabe enseñar. El orden es el de la pantalla. */
export const PROVEEDORES = ['google', 'apple', 'facebook'] as const;
export type Proveedor = (typeof PROVEEDORES)[number];

export const NOMBRES: Record<Proveedor, string> = {
  google: 'Google',
  apple: 'Apple',
  facebook: 'Facebook',
};

/**
 * El proveedor pedido, o `null` si no es uno de los nuestros.
 *
 * Esto NO es una formalidad. El valor acaba dentro de la URL a la que se manda
 * al usuario, asi que dejar pasar cualquier texto seria dejar que un enlace
 * preparado mande a quien lo pulse a donde le convenga a quien lo preparo. La
 * lista es blanca a proposito: lo que no esta, no pasa.
 */
export function proveedorValido(valor: string | null): Proveedor | null {
  return PROVEEDORES.includes(valor as Proveedor) ? (valor as Proveedor) : null;
}

/**
 * Los proveedores ACTIVADOS, sacados de lo que responde Supabase.
 *
 * Supabase publica en `/auth/v1/settings` que metodos tiene encendidos. Se
 * pregunta en vez de suponerlo por una variable de entorno: asi la pantalla
 * nunca enseña un boton que no puede funcionar, y activar uno nuevo en el panel
 * de Supabase basta para que aparezca — sin tocar codigo ni desplegar.
 */
export function activosDe(settings: unknown): Proveedor[] {
  if (!settings || typeof settings !== 'object') return [];
  const externos = (settings as { external?: unknown }).external;
  if (!externos || typeof externos !== 'object') return [];
  const mapa = externos as Record<string, unknown>;
  return PROVEEDORES.filter((proveedor) => mapa[proveedor] === true);
}
