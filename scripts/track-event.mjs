// Workflow auto-tracker — called by lifecycle hooks (.devin/hooks.v1.json,
// .claude/settings.json). Reads the hook event JSON on stdin and appends:
//   PostToolUse (edit/write/notebook_edit) → .devin/tracking/edits-<session_id>.jsonl
//   SessionStart / SessionEnd              → .devin/tracking/sessions.jsonl
// Contract: NEVER block, NEVER throw — always exit 0.
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.DEVIN_PROJECT_DIR || process.cwd();
const trackingDir = join(root, '.devin', 'tracking');

let input = '';
const bail = () => process.exit(0);
process.stdin.on('error', bail); // tracking must never break a session
process.stdin.on('close', bail); // closed without 'end' — nothing more to do
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
  try {
    const ev = JSON.parse(input || '{}');
    const ts = new Date().toISOString();
    const sid = String(ev.session_id || 'unknown').replace(/[^\w-]/g, '');
    mkdirSync(trackingDir, { recursive: true });

    if (ev.hook_event_name === 'PostToolUse') {
      const ti = ev.tool_input || {};
      const file = ti.file_path || ti.notebook_path || ti.path || '';
      appendFileSync(
        join(trackingDir, `edits-${sid}.jsonl`),
        JSON.stringify({ ts, tool: ev.tool_name, file, prompt_id: ev.prompt_id }) + '\n',
      );
    } else if (ev.hook_event_name === 'SessionStart' || ev.hook_event_name === 'SessionEnd') {
      appendFileSync(
        join(trackingDir, 'sessions.jsonl'),
        JSON.stringify({ ts, event: ev.hook_event_name, session_id: sid }) + '\n',
      );
    }
  } catch {
    // tracking must never break a session
  }
  process.exit(0);
});
