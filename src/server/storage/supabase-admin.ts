import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase con `service_role`, **solo de servidor**.
 *
 * La tabla de este producto (`fantasy_sessions`) la escribe el servidor, no el
 * navegador: lleva RLS con deny-all para el rol anonimo y solo se toca desde
 * aqui. Antes eran cuatro; las otras tres guardaban capturas para deducir la
 * contabilidad y sobran desde que se lee el libro de operaciones de LALIGA.
 *
 * La clave `service_role` NUNCA puede llegar al cliente. Este fichero solo debe
 * importarse desde route handlers o modulos de servidor; si alguna vez acaba en
 * un bundle de navegador, `supabaseAdmin()` lanza al no encontrar la variable
 * (que no esta prefijada con NEXT_PUBLIC precisamente por eso).
 */

type AdminGlobals = { __fantasySupabaseAdmin?: SupabaseClient };
const globals = globalThis as unknown as AdminGlobals;

export function hasSupabaseAdmin(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function supabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      'Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY. Sin ellas no hay sesion persistente ni historico de operaciones.',
    );
  }

  return (globals.__fantasySupabaseAdmin ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }));
}
