/**
 * Service worker de la app instalada.
 *
 * Hace UNA cosa: cuando abres la app sin conexión, enseñar una pantalla propia
 * en vez del error de Safari. Nada más.
 *
 * ── Por qué NO cachea la app entera ──────────────────────────────────────────
 * Es lo primero que apetece hacer y es una trampa. LigaLab no tiene nada que
 * enseñar sin red: cada pantalla lee de LALIGA en vivo. Una copia guardada de
 * la interfaz solo conseguiría abrir un armazón vacío que se queda cargando
 * para siempre, que se siente peor que decir «sin conexión» y punto.
 *
 * Además, guardar el HTML de la app tiene un fallo con fecha de caducidad: ese
 * HTML apunta a los archivos de JavaScript de ESE despliegue, con su hash en el
 * nombre. Tras publicar una versión nueva, esos archivos ya no existen y la
 * copia guardada abre una pantalla rota. Por eso la reserva es un fichero
 * suelto que no depende de nada.
 *
 * ── Lo que nunca toca ────────────────────────────────────────────────────────
 * `/api/*` no pasa por aquí jamás. Son datos privados de tu liga y de tu
 * sesión: guardarlos en el disco del navegador es un problema de seguridad,
 * y servir una respuesta vieja en una pantalla que mueve dinero es peor todavía.
 *
 * El código de los avisos va en `sw-push.js`, en fichero aparte, para que un
 * cambio de caché no toque los avisos ni al revés; se carga con importScripts.
 */

/*
 * Los avisos push viven en su propio fichero, pero los atiende ESTE worker, el
 * que controla la app en `/`. En iPhone las notificaciones de una app
 * instalada llegan por el worker de la app; uno aparte con otro ámbito es la
 * vía menos probada, y era la que se usaba. El código sigue separado: si este
 * fichero se rompe, `sw-push.js` no cambia.
 */
importScripts("/sw-push.js");

const CACHE = "ligalab-offline-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // `reload` para saltarse la caché HTTP: si no, al publicar una versión
      // nueva se guardaría la página antigua que el navegador tuviera a mano.
      await cache.add(new Request(OFFLINE, { cache: "reload" }));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(nombres.filter((nombre) => nombre !== CACHE).map((nombre) => caches.delete(nombre)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const peticion = event.request;

  /*
   * Solo las navegaciones. Todo lo demás —imágenes, JavaScript, hojas de
   * estilo— sigue su camino normal sin pasar por aquí: Next les pone un hash en
   * el nombre y la caché del propio navegador ya hace ese trabajo mejor.
   */
  if (peticion.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      try {
        return await fetch(peticion);
      } catch {
        // Aquí solo se llega si la red ha fallado de verdad.
        const cache = await caches.open(CACHE);
        const reserva = await cache.match(OFFLINE);
        return reserva ?? Response.error();
      }
    })(),
  );
});
