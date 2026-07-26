# Arquitectura

## Principio

Arquitectura simple, barata, móvil-first, fácil de mantener desde un teléfono y resistente a cambios en proveedores. Fantasy Copilot debe seguir siendo útil sin acceso a una cuenta de LALIGA Fantasy.

## Flujo del producto actual

1. El usuario crea una cuenta de Fantasy Copilot o entra en modo demo.
2. Carga su plantilla mediante manual/CSV.
3. Los datos privados normalizados se guardan en Supabase con RLS por propietario.
4. Una capa de ingesta desacoplada aporta calendario, disponibilidad y métricas deportivas permitidas.
5. Un motor de reglas calcula señales básicas.
6. La IA convierte las señales en recomendaciones explicadas.
7. El dashboard muestra acciones prioritarias; el usuario mantiene siempre el control.

## Flujo futuro condicionado

Solo si existe permiso o una base de uso aceptable, un adaptador del lado servidor podrá ejecutar una sincronización manual de solo lectura con LALIGA Fantasy. La credencial se usaría una vez en memoria, el token nunca llegaría al frontend y solo se persistirían datos normalizados.

Sin credenciales persistentes no puede haber sincronización privada en segundo plano. Las alertas iniciales deben apoyarse en datos externos o en la última importación del usuario.

## Componentes

- Next.js proporciona el frontend actual.
- Lovable mejora el diseño y construye vertical slices sin cambiar el contrato de seguridad.
- Supabase proporciona autenticación, Postgres, RLS y Edge Functions.
- La capa de ingesta está desacoplada de cualquier proveedor.
- Manual/CSV y demo permanecen como suelo garantizado.
- Vercel alojará la aplicación de producción.
- OpenAI generará explicaciones y recomendaciones, sin sustituir reglas deterministas.

## Decisiones del MVP

- Email y contraseña para Fantasy Copilot; acceso social después.
- Manual/CSV como entrada canónica.
- La demostración de conexión con LALIGA es simulada y no pide credenciales.
- No se llama a la API privada hasta superar el bloqueo de permiso y estabilidad.
- Ninguna contraseña, token o cookie de LALIGA se persiste, registra o expone al frontend.
- Ninguna compra, venta, puja o alineación se automatiza.
- El piloto automático queda en el roadmap futuro, condicionado a permiso, estabilidad y modo simulación.
- No se crean tablas o políticas desde Lovable sin revisar el esquema real.

## Límites de confianza

El frontend nunca llama directamente a un proveedor privado. Cualquier endpoint propio futuro deberá:

- validar al usuario de Supabase;
- exigir consentimiento explícito;
- aplicar límites de frecuencia, allowlist y timeouts;
- no registrar contraseñas, tokens ni cabeceras sensibles;
- normalizar respuestas antes de guardarlas;
- aislar los datos por propietario;
- devolver errores accionables sin filtrar secretos;
- carecer de cualquier método de escritura hacia LALIGA.

## Riesgos principales

- Condiciones oficiales incompatibles con un uso comercial sin consentimiento escrito expreso.
- Flujo ROPC que obliga a tratar una contraseña de tercero en tránsito.
- Cuentas Google, Apple y Facebook posiblemente no compatibles.
- API privada sin garantía de estabilidad y con riesgo especial al cambiar de temporada.
- Referencias open source pequeñas y sin licencia reutilizable.

La mitigación es no depender del conector: feature flag, mocks tipados, manual/CSV, demo y proveedores externos sustituibles.
