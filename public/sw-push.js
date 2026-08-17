/**
 * Service worker de los avisos push.
 *
 * Solo hace dos cosas: pintar la notificación que llega, y llevarte a la app al
 * tocarla. No cachea nada, no intercepta peticiones de red — eso es cosa del
 * manifiesto de instalación (`app/manifest.ts`), y mezclar las dos
 * responsabilidades en un mismo fichero es la forma más rápida de que un día
 * una rotura de caché se lleve por delante los avisos, o al revés.
 *
 * Nombre de fichero distinto (`sw-push.js`, no `sw.js`) para que si algún día
 * se añade un service worker de caché, los dos convivan sin pisarse: cada uno
 * se registra con su propio `scope`.
 */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return; // Un aviso que no se entiende no se pinta a medias.
  }

  const { titulo, cuerpo, url, tag } = payload;
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: cuerpo,
      tag,
      // `renotify` para que, si esta alerta ya había avisado antes y ahora
      // empeora, el aviso nuevo SÍ suene y no se quede mudo por compartir tag.
      renotify: true,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    (async () => {
      const clientes = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Si la app ya está abierta, se reutiliza esa pestaña en vez de abrir
      // otra: es como se espera que se comporte una app instalada, no una web.
      for (const cliente of clientes) {
        if ("focus" in cliente) {
          cliente.navigate(url);
          return cliente.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
