import assert from "node:assert/strict";
import test from "node:test";
import { getNativeLaligaOAuth, hasNativeLaligaOAuth } from "./native-bridge.ts";

/**
 * El puente entre la WebView y el plugin nativo.
 *
 * Lo que se comprueba aquí es la decisión que sostiene todo el diseño: la
 * detección es por CAPACIDAD (¿está registrado `LaligaOAuth`?) y no por sistema
 * operativo. Gracias a eso, el plugin de Android
 * (`mobile/android/LaligaOAuthPlugin.kt`) funcionó sin tocar una línea de web:
 * se registra con el mismo nombre que el de iPhone y ya está.
 *
 * Un test por user agent habría fijado justo lo contrario, y habría que
 * tocarlo cada vez que aparece un contenedor nuevo.
 */

const globalConWindow = globalThis as { window?: unknown };

function conWindow(valor: unknown, prueba: () => void) {
  const previo = globalConWindow.window;
  globalConWindow.window = valor;
  try {
    prueba();
  } finally {
    if (previo === undefined) delete globalConWindow.window;
    else globalConWindow.window = previo;
  }
}

test("sin `window` (servidor) no hay plugin y no revienta", () => {
  const previo = globalConWindow.window;
  delete globalConWindow.window;
  try {
    assert.equal(getNativeLaligaOAuth(), null);
    assert.equal(hasNativeLaligaOAuth(), false);
  } finally {
    if (previo !== undefined) globalConWindow.window = previo;
  }
});

test("en un navegador normal no hay plugin: el login web no se altera", () => {
  conWindow({}, () => {
    assert.equal(hasNativeLaligaOAuth(), false);
  });
});

test("dentro de Capacitor pero sin nuestro plugin, tampoco", () => {
  // Un contenedor nativo con otros plugins no habilita este acceso.
  conWindow({ Capacitor: { Plugins: { Camera: {} } } }, () => {
    assert.equal(hasNativeLaligaOAuth(), false);
  });
});

test("basta con que `LaligaOAuth` esté registrado, venga de iPhone o de Android", () => {
  const plugin = { start: async () => ({ callbackUrl: "authredirect://com.lfp.laligafantasy?code=x&state=y" }) };
  conWindow({ Capacitor: { Plugins: { LaligaOAuth: plugin } } }, () => {
    assert.equal(hasNativeLaligaOAuth(), true);
    assert.equal(getNativeLaligaOAuth(), plugin, "el puente no distingue plataforma, y ese es el objetivo");
  });
});
