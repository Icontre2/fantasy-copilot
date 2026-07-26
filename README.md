# Fantasy Copilot

Aplicación móvil-first para ayudar a usuarios de LALIGA Fantasy a tomar mejores decisiones sobre plantilla y mercado.

## Estado

Base técnica preparada. El primer build se realizará en Lovable sobre este repositorio y se conectará al proyecto Supabase existente.

## MVP

- Registro e inicio de sesión con email y contraseña.
- Onboarding y creación del equipo.
- Carga manual de plantilla.
- Dashboard con estado del equipo y recomendaciones.
- Gestión manual del mercado.
- Importación CSV preparada para una iteración posterior.

## Stack

- Frontend: Lovable, React y TypeScript
- Backend, base de datos y autenticación: Supabase
- Repositorio: GitHub
- Despliegue: Vercel
- IA: OpenAI
- Emails: Resend

## Estructura

- `src/`: frontend y lógica de aplicación
- `supabase/migrations/`: migraciones SQL
- `supabase/functions/`: Edge Functions
- `docs/`: decisiones y documentación técnica
- `.env.example`: variables públicas requeridas, sin secretos

## Seguridad

- No se almacenan credenciales ni sesiones de LALIGA Fantasy.
- Nunca se expone la clave `service_role` en el cliente.
- Los datos privados se protegen mediante RLS y se vinculan al usuario autenticado.
- No se suben secretos al repositorio.

## Documentación

- [Arquitectura](docs/architecture.md)
- [Modelo de datos](docs/data-model.md)
- [Prompt maestro para Lovable](docs/lovable-master-prompt.md)

La fuente de verdad operativa y el diario de decisiones se mantienen en Notion.
