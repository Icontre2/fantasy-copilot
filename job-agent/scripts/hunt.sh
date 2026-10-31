#!/usr/bin/env bash
# Ronda autónoma de /hunt en modo headless (para cron o launchd).
#
#   ./scripts/hunt.sh                      # usa hunt.config.md
#   ./scripts/hunt.sh "data engineer, remoto"
#
# Cron diario a las 8:17 (ejemplo):
#   17 8 * * 1-5 cd /ruta/a/job-agent && ./scripts/hunt.sh >> output/hunts/cron.log 2>&1
#
# Requiere Claude Code instalado y con sesión iniciada (`claude` en el PATH).
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f profile/profile.md ]]; then
  echo "Falta profile/profile.md. Abre 'claude' aquí y ejecuta /setup primero." >&2
  exit 1
fi

mkdir -p output/hunts

# Herramientas permitidas sin preguntar: lectura/escritura local, red de solo lectura
# y el subagente revisor. Bash queda limitado a mkdir/cp/date/ls.
claude -p "/hunt ${1:-}" \
  --allowedTools "Read" "Write" "Edit" "Glob" "Grep" "WebFetch" "WebSearch" "Agent" \
    "Bash(mkdir:*)" "Bash(cp:*)" "Bash(date:*)" "Bash(ls:*)"
