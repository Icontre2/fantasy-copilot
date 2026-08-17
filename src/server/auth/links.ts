import { hasSupabaseAdmin, supabaseAdmin } from '@/src/server/storage/supabase-admin';
import { decryptTokenSet, encryptTokenSet } from '@/src/server/laliga/token-crypto';
import type { TokenSet } from '@/src/server/laliga/auth';

/**
 * El enlace entre "quien eres" y "tu cuenta de LALIGA".
 *
 * Entrar con Google dice QUIEN eres, pero no da ningun permiso sobre LALIGA:
 * son dos accesos distintos y LALIGA no sabe nada de Google. Asi que la primera
 * vez hay que conectar la cuenta de LALIGA una sola vez con su email y su
 * contraseña, y a partir de ahi el enlace recuerda cual es.
 *
 * Los tokens se guardan cifrados con la misma clave y el mismo formato que las
 * sesiones normales (AES-256-GCM, ver `token-crypto.ts`): la base nunca ve un
 * token en claro ni con acceso directo a la fila.
 *
 * Requiere Supabase. Sin el no hay enlace posible y el acceso con Google no se
 * ofrece: seria un boton que te identifica y luego te pide la contraseña igual.
 */

export type Enlace = { tokens: TokenSet; email: string | null };

export function hayAlmacenDeEnlaces(): boolean {
  return hasSupabaseAdmin();
}

/** El enlace de esa identidad, o `null` si todavia no ha conectado LALIGA. */
export async function leerEnlace(identidad: string): Promise<Enlace | null> {
  const { data } = await supabaseAdmin()
    .from('fantasy_links')
    .select('encrypted_tokens, laliga_email')
    .eq('id', identidad)
    .maybeSingle<{ encrypted_tokens: string; laliga_email: string | null }>();
  if (!data) return null;

  try {
    return { tokens: decryptTokenSet(data.encrypted_tokens), email: data.laliga_email };
  } catch {
    /*
     * Clave de cifrado rotada: la fila ya no es legible. Se borra en vez de
     * dejarla, porque un enlace que no se puede descifrar solo sirve para que el
     * usuario vea "ya conectaste LALIGA" y no pueda entrar.
     */
    await borrarEnlace(identidad);
    return null;
  }
}

/** Guarda (o reemplaza) el enlace. Reemplaza para poder reconectar sin borrar antes. */
export async function guardarEnlace(identidad: string, tokens: TokenSet, email: string): Promise<void> {
  const ahora = new Date().toISOString();
  const { error } = await supabaseAdmin().from('fantasy_links').upsert(
    {
      id: identidad,
      encrypted_tokens: encryptTokenSet(tokens),
      laliga_email: email,
      updated_at: ahora,
    },
    { onConflict: 'id' },
  );
  if (error) throw new Error(`No se pudo guardar el enlace con LALIGA: ${error.message}`);
}

/** Renueva los tokens de un enlace ya existente, sin tocar el resto de la fila. */
export async function actualizarTokens(identidad: string, tokens: TokenSet): Promise<void> {
  await supabaseAdmin()
    .from('fantasy_links')
    .update({ encrypted_tokens: encryptTokenSet(tokens), updated_at: new Date().toISOString() })
    .eq('id', identidad);
}

export async function borrarEnlace(identidad: string): Promise<void> {
  await supabaseAdmin().from('fantasy_links').delete().eq('id', identidad);
}
