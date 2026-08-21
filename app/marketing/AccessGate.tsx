"use client";

import { useEffect, useState, type ReactNode } from "react";
import { get } from "./api";
import { ErrorBox, Spinner } from "./ui";

/**
 * La puerta del panel, vista desde el navegador.
 *
 * Esto es SOLO la experiencia: decide si se enseña la cola o un aviso de
 * acceso denegado. La seguridad de verdad está en el servidor —cada ruta de
 * `/api/marketing/*` vuelve a comprobar `accesoDeMarketing()` por su cuenta,
 * y la tabla de Supabase tiene además su propia RLS— así que aunque alguien
 * se saltara este componente a mano, no vería ni un dato ajeno.
 */
type Estado =
  | { fase: "cargando" }
  | { fase: "denegado"; email: string | null; error: string | null }
  | { fase: "autorizado" };

export function AccessGate({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ fase: "cargando" });

  useEffect(() => {
    let vivo = true;
    get<{ authorized: boolean; email: string | null }>("auth")
      .then((respuesta) => {
        if (!vivo) return;
        setEstado(
          respuesta.authorized
            ? { fase: "autorizado" }
            : { fase: "denegado", email: respuesta.email, error: null },
        );
      })
      .catch((error: unknown) => {
        if (!vivo) return;
        setEstado({ fase: "denegado", email: null, error: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      vivo = false;
    };
  }, []);

  if (estado.fase === "cargando") return <Spinner label="Comprobando acceso…" />;

  if (estado.fase === "denegado") {
    return (
      <div className="mx-auto flex min-h-[80dvh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="text-lg font-bold text-white">Acceso denegado</h1>
        <p className="text-sm leading-6 text-neutral-400">
          {estado.email
            ? `${estado.email} ha entrado, pero no está en la lista de administradores de marketing.`
            : "Este panel es privado. Entra con Google o Facebook desde LigaLab y vuelve a abrir /marketing."}
        </p>
        {estado.error && <ErrorBox message={estado.error} />}
      </div>
    );
  }

  return <>{children}</>;
}
