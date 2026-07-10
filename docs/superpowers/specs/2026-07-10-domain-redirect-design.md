# Domain Redirect — Design

## Goal

Add a **Redirect Rule** capability: within a Profile, redirect requests whose target
domain matches a source pattern to a different host (host swap, preserving path/query),
optionally changing port and scheme. Compiled to DNR `redirect` action rules.

## Domain model (CONTEXT.md)

New term **Redirect 规则 (Redirect Rule)**: a redirect instruction inside a Profile —
**源域名 (source)** + **目标 (target)** — individually enable/disable-able, parallel to
Header 规则. Effectiveness follows the existing rule:
`!全局暂停 && Profile 启用 && 规则启用 && 源域名命中`.

`Profile` gains `redirects?: RedirectRule[]` (optional — stored profiles predating this
feature have no such key; undefined treated as empty).

## Types (compile.ts)

```ts
interface RedirectRule {
  id: string;
  enabled: boolean;
  source: string;   // 源域名: example.com (exact) / *.example.com (wildcard) — Domain Filter semantics
  target: string;   // host | host:port | scheme://host[:port], e.g. localhost:3000, http://localhost:3000
}
```

## Compilation

- Each enabled redirect rule in an enabled profile (and not global-paused) → one DNR rule,
  `action.type = 'redirect'`, `action.redirect.transform = { host, port?, scheme? }`,
  preserving original path/query.
- Source domain reuses the existing `toDomainCondition([source])` — one host-matching
  implementation shared by Domain Filter and redirects (leverage).
- `priority = profile index + 1`, same scheme as header rules; redirect and header rules
  are independent DNR entries.
- `target` parsing (pure helper `parseRedirectTarget`):
  - leading `scheme://` → `transform.scheme` (`http`/`https`), stripped from the rest
  - trailing `:port` (digits) → `transform.port`
  - remainder → `transform.host`
  - empty host → rule skipped (produces nothing), never throws.

## UI (Options editor)

New **Redirect rules** section in the selected Profile's editor, after Header rules:
each row = enable toggle + `source` input + `→` + `target` input + Delete; a
"+ Add redirect" button. Popup unchanged (switches only).

## Import/Export & storage

No format change needed — `redirects` rides along on the Profile object through
`exportConfig`/`exportProfile`/`parseImport` and chrome.storage automatically. `parseImport`'s
id-regeneration should also freshen redirect-rule ids (append-merge must not collide).

## Out of scope (YAGNI)

- No full-URL redirect, no regex substitution, no path rewriting — host/port/scheme only.

## Verification

- TDD on `compileRules` + `parseRedirectTarget`: host swap with port, wildcard source,
  scheme in target, global-pause/profile-off/rule-off suppression, empty/invalid target skipped.
- `pnpm test` / `typecheck` / `build` green.
- Manual: load unpacked, add a redirect (e.g. `api.example.com` → `http://localhost:3000`),
  confirm the request redirects in DevTools Network.
