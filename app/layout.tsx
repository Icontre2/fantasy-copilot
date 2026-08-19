import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

/**
 * La tipografía de la app.
 *
 * Hasta ahora `globals.css` pedía `var(--font-geist-sans)` y esa variable no se
 * definía en NINGÚN sitio del repo: la declaración quedaba inválida y la app
 * llevaba desde el principio pintándose con la letra por defecto del sistema.
 * O sea que la tipografía no es un cambio de estilo: es rellenar un hueco que
 * llevaba abierto desde el primer commit.
 *
 * Se carga con `next/font` y no con un `<link>` a Google Fonts por tres cosas
 * que se notan en un móvil:
 *   1. El fichero se sirve desde nuestro propio dominio, así que no hay una
 *      conexión más a otro servidor antes de poder pintar texto.
 *   2. Next calcula los ajustes de la letra de reserva para que ocupe casi lo
 *      mismo: el texto no da el salto al cambiar de una a otra.
 *   3. No se le cuenta a Google quién abre la app.
 *
 * `swap` para que el texto se lea desde el primer instante con la de reserva
 * en vez de quedarse invisible esperando: en una pantalla de cifras, un hueco
 * en blanco es peor que un cambio de letra.
 *
 * Sora llega hasta el peso 800, no 900. Donde el código pide `font-black` el
 * navegador lo recorta a 800, que es el peso más gordo que existe de esta
 * familia — se ve igual de rotundo y no hay nada que arreglar.
 */
const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LigaLab — Tu liga, bajo control.",
  description:
    "Tu liga, patrimonio, mercado y onces probables en una experiencia móvil clara.",
  applicationName: "LigaLab",
  other: {
    "codex-preview": "development",
    /*
     * Next solo emite `mobile-web-app-capable`, que es el estándar moderno.
     * Safari lo entiende desde hace poco; los iOS anteriores siguen mirando
     * ESTA, y sin ella la app se abre con la barra del navegador en vez de a
     * pantalla completa. Una línea, y evita que a alguien le funcione distinto
     * según lo actualizado que tenga el iPhone.
     */
    "apple-mobile-web-app-capable": "yes",
    /*
     * La pantalla está llena de cifras largas (17.132.446 €). Sin esto, iOS
     * detecta algunas como teléfonos y las convierte en enlaces azules.
     */
    "format-detection": "telephone=no",
  },
  /*
   * Lo que hace que iOS la trate como una app al añadirla a la pantalla de
   * inicio, y no como un marcador de Safari.
   *
   * `capable` quita la barra del navegador. `statusBarStyle` en
   * "black-translucent" deja que el fondo negro de la app suba por detrás de la
   * hora y la batería: con cualquier otro valor quedaría una franja de color
   * distinto arriba. Eso obliga a respetar `env(safe-area-inset-top)`, que la
   * cabecera ya respeta.
   *
   * `title` es el nombre que sale bajo el icono: corto, porque iOS lo recorta.
   */
  appleWebApp: {
    capable: true,
    title: "LigaLab",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    // iOS NO acepta SVG para el icono de inicio: tiene que ser PNG.
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#050506",
  /*
   * `viewport-fit: cover` es imprescindible aquí: sin él, `env(safe-area-inset-*)`
   * vale cero y, a pantalla completa, la cabecera se metería bajo la isla
   * dinámica y la barra inferior bajo el indicador de inicio.
   */
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  // Se deja pellizcar para hacer zoom: bloquearlo es una barrera de
  // accesibilidad y no arregla nada que no arregle un tamaño de texto decente.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={sora.variable}>
      <body>{children}</body>
    </html>
  );
}
