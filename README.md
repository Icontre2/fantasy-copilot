# Fantasy Copilot

Aplicación móvil-first para ayudar a usuarios de LALIGA Fantasy a tomar mejores decisiones sobre plantilla y mercado.

## MVP navegable

La primera versión está construida y desplegada de forma privada:

- Demo completa con datos realistas.
- Registro e inicio de sesión con email y contraseña.
- Onboarding y creación manual del equipo.
- Carga y gestión manual de plantilla.
- Dashboard con patrimonio, disponibilidad y recomendaciones.
- Gestión manual del mercado.
- Perfil, recuperación de acceso y cierre de sesión.

**Aplicación:** https://fantasy-copilot.icontre97.chatgpt.site

## Stack

- Frontend: React 19, TypeScript, Vinext y Tailwind CSS.
- Backend, base de datos y autenticación: Supabase.
- Despliegue: ChatGPT Sites sobre Cloudflare Workers.
- Iconos: Lucide React.

## Estado de los datos

El esquema real de Supabase está conectado y tipado. La base todavía no contiene catálogo de jugadores, por lo que el modo real muestra ese bloqueo de datos de forma explícita. La demo permite revisar toda la experiencia mientras se elige y configura el proveedor externo.

La importación CSV tiene infraestructura de backend preparada, pero queda aplazada intencionadamente para una iteración posterior. El MVP utiliza carga manual.

## Seguridad

- No se almacenan credenciales ni sesiones de LALIGA Fantasy.
- El navegador utiliza únicamente la clave pública de Supabase.
- Nunca se expone `service_role`.
- Los datos privados se protegen mediante RLS y se vinculan al usuario autenticado.
- Todas las versiones de dependencias están fijadas y se incluye el lockfile.

## Validación

La versión actual pasa:

- compilación de producción;
- TypeScript estricto;
- ESLint;
- prueba de renderizado;
- validación del artefacto desplegable;
- revisión visual e interacción de portada, demo, plantilla, mercado, perfil y registro.

## Documentación

- [Arquitectura](docs/architecture.md)
- [Modelo de datos](docs/data-model.md)
- [Prompt maestro para Lovable](docs/lovable-master-prompt.md)

La fuente de verdad operativa y el diario de decisiones se mantienen en Notion.
