import type { MetadataRoute } from "next";

/**
 * Manifiesto de la app instalable.
 *
 * `display: "standalone"` es lo que hace que, una vez añadida a la pantalla de
 * inicio, se abra sin la barra de Safari y con su propio conmutador de apps.
 *
 * Los colores no son decoración: `background_color` es lo que se pinta mientras
 * arranca —si fuera blanco, cada apertura daría un fogonazo antes de la app
 * negra— y `theme_color` tiñe la barra de estado en Android.
 *
 * El icono `maskable` va aparte del normal porque Android lo recorta en círculo
 * y necesita margen; iOS usa la imagen entera y le pone él el redondeo.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LigaLab — Tu liga, bajo control",
    short_name: "LigaLab",
    description:
      "Tu liga de LALIGA Fantasy: plantillas, mercado, alertas de cláusula, economía y jornadas.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#050506",
    theme_color: "#050506",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
