# Prompt maestro para Lovable

Trabaja sobre **Fantasy Copilot** usando el código funcional ya validado como referencia. No sustituyas ni contradigas sus flujos aprobados. Es una aplicación web móvil-first para ayudar a usuarios de fantasy fútbol a gestionar su plantilla.

## Fuente de verdad

- Repositorio: `Icontre2/fantasy-copilot`.
- Rama fuente: `main`, commit validado `be74173f175842974f7a9df8c5ea8fc2f6b807ef`.
- Lee `README.md` y toda la documentación de `docs/` antes de editar.
- Proyecto Supabase existente: `ggqealkrogfgbykicmfo`.
- Supabase Auth y RLS ya están configurados.
- Usa solo la clave pública/publishable de Supabase en el cliente.
- Usa los nombres exactos del esquema existente.
- No crees ni cambies tablas, migraciones, Edge Functions o políticas RLS en este bloque.

## Decisión obligatoria sobre LALIGA Fantasy

La conexión privada está **bloqueada hasta obtener autorización escrita de LALIGA**. Las condiciones oficiales revisadas son: https://www.laliga.com/informacion-legal/condiciones-de-uso-fantasy

No hagas ninguna de estas acciones:

- pedir email o contraseña de LALIGA;
- crear un formulario de credenciales, aunque sea efímero;
- implementar Azure B2C ROPC;
- llamar, adivinar o documentar endpoints privados;
- guardar tokens o sesiones de terceros;
- reutilizar código del repositorio de referencia sin licencia;
- comprar, vender, pujar o cambiar alineaciones;
- afirmar que la conexión automática funciona o está aprobada.

Preserva `app/laliga-provider.ts` como contrato tipado y estado `blocked_by_terms`. La tarjeta de conexión debe explicar con claridad que la función necesita autorización y ofrecer manual/CSV.

## Prioridad del bloque

Pulir y verificar el flujo real **manual + CSV** ya implementado:

1. Onboarding con tres opciones comprensibles: CSV, manual y conexión bloqueada.
2. Alta manual sin catálogo: nombre, posición, club opcional, valor y flags.
3. Selector de archivo CSV, ejemplo de formato y validación antes de importar.
4. Cabeceras en español o inglés, separadores coma, punto y coma o tabulador.
5. Vista previa, advertencias por fila, límite de tamaño y prevención de duplicados.
6. Registro de lote e ítems en Supabase.
7. Plantilla que combine jugadores canónicos e importados.
8. Tarjeta informativa en Perfil con enlace a las condiciones oficiales.
9. Estados vacíos y errores útiles en iPhone.
10. Pruebas, lint y build.

## Diseño

- Estética deportiva premium y tecnológica.
- Fondo claro, tarjetas limpias, tipografía contundente y jerarquía fuerte.
- Prioridad absoluta a iPhone.
- Navegación inferior: Inicio, Plantilla, Mercado y Perfil.
- No copies logos, identidad ni interfaz oficial de LALIGA Fantasy.
- No ocultes el bloqueo: conviértelo en una explicación breve y honesta.

## MVP que debe preservarse

- Registro, inicio y cierre de sesión con email y contraseña.
- Recuperación de contraseña.
- Onboarding y creación del equipo.
- Dashboard, plantilla, mercado y perfil.
- Modo demo.
- Estados de carga, error y vacío.
- Persistencia Supabase con aislamiento por usuario.
- Carga manual y CSV como vías funcionales.

## Calidad

- TypeScript estricto y dependencias fijadas.
- Componentes reutilizables y accesibles.
- No generes datos falsos permanentes.
- No expongas `service_role`.
- Ejecuta `npm run lint`, `npm test` y `npm run build`.
- Resume archivos modificados, pruebas y bloqueos.

## Resultado esperado

Una evolución visual y funcional del MVP en la que cualquier usuario pueda construir su plantilla mediante manual/CSV sin depender de una API privada. La integración LALIGA debe quedar representada únicamente como capacidad futura bloqueada.
