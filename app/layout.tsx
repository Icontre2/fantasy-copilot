import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
