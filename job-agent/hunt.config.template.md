# Configuración de /hunt (plantilla)

> Copia este fichero a `hunt.config.md` (ignorado por git) y edítalo.
> Si no existe `hunt.config.md`, el agente usa estos valores y los del perfil.

## Búsqueda

- consultas:
  - "<puesto objetivo 1>"
  - "<puesto objetivo 2>"
- ubicaciones:
  - "Madrid"
  - "Remote"
- modalidad: remoto, híbrido   # on-site / híbrido / remoto
- antiguedad_max_dias: 7
- portales_extra:               # filas de portals.md a priorizar
  - InfoJobs
  - Tecnoempleo

## Límites

- max_ofertas: 10        # ofertas evaluadas a fondo por ronda
- umbral_borrador: 75    # puntuación mínima para preparar CV + carta
- max_borradores: 3

## Excluir

- empresas:
  - "<empresa donde ya trabajas o no quieres ir>"
- palabras_clave:
  - "prácticas"
