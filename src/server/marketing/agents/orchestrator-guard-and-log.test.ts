import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { guardarRegistroDeEjecucion, registroDeEjecucionSchema } from './execution-log.ts';

const repo = process.cwd();
const guard = path.join(repo, '.claude', 'hooks', 'orchestrator-write-guard.mjs');

function runGuard(tool_name: string, tool_input: Record<string, unknown>) {
  const result = spawnSync(process.execPath, [guard], {
    cwd: repo,
    env: { ...process.env, CLAUDE_PROJECT_DIR: repo },
    input: JSON.stringify({ tool_name, tool_input }),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout).hookSpecificOutput as {
    permissionDecision: 'allow' | 'deny';
    permissionDecisionReason: string;
  };
}

test('Orchestrator permite Write dentro de marketing/generated', () => {
  const output = runGuard('Write', { file_path: 'marketing/generated/2026-08-22/LL-X/package.json' });
  assert.equal(output.permissionDecision, 'allow');
});

test('Orchestrator bloquea Write fuera de marketing/generated', () => {
  const output = runGuard('Write', { file_path: 'src/server/marketing/pwned.ts' });
  assert.equal(output.permissionDecision, 'deny');
});

test('Orchestrator bloquea traversal que intenta escapar de generated', () => {
  const output = runGuard('Edit', { file_path: 'marketing/generated/../../brand/BRAND.md' });
  assert.equal(output.permissionDecision, 'deny');
});

test('Orchestrator bloquea Bash aunque el comando parezca inocuo', () => {
  const output = runGuard('Bash', { command: 'echo hola' });
  assert.equal(output.permissionDecision, 'deny');
});

test('registro completo se valida y persiste solo bajo generated/_runs', async () => {
  const raiz = await mkdtemp(path.join(os.tmpdir(), 'ligalab-runlog-'));
  try {
    const destino = await guardarRegistroDeEjecucion(
      {
        run_id: '../run peligroso',
        timestamp: new Date().toISOString(),
        opportunity_id: 'RADAR-1',
        agentes_invocados: ['strategist', 'copywriter', 'brand-reviewer'],
        reintentos: 1,
        reviewer_verdict: 'PASS',
        autocorrection_used: true,
        final_status: 'pending_approval',
        content_id: 'LL-20260822-999',
        source: 'claude-code-skill',
        trace_complete: true,
        error: null,
      },
      raiz,
    );

    const allowed = path.join(raiz, 'marketing', 'generated', '_runs');
    const relativo = path.relative(allowed, destino);
    assert.ok(!relativo.startsWith('..') && !path.isAbsolute(relativo));

    const persistido = JSON.parse(await readFile(destino, 'utf8'));
    assert.equal(registroDeEjecucionSchema.safeParse(persistido).success, true);
    assert.equal(persistido.autocorrection_used, true);
    assert.equal(persistido.trace_complete, true);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
});

test('registro parcial permite desconocidos en vez de inventar ceros', () => {
  const resultado = registroDeEjecucionSchema.safeParse({
    run_id: 'sdk-fallo',
    timestamp: new Date().toISOString(),
    opportunity_id: null,
    agentes_invocados: null,
    reintentos: null,
    reviewer_verdict: null,
    autocorrection_used: null,
    final_status: 'review_pending',
    content_id: 'LL-20260822-999',
    source: 'sdk-pipeline',
    trace_complete: false,
    error: 'fallo antes de saber la etapa exacta',
  });
  assert.equal(resultado.success, true);
});
