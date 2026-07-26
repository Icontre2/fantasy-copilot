# Arquitectura

## Principio

Arquitectura simple, barata, móvil-first, fácil de mantener desde un teléfono y resistente a cambios en proveedores no oficiales.

## Flujo del producto

1. El usuario crea una cuenta de Fantasy Copilot.
2. Conecta LALIGA Fantasy en modo lectura o utiliza carga manual/CSV.
3. Un adaptador del lado servidor obtiene y normaliza liga, plantilla, saldo y mercado.
4. Los datos privados normalizados se guardan en Supabase con RLS por propietario.
5. Un motor de reglas calcula señales básicas.
6. La IA convierte las señales en recomendaciones explicadas.
7. El dashboard muestra acciones prioritarias; el usuario mantiene siempre el control.

## Componentes

- Lovable genera y mantiene el frontend.
- Supabase proporciona autenticación, Postgres, RLS y Edge Functions.
- Un adaptador de proveedor encapsula la API privada de LALIGA Fantasy.
- La capa de ingesta está desacoplada del proveedor.
- La carga manual/CSV permanece como respaldo.
- Vercel alojará la aplicación.
- OpenAI generará explicaciones y recomendaciones, sin sustituir reglas deterministas.

## Decisiones del MVP

- Email y contraseña para Fantasy Copilot; acceso social después.
- Conexión con LALIGA Fantasy en modo exclusivamente lectura como prioridad.
- La contraseña de LALIGA no se persiste, registra ni envía al frontend después del formulario.
- Tokens o sesiones de terceros solo pueden tratarse en backend, con expiración, revocación y cifrado cuando deban persistirse.
- Ninguna compra, venta, puja o cambio de alineación se automatiza.
- Entrada manual y CSV se conservan como fallback.
- No se crean nuevas tablas o políticas desde Lovable sin revisar el esquema real.

## Límites de confianza

El frontend nunca llama directamente a la API privada de LALIGA Fantasy. Solo llama a endpoints propios autenticados. Esos endpoints deben:

- validar al usuario de Supabase;
- aplicar límites de frecuencia y timeouts;
- no registrar contraseñas, tokens ni cabeceras sensibles;
- normalizar respuestas antes de guardarlas;
- aislar los datos por propietario;
- devolver errores accionables sin filtrar secretos.

## Riesgo principal

La API de LALIGA Fantasy no es pública y puede cambiar o restringir cuentas. Por ello, el conector se implementará detrás de un adaptador y una feature flag. La aplicación debe seguir siendo utilizable mediante modo demo y carga manual/CSV si el proveedor falla o deja de ser viable.
