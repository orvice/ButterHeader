# UI Modernization — Design

## Goal

Modernize the ButterHeader Options page and Popup from plain inline-styled `system-ui`
into a clean, professional, Tailwind-based UI with system-following dark mode.
**Pure presentation refactor** — no behavior, data flow, or ConfigStore-interaction changes.

## Decisions (from brainstorming)

- **Styling:** Tailwind CSS v4 via the `@tailwindcss/vite` plugin (wxt is Vite under the hood). No `tailwind.config.js` — v4 is config-less.
- **Dark mode:** follow system via `@media (prefers-color-scheme: dark)`. Zero JS, no theme toggle.
- **Visual style:** clean/professional — neutral slate palette, single blue/indigo accent, card-based layout, comfortable spacing, `focus-visible` rings.

## Technical setup

- Add devDeps `tailwindcss@^4` and `@tailwindcss/vite@^4`.
- `wxt.config.ts`: add `vite: () => ({ plugins: [tailwindcss()] })`.
- New `src/ui/style.css`: `@import "tailwindcss";` plus a small `@theme`/`:root` token block
  (accent color, radius) and a `@media (prefers-color-scheme: dark)` override for surface/text vars.
- Both `entrypoints/options/main.tsx` and `entrypoints/popup/main.tsx` import the shared CSS.

## Visual system

- Neutral: slate. Light = white/slate-50 surfaces, slate-900 text. Dark = slate-900/950 surfaces, slate-100 text.
- Accent: current `#1a73e8` consolidated into one `blue-600`-ish semantic token used for
  primary buttons, toggle-on state, and focus rings. Badge colors in `badge.ts` are unrelated
  (chrome.action API) and stay as-is.
- Cards: profile rows and rule rows become bordered rounded cards with subtle hover feedback.
- Buttons tiered: primary = solid accent; secondary = outline/ghost; destructive = subtle red on hover.

## Screens

### Options
- Header: title + global-pause as a real toggle switch (not a bare checkbox).
- Error banner: kept; restyled as a modern alert with an icon.
- Profile list: card rows with drag handle, enable toggle, inline rename, Edit/Export/Delete
  as icon/secondary buttons; selected row highlighted.
- Editor: Domains and Header-rules sections; unified input/select styling; aligned rule rows.

### Popup
- Fixed ~280px panel, dark-friendly.
- Global pause toggle on top; compact per-profile toggle rows; full-width secondary
  "Edit profiles…" button at the bottom.

## Explicitly out of scope (YAGNI)

- No icon library — emoji or minimal inline SVG only.
- No manual theme toggle (system-following only).
- No component decomposition (that is architecture-review candidate C, tracked separately).
- No behavior changes: all ConfigStore calls, DOM semantics, and `title`/`role` a11y
  attributes are preserved.

## Verification

- `pnpm test` — 32 core tests unaffected (they don't touch UI).
- `pnpm typecheck` and `pnpm build` clean; built manifest still has popup + options.
- Manual: load unpacked, eyeball Options + Popup in light and dark, confirm toggles/drag/import still work.
