@AGENTS.md

Thin overlay for Claude-format tools. The router and contract live in
`AGENTS.md`; lazy domain context in `.devin/context/` (index:
`.devin/context/00-INDEX.md`); file map in `PROJECT_INDEX.md`. Hooks for
edit/session tracking are in `.claude/settings.json` (same tracker as
`.devin/hooks.v1.json`).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
