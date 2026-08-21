/**
 * Fase 10 — el modelo del loop de crecimiento. SOLO tipos: nada de aquí
 * calcula, agrega ni inventa una cifra. Ningún endpoint de este sprint
 * escribe ni lee `MetricasDeContenido` todavía — es la forma que tendrán las
 * respuestas del día en que exista un `AnalyticsAdapter` de verdad
 * (`adapters.ts`), conectado a la plataforma que corresponda.
 *
 * Los campos son exactamente los que pidió el encargo, ni uno más: no hay
 * ninguna métrica inventada esperando a que alguien la rellene.
 */

export type MetricasDeContenido = {
  contentId: string;
  platform: string;

  views: number;
  retention3s: number;
  avgWatchTimeSeconds: number;
  completionRate: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  profileVisits: number;
  linkClicks: number;
  installs: number;
  conversionRate: number;

  capturedAt: string;
};

/**
 * Con qué se puede cruzar cada métrica —para relacionar rendimiento con la
 * decisión creativa que lo produjo—, no un análisis ya hecho. Un análisis que
 * relacione esto con `MetricasDeContenido` es trabajo de una fase futura,
 * fuera de este sprint.
 */
export type DimensionesDeContenido = {
  contentId: string;
  hook: string;
  problemType: string;
  feature: string;
  creativeFormat: string;
  playerTopic?: string;
  videoLengthSeconds?: number;
  cta: string;
};
