# Fantasy Copilot

Asistente móvil-first para gestionar una plantilla de fantasy fútbol, priorizar decisiones de mercado y recibir recomendaciones explicadas.

## MVP

- Autenticación con email y contraseña mediante Supabase.
- Onboarding, dashboard, plantilla, mercado, perfil y modo demo.
- Persistencia Supabase con RLS y aislamiento por usuario.
- Alta manual e importación CSV con vista previa, validación y trazabilidad.
- Piloto privado de conexión a LALIGA Fantasy para la cuenta del dueño.
- Selección de liga y sincronización bajo demanda de saldo, plantilla, alineación y mercado.
- Sin compras, ventas, pujas, cambios de alineación ni tareas en segundo plano.

Versión estable actual: https://fantasy-copilot.icontre97.chatgpt.site

## Piloto privado de LALIGA Fantasy

La conexión es una prueba personal, de una sola cuenta y solo lectura. No es una integración oficial de LALIGA y permanece desactivada por defecto.

Flujo de seguridad:

1. El usuario debe estar autenticado primero en Fantasy Copilot.
2. Introduce sus credenciales de LALIGA únicamente dentro de la aplicación.
3. El servidor las reenvía una vez al acceso Azure B2C y descarta la contraseña.
4. El access token se cifra, se liga al usuario y se guarda en una cookie `HttpOnly`, `SameSite=Strict`.
5. Solo se permiten endpoints GET expresamente incluidos en una allowlist.
6. La sincronización reemplaza el snapshot en una transacción `SECURITY INVOKER` que respeta RLS.
7. Al desconectar, la cookie se elimina inmediatamente.

Limitaciones:

- ROPC no cubre cuentas creadas exclusivamente con Google, Apple o Facebook.
- La API es privada y puede cambiar con la temporada.
- No se almacena refresh token; no existe sincronización con la app cerrada.
- Manual y CSV continúan como respaldo permanente.
- No se ofrecerá a terceros ni se monetizará sin una revisión jurídica y autorización adicional.

Consulta [Integración LALIGA Fantasy en modo lectura](docs/laliga-readonly-integration.md).

## Desarrollo local

1. Copia `.env.example` a `.env.local`.
2. Completa la URL y la clave publicable de Supabase.
3. Para probar el piloto privado, configura una clave aleatoria de al menos 32 bytes en `LALIGA_SESSION_SECRET` y activa `LALIGA_PRIVATE_BETA_ENABLED=true`.
4. Instala dependencias con `npm ci`.
5. Ejecuta `npm run dev`.

Comprobaciones:

```bash
npm run lint
npm test
npm run build
```

## Estado de validación

- CI #66 completada correctamente con instalación, auditoría, lint, tests y build en verde.
- La validación con credenciales reales se realiza exclusivamente en un despliegue Preview de Vercel.
- Las variables privadas del Preview se configuraron en Vercel el 29 de julio de 2026 y requieren un nuevo despliegue de esta rama para aplicarse.
- La rama `main` permanece sin cambios hasta completar la prueba funcional privada.

Nunca se incluyen claves privadas, contraseñas de terceros ni tokens de sesión sin cifrar en el frontend, Supabase, Git o analítica.

## Documentación

- [Arquitectura](docs/architecture.md)
- [Modelo de datos](docs/data-model.md)
- [Registro de cambios de base de datos](docs/database-changelog.md)
- [Integración LALIGA Fantasy en modo lectura](docs/laliga-readonly-integration.md)
- [Prompt maestro de Lovable](docs/lovable-master-prompt.md)
