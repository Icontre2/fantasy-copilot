# Prompt maestro para Lovable

Continúa el proyecto existente **Fantasy Copilot**. No regeneres desde cero ni sustituyas el código funcional del repositorio. Es una aplicación web móvil-first para ayudar a usuarios de LALIGA Fantasy a tomar mejores decisiones sobre su plantilla.

## Fuente de verdad

- Repositorio: `Icontre2/fantasy-copilot`.
- Revisa el código actual, el PR del MVP y toda la documentación de `docs/` antes de editar.
- Conecta con el proyecto Supabase existente `ggqealkrogfgbykicmfo`.
- Supabase Auth y RLS ya están configurados.
- Usa solo la clave pública/publishable de Supabase en el cliente.
- Usa los nombres exactos del esquema existente.
- No crees ni cambies tablas, migraciones, funciones o políticas RLS sin mostrar primero el cambio exacto y obtener aprobación.

## Prioridad del siguiente bloque

Añade el flujo **Conectar LALIGA Fantasy** en modo solo lectura para traer:

- ligas y clasificación;
- plantilla y alineación;
- saldo;
- mercado, precios y actividad.

Lee primero `docs/laliga-readonly-integration.md` y la documentación más reciente de Notion. Si el contrato real de autenticación o endpoints no está confirmado, construye la interfaz, estados, adaptador y mocks tipados, pero no inventes endpoints ni declares la conexión como funcional.

## Seguridad de la conexión

- La contraseña de LALIGA nunca se guarda en Supabase, logs, analítica, repositorio ni estado persistente del navegador.
- El frontend nunca llama directamente a la API privada de LALIGA ni recibe secretos internos.
- Autenticación, tokens y sesiones de terceros se tratan únicamente en backend/Edge Function.
- No uses `service_role` en el cliente.
- No implementes compras, ventas, pujas ni cambios de alineación automáticos.
- Añade expiración, revocación, rate limiting, timeouts, errores seguros y una feature flag para desactivar el conector.
- Mantén carga manual y CSV como respaldo.

## Diseño

- Estética deportiva premium y tecnológica.
- Fondo claro, tarjetas limpias, tipografía contundente y jerarquía visual fuerte.
- Prioridad absoluta a iPhone.
- Navegación inferior: Inicio, Plantilla, Mercado y Perfil.
- No copies logos, identidad ni interfaz oficial de LALIGA Fantasy.

## Pantallas nuevas

1. Tarjeta principal en onboarding y Perfil: **Conectar LALIGA Fantasy**.
2. Explicación previa: solo lectura, qué datos se importan y qué no puede hacer Fantasy Copilot.
3. Formulario seguro con credenciales efímeras, solo cuando el backend real esté validado.
4. Selección de liga si la cuenta tiene varias.
5. Progreso de sincronización por fases: cuenta, liga, plantilla, mercado.
6. Resultado con fecha de última sincronización.
7. Estados de sesión caducada, credenciales incorrectas, límite temporal, proveedor caído y reconexión.
8. Alternativas visibles: carga manual y CSV.

## MVP existente que debe preservarse

- Registro, inicio y cierre de sesión con email y contraseña.
- Recuperación de contraseña.
- Onboarding y creación del equipo.
- Dashboard, plantilla, mercado y perfil.
- Modo demo.
- Estados de carga, error y vacío.
- Persistencia Supabase con aislamiento por usuario.

## Calidad

- TypeScript estricto y dependencias fijadas.
- Componentes reutilizables.
- Formularios accesibles y validados.
- No generes datos falsos permanentes.
- Ejecuta lint y build después de cada bloque.
- Resume archivos modificados, pruebas realizadas y cualquier bloqueo real.

## Resultado esperado

Una evolución segura del MVP existente con el flujo completo y comprobable de conexión en solo lectura. Si la API privada aún no puede validarse, debe quedar un vertical slice listo para enchufar el adaptador real sin exponer credenciales ni romper las vías manuales.
