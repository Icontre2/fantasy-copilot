import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidad · LigaLab",
  description: "Qué datos maneja LigaLab, dónde acaban y cómo borrarlos.",
};

/**
 * Política de privacidad.
 *
 * Escrita contra el código, no contra una plantilla: cada cosa que dice se
 * corresponde con algo que la app hace de verdad. Si mañana se guarda un dato
 * más, esta página se actualiza en el mismo commit — si no, deja de ser cierta y
 * es peor que no tenerla.
 *
 * No lleva scripts ni tipografía externa: se puede leer sin ejecutar nada.
 */

const ACTUALIZADA = "20 de agosto de 2026";

export default function Privacidad() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 text-neutral-300">
      <Link href="/" className="text-sm font-semibold text-[#a78bfa]">
        ← Volver a LigaLab
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-white">Privacidad</h1>
      <p className="mt-2 text-sm text-neutral-500">Actualizada el {ACTUALIZADA}.</p>

      <Parrafo>
        LigaLab es una herramienta independiente para gestionar tu liga de LALIGA Fantasy.{" "}
        <strong className="text-white">No está afiliada, asociada ni respaldada por LALIGA</strong> ni por Liga
        Nacional de Fútbol Profesional.
      </Parrafo>

      <Seccion titulo="El resumen">
        <Lista>
          <li>
            <strong className="text-white">No hay base de datos con tus jugadores.</strong> Cada vez que abres la
            app, tus datos se piden a LALIGA en ese momento con tu propio permiso y se muestran. No se copian
            aquí.
          </li>
          <li>
            <strong className="text-white">Tu contraseña de LALIGA no se guarda nunca.</strong> Se usa una vez para
            pedirle un permiso a LALIGA y se descarta.
          </li>
          <li>
            <strong className="text-white">No hay publicidad, ni rastreadores, ni analítica de terceros.</strong>{" "}
            Ninguna cookie de seguimiento.
          </li>
          <li>
            <strong className="text-white">Tus datos no se venden ni se ceden a nadie.</strong>
          </li>
        </Lista>
      </Seccion>

      <Seccion titulo="Qué se guarda, exactamente">
        <Tabla
          filas={[
            [
              "El permiso de LALIGA",
              "En una cookie de tu propio navegador, marcada de forma que JavaScript no puede leerla y que solo viaja por conexión cifrada. Es lo que evita pedirte la contraseña en cada pantalla.",
              "Mientras dure la sesión",
            ],
            [
              "Tu correo, si entras con Google/Apple/Facebook",
              "En Supabase, el servicio que gestiona ese acceso. Sirve para reconocerte, nada más.",
              "Hasta que borres la cuenta",
            ],
            [
              "El enlace con tu cuenta de LALIGA",
              "Si eliges enlazarla, se guarda el permiso de LALIGA cifrado y asociado a tu identidad, para no volver a pedirte la contraseña. Solo tú puedes alcanzar esa fila.",
              "Hasta que lo deshagas",
            ],
            [
              "Avisos push, si los activas",
              "La dirección que tu navegador da para poder avisarte. No incluye quién eres.",
              "Hasta que los desactives",
            ],
          ]}
        />
        <Parrafo>
          Lo que se guarda <strong className="text-white">en la base de datos</strong> —el enlace con tu cuenta de
          LALIGA, si lo activas— va cifrado con AES-256-GCM y con{" "}
          <strong className="text-white">una clave distinta para cada persona</strong>: ni con acceso directo a la
          fila se lee un permiso, y reventar una no ayuda con las demás. Si la app no consigue esa clave, no
          guarda nada, en vez de guardarlo en claro.
        </Parrafo>
      </Seccion>

      <Seccion titulo="Qué NO se guarda">
        <Lista>
          <li>Tu contraseña de LALIGA.</li>
          <li>Tu plantilla, tu caja, tu mercado ni tus movimientos.</li>
          <li>Las plantillas ni la caja de tus rivales.</li>
          <li>Tu dirección de correo cuando entras con contraseña en vez de con Google.</li>
        </Lista>
        <Parrafo>
          De los intentos de acceso se anota únicamente si salieron bien o mal y el código de error del proveedor,
          para poder detectar que algo está roto. <strong className="text-white">Sin correo, sin IP, sin token.</strong>
        </Parrafo>
      </Seccion>

      <Seccion titulo="Lo que ve otra persona de tu liga">
        <Parrafo>
          LigaLab enseña de tus rivales lo mismo que LALIGA ya le enseña a todo el mundo en la liga: sus plantillas,
          sus puntos y sus operaciones. La caja de cada rival{" "}
          <strong className="text-white">no se consulta: se reconstruye</strong> sumando su historial público de
          compras y ventas, y por eso aparece marcada con <code className="text-[#a78bfa]">≈</code> cuando es una
          estimación.
        </Parrafo>
        <Parrafo>
          Tu cifra exacta de caja la ve solo tu sesión, porque sale de tu propio permiso de LALIGA. Un rival que
          abra LigaLab hará contigo el mismo cálculo aproximado que tú haces con él —ni más ni menos que si lo
          hiciera a mano mirando la app oficial.
        </Parrafo>
      </Seccion>

      <Seccion titulo="Quién más interviene">
        <Tabla
          filas={[
            ["LALIGA Fantasy", "De donde salen todos los datos deportivos y económicos, con tu permiso."],
            ["Vercel", "Donde se ejecuta la app. Guarda registros técnicos de acceso, con IP, por seguridad."],
            ["Supabase", "Gestiona el acceso con Google, Apple o Facebook y guarda el enlace cifrado."],
          ]}
        />
      </Seccion>

      <Seccion titulo="Tus derechos">
        <Parrafo>
          Puedes acceder a tus datos, rectificarlos, borrarlos, oponerte al tratamiento y pedir que se te entreguen
          (RGPD, artículos 15 a 22). En la práctica:
        </Parrafo>
        <Lista>
          <li>
            <strong className="text-white">Cerrar sesión</strong> borra el permiso de LALIGA de tu navegador.
          </li>
          <li>
            <strong className="text-white">Para borrarlo todo</strong>, incluido el enlace social, escribe al
            correo de abajo y se hace.
          </li>
        </Lista>
        <Parrafo>
          También puedes reclamar ante la Agencia Española de Protección de Datos (
          <Enlace href="https://www.aepd.es">aepd.es</Enlace>).
        </Parrafo>
      </Seccion>

      <Seccion titulo="Contacto">
        <Parrafo>
          <Enlace href="mailto:icontre97@gmail.com">icontre97@gmail.com</Enlace>. Se responde a las peticiones de
          borrado en cuanto se leen.
        </Parrafo>
      </Seccion>

      <p className="mt-10 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-[12px] leading-5 text-neutral-500">
        LigaLab es un proyecto personal en pruebas, sin ánimo de lucro y sin usuarios de pago. Este texto describe
        con exactitud lo que hace la aplicación hoy. Antes de cualquier lanzamiento comercial debe revisarlo un
        abogado y publicarse también la identidad del responsable del tratamiento.
      </p>
    </main>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="text-lg font-bold tracking-tight text-white">{titulo}</h2>
      {children}
    </section>
  );
}

function Parrafo({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[15px] leading-6">{children}</p>;
}

function Lista({ children }: { children: React.ReactNode }) {
  return <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-6">{children}</ul>;
}

function Enlace({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="font-semibold text-[#a78bfa] underline underline-offset-2">
      {children}
    </a>
  );
}

/**
 * Cada entrada como un bloque, no como fila de tabla.
 *
 * Esto se lee en un móvil de 390 px. Una tabla de tres columnas ahí obliga a
 * arrastrar de lado, y la tercera columna —justo la del plazo de conservación—
 * se queda fuera de pantalla sin que se note que existe. Apilado cabe entero.
 */
function Tabla({ filas }: { filas: Array<[string, string] | [string, string, string]> }) {
  return (
    <div className="mt-4 space-y-px overflow-hidden rounded-2xl border border-white/10">
      {filas.map(([que, donde, plazo]) => (
        <div key={que} className="bg-white/[.03] p-4">
          <p className="text-[14px] font-semibold leading-5 text-white">{que}</p>
          <p className="mt-1 text-[13px] leading-5 text-neutral-400">{donde}</p>
          {plazo && (
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[.1em] text-neutral-500">{plazo}</p>
          )}
        </div>
      ))}
    </div>
  );
}
