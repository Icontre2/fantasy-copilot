# Prompt maestro para Lovable

Continúa **Fantasy Copilot**, una aplicación móvil-first para ayudar a usuarios de fantasy fútbol a decidir alineación y mercado. El código existente ya contiene registro, onboarding, demo, dashboard, plantilla, mercado, perfil y persistencia Supabase.

## Fuente de verdad

- Repositorio privado: `Icontre2/fantasy-copilot`.
- Rama estable: `main`.
- Revisa el código actual y toda la documentación de `docs/` antes de editar.
- Proyecto Supabase existente: `ggqealkrogfgbykicmfo`.
- Supabase Auth y RLS ya están configurados.
- Usa solo URL y clave pública/publishable en el cliente.
- No actives una base de datos nueva en Lovable.
- No crees ni cambies tablas, migraciones, funciones o políticas RLS sin mostrar primero el cambio exacto y obtener aprobación.

## Objetivo del siguiente build

Mejora el frontend existente y construye un vertical slice completo de **Conectar LALIGA Fantasy** únicamente en modo simulado. El usuario debe poder recorrer todas las pantallas y estados sin introducir credenciales reales.

La integración real está bloqueada: la API es privada, su funcionamiento actual no está confirmado, la autenticación observada usa ROPC de Azure B2C y las condiciones oficiales describen el juego para uso privado y no comercial salvo consentimiento escrito. Lee primero `docs/laliga-readonly-integration.md`.

## Flujo que sí debes construir

1. Tarjeta principal en onboarding, Inicio y Perfil: **Conectar LALIGA Fantasy**.
2. Explicación previa: qué importaría, por qué sería solo lectura y qué no puede hacer Fantasy Copilot.
3. Etiqueta visible: **Integración experimental no oficial**.
4. CTA **Ver demostración de conexión**; no muestres un login real.
5. Selección simulada de liga si la cuenta tiene varias.
6. Progreso simulado: cuenta, liga, plantilla y mercado.
7. Resultado con fecha de última sincronización de demo y resumen de datos.
8. Estados simulables: cuenta social no compatible, sesión caducada, proveedor caído, límite temporal y cambio de formato.
9. Alternativas permanentes: carga manual y CSV.
10. Feature flag/kill switch para desactivar el conector sin romper el producto.

## Contrato técnico

Crea un adaptador tipado sustituible con métodos equivalentes a:

- `authenticateEphemeral()`
- `listLeagues()`
- `getLeagueSummary()`
- `getSquad()`
- `getLineup()`
- `getMarket()`
- `disconnect()`

Para este build todos los métodos usan mocks locales de sesión y no contienen URLs, tokens ni respuestas copiadas del proveedor. Ningún método de escritura forma parte del contrato.

## Prohibiciones obligatorias

- No pedir credenciales reales de LALIGA.
- No llamar a endpoints privados ni inventarlos.
- No copiar código del repositorio público de referencia: no tiene licencia explícita.
- No guardar contraseña, token, cookie o sesión del proveedor.
- No exponer `service_role` ni secretos al navegador.
- No implementar compras, ventas, pujas, alineaciones o capitán.
- No implementar sincronización privada en segundo plano.
- No presentar el piloto automático como disponible; solo puede aparecer como V2 futura.
- No copiar logos, identidad o interfaz oficial ni afirmar afiliación con LALIGA.
- No destruir ni regenerar el MVP funcional.

## MVP existente que debe preservarse

- Registro, inicio, cierre y recuperación por email y contraseña.
- Onboarding y creación de equipo.
- Dashboard, plantilla, mercado y perfil.
- Modo demo completo.
- Estados de carga, error y vacío.
- Persistencia Supabase con aislamiento por usuario.

## Diseño

- Deportivo premium, tecnológico y con personalidad propia.
- Prioridad absoluta a iPhone y 390 px de ancho, respetando safe areas.
- Fondo marfil o blanco cálido, navy casi negro, acento verde lima eléctrico y coral solo para alertas.
- Tipografía contundente, métricas grandes, tarjetas limpias, esquinas de 18–24 px y sombras suaves.
- Navegación inferior: Inicio, Plantilla, Mercado y Perfil.
- Microinteracciones sutiles, skeletons y estados vacíos útiles.
- Evita el aspecto de dashboard corporativo genérico y el exceso de gradientes.
- Accesibilidad: buen contraste, labels, foco, targets táctiles grandes y reduced motion.

## Calidad

- TypeScript estricto y dependencias fijadas.
- Componentes reutilizables y formularios accesibles.
- Datos ficticios claramente marcados como demo y nunca persistidos.
- Sin warnings de consola.
- Valida móvil y escritorio.
- Ejecuta lint y build al terminar.
- Resume archivos modificados, pruebas realizadas, estados simulados y bloqueos reales.

## Resultado esperado

Una evolución visual y funcional del MVP en la que el recorrido de conexión pueda demostrarse de principio a fin sin credenciales ni API real, y en la que manual/CSV mantengan la app plenamente utilizable. No te quedes solo en un plan: construye y valida el vertical slice.
