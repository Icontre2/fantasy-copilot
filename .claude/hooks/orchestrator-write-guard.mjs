#!/usr/bin/env node

import path from 'node:path';

let input = '';
for await (const chunk of process.stdin) input += chunk;

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
}

function allow() {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: 'Escritura del Orchestrator dentro de marketing/generated/.',
    },
  }));
}

let event;
try {
  event = JSON.parse(input);
} catch {
  deny('Guard del Orchestrator: entrada de hook inválida. Se bloquea por seguridad.');
  process.exit(0);
}

const tool = event?.tool_name;
const toolInput = event?.tool_input ?? {};

// El Orchestrator no necesita shell. Bloquear Bash cierra la vía de escape que
// permitiría escribir fuera de marketing/generated/ mediante redirecciones,
// cp, sed, git, scripts ad hoc, etc.
if (tool === 'Bash') {
  deny('El Orchestrator no puede usar Bash. Usa Read/Grep/Glob/Agent y Write/Edit únicamente bajo marketing/generated/.');
  process.exit(0);
}

if (tool !== 'Write' && tool !== 'Edit') {
  // Este hook solo se registra para herramientas mutantes conocidas, pero si
  // Claude Code amplía el matcher en el futuro no queremos bloquear lecturas.
  allow();
  process.exit(0);
}

const rawPath = toolInput.file_path;
if (typeof rawPath !== 'string' || rawPath.trim() === '') {
  deny(`El Orchestrator intentó ${tool} sin file_path válido.`);
  process.exit(0);
}

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const allowedRoot = path.resolve(projectDir, 'marketing', 'generated');
const candidate = path.resolve(projectDir, rawPath);
const relative = path.relative(allowedRoot, candidate);
const insideAllowedRoot = relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));

if (!insideAllowedRoot) {
  deny(`Escritura bloqueada: ${candidate} está fuera de ${allowedRoot}. El Orchestrator solo puede escribir en marketing/generated/.`);
  process.exit(0);
}

allow();
