# job-agent: agente autónomo para buscar curro

Workspace de Claude Code basado en [squerne/open-career-skills](https://github.com/squerne/open-career-skills) (MIT, commit `f0946bd`), con un agente autónomo encima: **`job-hunter`**, que hace una ronda completa de búsqueda sin pedirte confirmación entre pasos.

## Qué hace una ronda (`/hunt`)

1. **Busca** ofertas reales (LinkedIn guest + búsquedas web en InfoJobs, Tecnoempleo, Indeed, Greenhouse, Lever...). Solo cuenta lo que descarga de verdad; si un portal bloquea, te deja el enlace de búsqueda.
2. **Deduplica** contra tu tracker y tus exclusiones.
3. **Evalúa** cada oferta: filtro de elegibilidad (visado, ubicación, idioma) y puntuación de encaje 0-100.
4. **Prepara borradores** de CV y carta para las mejores (>= 75 por defecto), revisados por el subagente `application-reviewer`.
5. **Escribe el informe** del día en `output/hunts/AAAA-MM-DD.md` y actualiza `tracker/applications.md`.

Límites que no cruza: **nunca envía candidaturas** y **nunca inventa datos tuyos**. Lo que falte queda como `[añadir: ...]` y como pregunta en el informe.

## Puesta en marcha

```bash
cd job-agent
claude
/setup                 # crea profile/profile.md desde tu CV (una vez)
```

Opcional: `cp hunt.config.template.md hunt.config.md` y ajusta consultas, ubicaciones, umbrales y empresas excluidas.

## Uso

```
/hunt                          # ronda con hunt.config.md
/hunt data engineer, remoto    # ronda con otro enfoque
/apply <url>                   # pipeline interactivo para enviar una oferta concreta
```

### Modo totalmente autónomo (cron)

```bash
./scripts/hunt.sh
# crontab -e  →  de lunes a viernes a las 8:17
17 8 * * 1-5 cd /ruta/a/job-agent && ./scripts/hunt.sh >> output/hunts/cron.log 2>&1
```

El script ejecuta `claude -p "/hunt"` con una lista cerrada de herramientas permitidas (lectura/escritura local, web de solo lectura, `mkdir`/`cp`/`date`/`ls`).

## Privacidad

`profile/`, `story-bank/`, `tracker/`, `output/` y `hunt.config.md` están en `.gitignore`: tu CV y tus datos no se suben nunca al repo. Por eso el modo cron corre en tu máquina, no en GitHub Actions.

## Resto de comandos

Los heredados de open-career-skills: `/find-jobs`, `/optimize-cv`, `/cover-letter`, `/extract-story`, `/mine-evidence`, `/detect-ats`, `/mock-interview`, `/plan-content`, `/upskill`. Detalle en `docs/`.
