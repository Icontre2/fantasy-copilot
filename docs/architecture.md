# Arquitectura

## Principio

Arquitectura simple, barata, móvil-first y fácil de mantener desde un teléfono.

## Flujo del producto

1. El usuario crea una cuenta.
2. Crea su equipo e introduce o importa su plantilla.
3. Los datos normalizados se guardan en Supabase.
4. Un motor de reglas calcula señales básicas.
5. La IA convierte las señales en recomendaciones explicadas.
6. El dashboard muestra las acciones prioritarias.

## Componentes

- Lovable genera y mantiene el frontend.
- Supabase proporciona autenticación, Postgres, RLS y Edge Functions.
- La capa de ingesta está desacoplada del proveedor de datos.
- Vercel alojará la aplicación.
- OpenAI generará explicaciones y recomendaciones, sin sustituir las reglas deterministas.

## Decisiones del MVP

- Email y contraseña primero; acceso social después.
- Entrada manual de plantilla en el primer build.
- La infraestructura CSV se conserva para la siguiente iteración.
- No depender de APIs privadas no documentadas.
- No pedir ni guardar credenciales de LALIGA Fantasy.

## Riesgo principal

Conseguir datos estables y permitidos de jugadores, partidos, lesiones y sanciones. API-FOOTBALL es un candidato provisional, no un acoplamiento del frontend.
