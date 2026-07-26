# Fantasy Copilot

Asistente móvil-first para gestionar una plantilla de fantasy fútbol, priorizar decisiones de mercado y recibir recomendaciones explicadas.

## MVP disponible

- Autenticación con email y contraseña mediante Supabase.
- Onboarding guiado y creación del equipo.
- Carga manual de plantilla.
- Dashboard con recomendaciones y señales prioritarias.
- Vistas de plantilla, mercado y perfil.
- Modo demo completo cuando todavía no hay datos reales.
- Persistencia en Supabase con aislamiento por usuario.

Versión navegable: https://fantasy-copilot.icontre97.chatgpt.site

## Desarrollo local

1. Copia `.env.example` a `.env.local`.
2. Completa la URL y la clave publicable de Supabase.
3. Instala dependencias con `npm ci`.
4. Ejecuta `npm run dev`.

Comprobaciones:

```bash
npm run lint
npm run build
```

## Estado de datos

La aplicación y el esquema están preparados. El catálogo real de jugadores y clubes aún debe cargarse mediante el pipeline desacoplado de ingesta; hasta entonces el modo demo permite revisar el producto completo.

## Documentación

- [Arquitectura](docs/architecture.md)
- [Modelo de datos](docs/data-model.md)
- [Prompt maestro de Lovable](docs/lovable-master-prompt.md)

Nunca se guardan credenciales de LALIGA Fantasy ni claves privadas en el frontend.
