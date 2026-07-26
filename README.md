# Fantasy Copilot

Asistente móvil-first para gestionar una plantilla de fantasy fútbol, priorizar decisiones de mercado y recibir recomendaciones explicadas.

## MVP disponible

- Autenticación con email y contraseña mediante Supabase.
- Onboarding guiado y creación del equipo.
- Dashboard, plantilla, mercado y perfil.
- Modo demo completo para revisar el producto sin datos reales.
- Modo conectado con persistencia Supabase y aislamiento por usuario.
- Alta manual de jugadores aunque el catálogo canónico aún esté vacío.
- Importación CSV con cabeceras en español o inglés, vista previa, validación y trazabilidad por lote.

Versión navegable actual: https://fantasy-copilot.icontre97.chatgpt.site

## Decisión actual sobre LALIGA Fantasy

La conexión automática es técnicamente investigable, pero **no se implementará ni se pedirán credenciales** sin autorización escrita de LALIGA.

Los motivos son:

- el flujo encontrado es ROPC de Azure B2C y obliga a que la contraseña atraviese nuestra infraestructura;
- no cubre cuentas que dependan de Google, Apple o Facebook;
- depende de endpoints privados e inestables;
- las [condiciones de uso de LALIGA Fantasy](https://www.laliga.com/informacion-legal/condiciones-de-uso-fantasy), actualizadas el 3 de julio de 2026, limitan el uso al ámbito personal/privado y exigen consentimiento escrito para uso comercial.

Por tanto, **manual/CSV es el suelo garantizado del MVP**. El código solo contiene un contrato tipado y un estado de producto bloqueado; no contiene URLs privadas, ROPC, formularios de credenciales ni operaciones de mercado.

Consulta [Integración LALIGA Fantasy en modo lectura](docs/laliga-readonly-integration.md).

## Desarrollo local

1. Copia `.env.example` a `.env.local`.
2. Completa la URL y la clave publicable de Supabase.
3. Instala dependencias con `npm ci`.
4. Ejecuta `npm run dev`.

Comprobaciones:

```bash
npm run lint
npm test
npm run build
```

## Estado de datos

Supabase tiene el esquema y RLS preparados, pero todavía no hay usuarios ni catálogo real cargado. La plantilla puede construirse manualmente o importarse desde CSV sin depender del catálogo. Los datos deportivos externos seguirán detrás de una capa de ingesta desacoplada.

## Documentación

- [Arquitectura](docs/architecture.md)
- [Modelo de datos](docs/data-model.md)
- [Registro de cambios de base de datos](docs/database-changelog.md)
- [Integración LALIGA Fantasy en modo lectura](docs/laliga-readonly-integration.md)
- [Prompt maestro de Lovable](docs/lovable-master-prompt.md)

Nunca se incluyen claves privadas, contraseñas de terceros ni tokens de sesión en el frontend o el repositorio.
