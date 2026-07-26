# Fantasy Copilot

Asistente móvil-first para gestionar una plantilla de fantasy fútbol, priorizar decisiones de mercado y recibir recomendaciones explicadas.

## MVP disponible

- Autenticación con email y contraseña mediante Supabase.
- Onboarding guiado y creación del equipo.
- Dashboard, plantilla, mercado y perfil.
- Modo demo completo para revisar el producto sin datos reales.
- Modo conectado con persistencia Supabase y aislamiento por usuario.
- Carga manual y futura importación CSV como vías canónicas del MVP.

Versión navegable: https://fantasy-copilot.icontre97.chatgpt.site

## Prioridad actual

El siguiente bloque mejora el producto móvil y construye una demostración completa del flujo **Conectar LALIGA Fantasy**. La experiencia mostrará cómo se importarían ligas, clasificación, plantilla, saldo, alineación y mercado, pero no pedirá credenciales ni llamará a la API privada.

La integración real permanece bloqueada hasta obtener permiso o una base de uso aceptable. La autenticación observada exige que la contraseña pase por infraestructura propia, excluye cuentas sociales y no permite sincronización privada en segundo plano sin persistir secretos. Las condiciones oficiales describen el juego para uso privado y no comercial salvo consentimiento escrito expreso.

Por ello:

- manual/CSV y demo siguen funcionando aunque el proveedor no exista;
- el adaptador real está desacoplado y protegido por feature flag;
- no se guardan contraseñas, tokens ni cookies de LALIGA;
- no se ejecutan compras, ventas, pujas, alineaciones ni piloto automático;
- no se reutiliza código de referencias sin licencia.

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

Supabase tiene el esquema preparado, pero todavía no hay usuarios ni catálogo real cargado. El catálogo y las métricas deportivas se mantienen detrás de una capa de ingesta desacoplada. La información específica de una cuenta se carga mediante demo, manual o CSV hasta que exista una vía autorizada para conectarla.

## Documentación

- [Arquitectura](docs/architecture.md)
- [Modelo de datos](docs/data-model.md)
- [Integración LALIGA Fantasy en modo lectura](docs/laliga-readonly-integration.md)
- [Prompt maestro de Lovable](docs/lovable-master-prompt.md)

Nunca se incluyen claves privadas ni credenciales de terceros en el frontend o el repositorio.
