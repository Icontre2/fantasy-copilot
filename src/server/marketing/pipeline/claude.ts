// Ruta relativa a proposito: el alias `@/` solo existe al compilar, asi que un
// import de VALOR con alias no se puede ejecutar desde una prueba de node.
import Anthropic from '@anthropic-ai/sdk';

/** El único sitio del repo que habla con la API de Claude para marketing. */
export type UsoDeTokens = { inputTokens: number; outputTokens: number };
export type RespuestaDeClaude = { texto: string; usage: UsoDeTokens };
export type LlamadaClaude = (peticion: { model: string; system: string; prompt: string; maxTokens?: number }) => Promise<RespuestaDeClaude>;

let cliente: Anthropic | null = null;

function clienteAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Falta ANTHROPIC_API_KEY: la pipeline de marketing se detiene sin una credencial válida.');
  }
  if (/\r|\n/.test(apiKey)) {
    throw new Error('ANTHROPIC_API_KEY contiene saltos de línea y no puede usarse como cabecera HTTP.');
  }
  cliente ??= new Anthropic({ apiKey });
  return cliente;
}

function comprobarRechazo(respuesta: Anthropic.Message): void {
  if (respuesta.stop_reason === 'refusal') {
    const categoria = respuesta.stop_details?.type === 'refusal' ? respuesta.stop_details.category : null;
    throw new Error(`Claude rechazó la petición${categoria ? ` (${categoria})` : ''}.`);
  }
}

function uso(respuesta: Anthropic.Message): UsoDeTokens {
  return { inputTokens: respuesta.usage.input_tokens, outputTokens: respuesta.usage.output_tokens };
}

export const llamarClaude: LlamadaClaude = async ({ model, system, prompt, maxTokens = 4096 }) => {
  const respuesta = await clienteAnthropic().messages.create({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: prompt }] });
  comprobarRechazo(respuesta);
  const bloqueDeTexto = respuesta.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  if (!bloqueDeTexto) throw new Error('La respuesta de Claude no contiene texto.');
  return { texto: bloqueDeTexto.text, usage: uso(respuesta) };
};

/** Búsqueda web solo para Fantasy Radar. El Radar selecciona un modelo compatible con herramientas. */
export function crearLlamadaConBusqueda(maxBusquedas = 6): LlamadaClaude {
  return async ({ model, system, prompt, maxTokens = 8000 }) => {
    const respuesta = await clienteAnthropic().messages.create({
      model,
      max_tokens: maxTokens,
      system,
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: maxBusquedas }],
      messages: [{ role: 'user', content: prompt }],
    });
    comprobarRechazo(respuesta);
    const textos = respuesta.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text);
    if (textos.length === 0) throw new Error('La respuesta de Claude no contiene texto (solo resultados de búsqueda).');
    return { texto: textos.join('\n'), usage: uso(respuesta) };
  };
}
