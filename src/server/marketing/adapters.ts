// Ruta relativa a proposito: el alias `@/` solo existe al compilar, asi que un
// import de VALOR con alias no se puede ejecutar desde una prueba de node.
import type { MetricasDeContenido } from './metrics.ts';

/**
 * Fase 9 — las cuatro interfaces del tramo siguiente, sin conectar nada
 * todavía.
 *
 * Ninguna clase de aquí hace una llamada de verdad: son el hueco donde
 * iría un proveedor real, documentado para que conectarlo el día de mañana no
 * signifique rediseñar el panel. Este sprint NO autoriza publicar en redes,
 * gastar en APIs externas, ni generar imagen o vídeo de verdad —por eso cada
 * implementación de abajo es un stub que lanza `AdapterNoConectado`, nunca un
 * intento real de red.
 *
 * Sobre todo: `PublisherAdapter` no lo llama ningún botón del panel. Aprobar
 * una pieza (`actions.ts` → `aprobar`) solo cambia un `status` en Supabase;
 * no hay ningún camino de código, ni aquí ni en `service.ts`, que lleve de
 * «aprobado» a «publicado».
 */

export class AdapterNoConectado extends Error {
  constructor(nombre: string) {
    super(`${nombre} no está conectado en este sprint — solo existe la interfaz (fase 9).`);
  }
}

// ── Imagen (marketing/IMAGE_PIPELINE.md) ────────────────────────────────────

export type PeticionDeImagen = { contentId: string; prompt: string };
export type ImagenGenerada = { url: string; provider: string };

// TODO(fase-9+): conectar un proveedor real de imagen. Ver marketing/IMAGE_PIPELINE.md.
export interface ImageGeneratorAdapter {
  generar(peticion: PeticionDeImagen): Promise<ImagenGenerada>;
}

export class ImageGeneratorAdapterPendiente implements ImageGeneratorAdapter {
  async generar(): Promise<ImagenGenerada> {
    throw new AdapterNoConectado('ImageGeneratorAdapter');
  }
}

// ── Vídeo (marketing/SEEDANCE_PIPELINE.md) ──────────────────────────────────

export type PeticionDeVideo = { contentId: string; prompt: string; negativeConstraints: string[] };
export type VideoGenerado = { url: string; provider: 'seedance' };

// TODO(fase-9+): conectar Seedance de verdad. Requiere credenciales externas
// que hoy no existen en este despliegue — no inventar ninguna.
export interface VideoGeneratorAdapter {
  generar(peticion: PeticionDeVideo): Promise<VideoGenerado>;
}

export class VideoGeneratorAdapterPendiente implements VideoGeneratorAdapter {
  async generar(): Promise<VideoGenerado> {
    throw new AdapterNoConectado('VideoGeneratorAdapter');
  }
}

// ── Publicación ──────────────────────────────────────────────────────────────

export type PeticionDePublicacion = {
  contentId: string;
  platform: 'tiktok' | 'instagram_reels' | 'youtube_shorts';
  assetUrl: string;
  caption: string;
};
export type PublicacionRealizada = { platformPostId: string; publishedAt: string; url: string };

// TODO(fase-9+): conectar TikTok/Instagram/YouTube. Explícitamente fuera de
// alcance de este sprint — "no publiques contenido en redes sociales" es una
// de las cosas que el encargo no autoriza. Ningún botón del panel llama a
// esto todavía.
export interface PublisherAdapter {
  publicar(peticion: PeticionDePublicacion): Promise<PublicacionRealizada>;
}

export class PublisherAdapterPendiente implements PublisherAdapter {
  async publicar(): Promise<PublicacionRealizada> {
    throw new AdapterNoConectado('PublisherAdapter');
  }
}

// ── Analítica (fase 10) ──────────────────────────────────────────────────────

export type ConsultaDeMetricas = { contentId: string; platform: string };

// TODO(fase-9+): conectar el panel de analítica de cada plataforma. La forma
// de la respuesta ya está fijada en `metrics.ts` (fase 10): solo falta quien
// la rellene con datos reales.
export interface AnalyticsAdapter {
  obtenerMetricas(consulta: ConsultaDeMetricas): Promise<MetricasDeContenido>;
}

export class AnalyticsAdapterPendiente implements AnalyticsAdapter {
  async obtenerMetricas(): Promise<MetricasDeContenido> {
    throw new AdapterNoConectado('AnalyticsAdapter');
  }
}
