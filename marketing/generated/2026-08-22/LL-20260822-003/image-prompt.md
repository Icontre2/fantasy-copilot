# Motion e imagen — LL-20260822-003

## Principio

Aquí no se rueda nada. Hay exactamente **dos** fuentes de movimiento:

1. La tipografía y la constelación de puntos, animadas por capas.
2. La propia app moviéndose en la grabación de pantalla.

Cero cámara, cero actores, cero stock, cero b-roll de fútbol.

## Prompt de las capas generadas

```
Motion vertical 9:16, 1080x1920, 26 segundos. Base neutra #08070a → #050506 en
degradado vertical muy plano, SIN manchas de luz moradas en las capas de
marketing: el morado solo puede venir de dentro de la captura real.

Tipografía Sora: SemiBold 78-92 px para la frase de beat, Regular 30 px para el
sello de fuente. Rojo de marca únicamente en filete de captura, palabra de
énfasis, línea de firma y atributo activo.

Elemento generado central: una constelación abstracta de once puntos de luz en
formación sobre negro, que se recoloca cuando tres se apagan. Sin campo
dibujado, sin líneas de banda, sin escudos, sin cifras legibles.

PROHIBIDO generar interfaz de aplicación. Sin logos de marcas reales, sin logo
de LALIGA, sin fotografías de prensa de jugadores.
```

## El filete rojo es la frontera

Un filete de 6 px rodea la captura real en los beats 5-8, y **solo ahí**. Si en
un plano no hay captura real, no hay filete. Es una promesa de lectura, no un
adorno: fuera es discurso nuestro, dentro es producto.

Nace como marco en el beat 5 y muere como línea de firma horizontal en el beat
9. Un solo objeto rojo recorriendo toda la pieza.

## Prohibido animar la captura

Nada de Ken Burns, nada de parallax, nada de zoom añadido, nada de reencuadres
dentro del vídeo de pantalla. Lo único que se mueve dentro del filete es lo que
hacía la app cuando se grabó. **Si el plano se ve estático, es que la app es
estática, y eso es información honesta.**

## Portada

Fotograma del beat 3, congelado en el instante en que el punto blanco sano se
está saliendo del dibujo y aún no se ha apagado del todo. Es el único frame que
cuenta la idea completa sin producto y sin texto largo.

Texto: «¿Y el once que queda?». **Sin captura de app**: una portada se recorta y
se reescala, y un producto recortado se lee como producto falseado.

## Handoff a Canva

Vertical 1080×1920, 9 páginas (una por beat) más portada.

- Capas por página: fondo bloqueado → constelación o hueco de captura → filete
  rojo (solo 5-8) → texto de beat → banda de marca → sello de fecha.
- En las páginas 5-8 el hueco va como rectángulo gris etiquetado
  **«CAPTURA REAL — NO GENERAR — [A/B/C]»**. Si alguien lo rellena con una
  imagen generada, la pieza está rota.
- Campos editables: sello de fecha, frases de los 9 beats, fila de atributos del
  beat 8, y logo/icono en capa aislada `ASSET-REEMPLAZABLE`.
- Si Sora no está en la cuenta, la sustitución **se aprueba**; no se cambia por
  defecto a una geométrica cualquiera.
- Exportar MP4 vertical, 30 fps mínimo, sin marca de agua. Las páginas 5-8 se
  componen en el editor de vídeo, no en el de presentación.
