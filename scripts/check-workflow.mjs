// Workflow validator — `pnpm workflow:check`. Zero-dep; exits non-zero on
// any structural problem so drift fails loudly instead of silently.
// Checks: required files, context indexing, rule frontmatter, stub/roster
// link targets, hooks JSON validity, size budgets.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const errors = [];
const notes = [];

const read = (p) => readFileSync(join(root, p), 'utf8');
const ok = (p) => existsSync(join(root, p));
const fail = (m) => errors.push(m);

// 1. Required files
const required = [
  'AGENTS.md', 'CLAUDE.md', 'PROJECT_INDEX.md',
  '.devin/rules/CONTEXT.md', '.devin/rules/agents.md',
  '.devin/context/00-INDEX.md',
  '.devin/hooks.v1.json', '.devin/config.json',
  '.claude/settings.json',
  'scripts/track-event.mjs',
];
for (const f of required) if (!ok(f)) fail(`missing required file: ${f}`);

// 1b. Other-AI entry points (entry 65) — thin pointers, never a second
// source of truth. OpenCode/Codex/Claude read AGENTS.md/CLAUDE.md natively;
// these cover Copilot, Cursor, Windsurf, Gemini CLI and Aider.
const entryPoints = [
  '.github/copilot-instructions.md',
  '.cursor/rules/buildmyrig.mdc',
  '.windsurf/rules/buildmyrig.md',
  'GEMINI.md',
  'CONVENTIONS.md',
];
for (const f of entryPoints) {
  if (!ok(f)) { fail(`missing AI entry point: ${f}`); continue; }
  const src = read(f);
  if (!/AGENTS\.md/.test(src)) fail(`${f}: must point at AGENTS.md (single source of truth)`);
  if (!/\.devin\/context\//.test(src)) fail(`${f}: must point at .devin/context/`);
  if (src.length > 4000) fail(`${f} over budget: ${src.length} chars > 4000 (keep pointers thin)`);
}
// Windsurf + Cursor need their frontmatter or the rule is ignored entirely.
const frontmatter = {
  '.cursor/rules/buildmyrig.mdc': /^---\r?\n[\s\S]*?alwaysApply:\s*true/,
  '.windsurf/rules/buildmyrig.md': /^---\r?\n[\s\S]*?trigger:\s*always_on/,
};
for (const [f, re] of Object.entries(frontmatter)) {
  if (ok(f) && !re.test(read(f))) fail(`${f}: missing required frontmatter (${re})`);
}

// 2. Context files indexed both ways
const ctxDir = join(root, '.devin/context');
const ctxFiles = existsSync(ctxDir)
  ? readdirSync(ctxDir).filter((f) => /^\d{2}-.+\.md$/.test(f) && f !== '00-INDEX.md')
  : [];
const index = ok('.devin/context/00-INDEX.md') ? read('.devin/context/00-INDEX.md') : '';
for (const f of ctxFiles) {
  if (!index.includes(f)) {
    fail(`.devin/context/${f} not listed in 00-INDEX.md`);
  }
}
for (const m of index.matchAll(/\((\d{2}-[^)]+)\)/g)) {
  if (!ok(`.devin/context/${m[1]}`)) fail(`00-INDEX.md references missing ${m[1]}`);
}
if (ctxFiles.length === 0) fail('no .devin/context/ domain files found');

// 3. Rules frontmatter + budgets
const VALID_TRIGGERS = ['always_on', 'manual', 'model_decision', 'agent', 'glob'];
const rulesDir = join(root, '.devin/rules');
if (existsSync(rulesDir)) {
  for (const f of readdirSync(rulesDir).filter((f) => f.endsWith('.md'))) {
    const src = readFileSync(join(rulesDir, f), 'utf8');
    const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) { fail(`.devin/rules/${f}: missing frontmatter block`); continue; }
    const trig = fm[1].match(/trigger:\s*(\w+)/)?.[1];
    if (!trig || !VALID_TRIGGERS.includes(trig)) {
      fail(`.devin/rules/${f}: invalid/missing trigger (got "${trig}")`);
    }
    if (!/description:/.test(fm[1])) {
      fail(`.devin/rules/${f}: missing description in frontmatter`);
    }
    // stub/roster links into context must resolve
    for (const m of src.matchAll(/\.devin\/context\/([\w.-]+\.md)/g)) {
      if (!ok(`.devin/context/${m[1]}`)) {
        fail(`.devin/rules/${f} references missing context file ${m[1]}`);
      }
    }
  }
}

// 4. Router links in AGENTS.md + CONTEXT.md resolve
for (const f of ['AGENTS.md', '.devin/rules/CONTEXT.md']) {
  if (!ok(f)) continue;
  for (const m of read(f).matchAll(/\.devin\/context\/([\w.-]+\.md)/g)) {
    if (!ok(`.devin/context/${m[1]}`)) fail(`${f} router references missing ${m[1]}`);
  }
}

// 5. Hooks JSON valid + wired to the tracker
for (const f of ['.devin/hooks.v1.json', '.claude/settings.json']) {
  if (!ok(f)) continue;
  try {
    const j = JSON.parse(read(f));
    const hooksObj = f.includes('settings') ? j.hooks : j;
    if (!hooksObj || typeof hooksObj !== 'object') fail(`${f}: no hooks object`);
    const flat = JSON.stringify(hooksObj);
    if (!flat.includes('track-event.mjs')) fail(`${f}: hooks do not call track-event.mjs`);
  } catch (e) {
    fail(`${f}: invalid JSON — ${e.message}`);
  }
}

// 6. Budgets (chars ≈ tokens*4; context files capped at 400 lines)
const budget = (f, max, unit = 'chars') => {
  if (!ok(f)) return;
  const src = read(f);
  const n = unit === 'lines' ? src.split('\n').length : src.length;
  if (n > max) fail(`${f} over budget: ${n} ${unit} > ${max}`);
  else notes.push(`${f}: ${n} ${unit} (limit ${max})`);
};
budget('AGENTS.md', 10000);
budget('.devin/rules/CONTEXT.md', 10000);
budget('.devin/rules/agents.md', 8000);
for (const f of ctxFiles) budget(`.devin/context/${f}`, 400, 'lines');

// Report
for (const n of notes) console.log(`  ok  ${n}`);
if (errors.length) {
  console.error(`\nworkflow:check FAILED — ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log('\nworkflow:check PASSED');
