import assert from "node:assert/strict";
import test from "node:test";
import { fusionarPaquete, leerPaquete, listarRutasDePaquetes } from "./packages.ts";

/**
 * El canario: recorre los paquetes REALES que haya en
 * `marketing/generated/**` y comprueba que el panel puede leerlos todos.
 *
 * ── Por qué hace falta, además de los tests con ficheros inventados ─────────
 * Los demás tests prueban las convenciones que YO conozco. Este prueba lo que
 * de verdad ha acabado en el repositorio, que es otra cosa: la pieza
 * `LL-2026-001` llegó escrita en la convención antigua completa y el panel la
 * marcaba como «bloqueada» — un fallo que ningún test de fixture habría
 * pillado, porque el fixture lo escribo yo con la forma que ya sé leer.
 *
 * Si mañana alguien añade un paquete con una forma nueva, esto se pone rojo
 * en `npm test` en vez de aparecer en silencio como una tarjeta bloqueada en
 * el panel.
 *
 * Pasa trivialmente cuando no hay ningún paquete todavía: no obliga a que
 * exista contenido para que la suite esté verde.
 */
test("todos los paquetes reales del repositorio se leen sin bloquearse", async () => {
  const rutas = await listarRutasDePaquetes();

  const bloqueados: string[] = [];
  for (const { fecha, id, ruta } of rutas) {
    const resultado = await leerPaquete(fecha, id, ruta);
    if (resultado.blocked) {
      bloqueados.push(`${fecha}/${id}: ${resultado.error}`);
      continue;
    }
    // Y que además se pueda fusionar y pintar, no solo validar.
    const vista = fusionarPaquete(resultado, null);
    assert.equal(vista.blocked, false, `${fecha}/${id} se bloquea al fusionar`);
  }

  assert.deepEqual(bloqueados, [], `hay paquetes reales que el panel no puede leer:\n${bloqueados.join("\n")}`);
});

/**
 * Lo mínimo que hace falta para poder DECIDIR sobre una pieza. Un paquete que
 * se lee pero no dice de qué va no sirve de nada en la cola.
 */
test("cada paquete real llega con lo imprescindible para revisarlo", async () => {
  const rutas = await listarRutasDePaquetes();

  for (const { fecha, id, ruta } of rutas) {
    const resultado = await leerPaquete(fecha, id, ruta);
    if (resultado.blocked) continue; // ya lo cubre el test de arriba
    const vista = fusionarPaquete(resultado, null);
    if (vista.blocked) continue;

    assert.notEqual(vista.hook.trim(), "", `${id}: sin hook no hay nada que juzgar`);
    assert.notEqual(vista.feature.trim(), "", `${id}: sin feature no se sabe qué se está anunciando`);
    // Si dice que necesita captura real, tiene que decir DE QUÉ (fase 5):
    // o una frase en `captureRequest`, o algún plano marcado como captura.
    if (vista.needsCapture) {
      const planosConCaptura = vista.shots.filter((plano) => plano.kind === "real_app_capture");
      assert.ok(
        vista.captureRequest !== null || planosConCaptura.length > 0,
        `${id}: dice necesitar captura real pero no dice de qué pantalla`,
      );
    }
  }
});
