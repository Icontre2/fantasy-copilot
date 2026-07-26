# Fantasy Copilot

Asistente móvil-first para gestionar una plantilla de fantasy fútbol, priorizar decisiones de mercado y recibir recomendaciones explicadas.

## MVP disponible

- Autenticación con email y contraseña mediante Supabase.
- Onboarding guiado y creación del equipo.
- Dashboard, plantilla, mercado y perfil.
- Modo demo completo para revisar el producto sin datos reales.
- Modo conectado con persistencia Supabase y aislamiento por usuario.
- Carga manual y futura importación CSV como vías de respaldo.

Versión navegable: https://fantasy-copilot.icontre97.chatgpt.site

## Prioridad actual: conexión con LALIGA Fantasy

El siguiente bloque debe permitir que el usuario conecte su cuenta y lea, en modo solo lectura:

- ligas y clasificación;
- plantilla y alineación;
- saldo;
- mercado, precios y actividad.

La integración se hará mediante un adaptador exclusivamente del lado servidor. La contraseña de LALIGA no se guardará en la base de datos, no se expondrán tokens en el navegador y no se ejecutarán compras, ventas ni pujas. Como la API no es pública, el conector debe estar desacoplado, protegido por feature flag y preparado para fallar sin romper la carga manual/CSV.

Consulta [Integración LALIGA Fantasy en modo lectura](docs/laliga-readonly-integration.md).

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

Supabase tiene el esquema preparado, pero todavía no hay usuarios ni catálogo real cargado. La conexión con LALIGA Fantasy será la fuente prioritaria para los datos específicos de cada usuario. El catálogo y las métricas externas seguirán detrás de una capa de ingesta desacoplada.

## Documentación

- [Arquitectura](docs/architecture.md)
- [Modelo de datos](docs/data-model.md)
- [Integración LALIGA Fantasy en modo lectura](docs/laliga-readonly-integration.md)
- [Prompt maestro de Lovable](docs/lovable-master-prompt.md)

Nunca se incluyen claves privadas ni credenciales de terceros en el frontend o el repositorio.
