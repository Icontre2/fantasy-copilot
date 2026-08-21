import { z } from 'zod';
import {
  captionsSchema,
  entradaDeAuditoriaSchema,
  capturaRealSchema,
  qaResultSchema,
  estadoSchema,
} from './schemas.ts';

/**
 * El "estado humano" de un paquete: todo lo que una persona decide, edita o
 * comprueba desde el panel.
 *
 * ── Por qué vive separado del fichero ────────────────────────────────────────
 * El contenido creativo (`paqueteCrudoSchema`) lo escriben los scripts en
 * `marketing/generated/**\/package.json`, ficheros que viven en el repositorio.
 * Una vez desplegado en Vercel, ese sistema de ficheros es de solo lectura: no
 * hay forma de que una ruta de la API reescriba ese `package.json` y que el
 * cambio sobreviva a la petición siguiente, y mucho menos al próximo
 * despliegue.
 *
 * Así que lo ESTÁTICO se lee del fichero, y lo QUE CAMBIA CON UNA DECISIÓN
 * HUMANA se guarda en Supabase, en `marketing_review_state`. `mergePaquete`
 * (en `packages.ts`) junta las dos cosas en lo único que ve el panel.
 *
 * Editar el contenido creativo (fase 4) tambien vive aqui, como "overrides":
 * el panel nunca reescribe el fichero, solo guarda que campos ha cambiado una
 * persona y con que valor.
 */

export const edicionesSchema = z.object({
  hook: z.string().optional(),
  script: z.string().optional(),
  captions: captionsSchema.optional(),
  cta: z.string().optional(),
});
export type Ediciones = z.infer<typeof edicionesSchema>;

export const estadoHumanoSchema = z.object({
  contentId: z.string(),

  /**
   * `null` mientras nadie ha tocado nada: entonces manda el `status` del
   * fichero. En cuanto hay una decision humana, ESTE es el que manda.
   */
  status: estadoSchema.nullable(),

  qa: qaResultSchema.nullable(),
  needsReReview: z.boolean(),
  edits: edicionesSchema.nullable(),

  rejectionReason: z.string().nullable(),
  approvedAt: z.string().nullable(),
  approvedBy: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  rejectedBy: z.string().nullable(),

  captures: z.array(capturaRealSchema),
  auditTrail: z.array(entradaDeAuditoriaSchema),

  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EstadoHumano = z.infer<typeof estadoHumanoSchema>;

/** El estado humano de un paquete que nunca se ha tocado. */
export function estadoHumanoVacio(contentId: string, ahora: string): EstadoHumano {
  return {
    contentId,
    status: null,
    qa: null,
    needsReReview: false,
    edits: null,
    rejectionReason: null,
    approvedAt: null,
    approvedBy: null,
    rejectedAt: null,
    rejectedBy: null,
    captures: [],
    auditTrail: [{ action: 'created', actor: 'sistema', timestamp: ahora, note: 'Paquete detectado por el panel.' }],
    createdAt: ahora,
    updatedAt: ahora,
  };
}
