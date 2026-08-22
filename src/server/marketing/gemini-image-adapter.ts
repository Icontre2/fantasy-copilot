import type { ImageGeneratorAdapter, ImagenGenerada, PeticionDeImagen } from './adapters.ts';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const MODELO_POR_DEFECTO = 'gemini-3.1-flash-lite-image';

const GUARDRAILS = `
REGLAS LIGALAB OBLIGATORIAS:
- Genera únicamente arte de marketing. NO generes ni recrees una interfaz de LigaLab.
- Nada de barras de estado, tabs, botones, dashboards, gráficas de producto ni cifras de producto legibles.
- Si el concepto necesita una pantalla de LigaLab, esa zona debe quedar reservada para insertar DESPUÉS una captura real.
- Sin escudos de clubes, logo de LALIGA ni fotografías de prensa de jugadores.
- Fondo oscuro casi negro y acento "Rojo LigaLab" por nombre. No inventes un HEX mientras identidad no lo haya fijado.
- El morado pertenece exclusivamente a capturas reales del producto y nunca al arte generado.
`.trim();

type FetchLike = typeof fetch;

type GeminiInteractionResponse = {
  output_image?: {
    data?: string;
    mime_type?: string;
  };
};

/**
 * Adapter real para Nano Banana mediante Gemini Interactions API.
 *
 * Importante: esta clase NO está conectada a ningún workflow ni botón. Que el
 * adapter exista no autoriza una generación. Solo hará red si otro código lo
 * instancia y llama explícitamente a `generar`, y además existe GEMINI_API_KEY.
 */
export class GeminiImageGeneratorAdapter implements ImageGeneratorAdapter {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: { apiKey?: string; model?: string; fetchImpl?: FetchLike } = {}) {
    this.apiKey = options.apiKey ?? process.env.GEMINI_API_KEY ?? '';
    this.model = options.model ?? process.env.MARKETING_IMAGE_MODEL ?? MODELO_POR_DEFECTO;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generar(peticion: PeticionDeImagen): Promise<ImagenGenerada> {
    if (!this.apiKey) {
      throw new Error('Falta GEMINI_API_KEY: no se genera ninguna imagen.');
    }
    if (!peticion.contentId.trim() || !peticion.prompt.trim()) {
      throw new Error('ImageGeneratorAdapter requiere contentId y prompt no vacíos.');
    }

    const promptSeguro = `${peticion.prompt.trim()}\n\n${GUARDRAILS}`;
    const response = await this.fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify({
        model: this.model,
        input: promptSeguro,
        response_format: {
          type: 'image',
          aspect_ratio: '4:5',
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const detalle = await response.text().catch(() => '');
      throw new Error(`Gemini Image respondió ${response.status}${detalle ? `: ${detalle.slice(0, 300)}` : ''}.`);
    }

    const payload = (await response.json()) as GeminiInteractionResponse;
    const data = payload.output_image?.data;
    const mimeType = payload.output_image?.mime_type || 'image/png';
    if (!data) {
      throw new Error('Gemini Image respondió sin output_image.data.');
    }

    return {
      url: `data:${mimeType};base64,${data}`,
      provider: `gemini:${this.model}`,
    };
  }
}

export const GEMINI_IMAGE_DEFAULT_MODEL = MODELO_POR_DEFECTO;
