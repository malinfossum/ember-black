# Changelog

## 1.4.0 — 2026-04-21

- Move curly braces `{}` to teal `#3fc9a7` so the three bracket families are now distinct: `()` orange, `{}` teal, `[]` gold

## 1.3.0 — 2026-04-21

- Add `semanticTokenColors` so language servers (TypeScript, Python, Rust, Go, C#) drive richer highlighting than regex-based scopes alone — `let` vs `const`, parameter italics, default-library identifiers, deprecated strikethrough, and more
- Lift `editor.lineHighlightBackground` from `#0a0a0a` to `#151515` so the active line is actually visible on OLED black
- Add language coverage for Python (decorators, docstrings, `self`/`cls`, builtins, exceptions), Go (package/import keywords, raw strings), Rust (lifetimes, macros, attributes, `self`)
- Add language coverage for YAML (keys, anchors, sequence bullets, booleans), Shell (variables, builtins, escapes), Dockerfile, SQL, TOML
- Add diff styling (added / deleted / changed / hunk headers / range markers)

## 1.2.0 — 2026-04-21

- Split square brackets `[]` to gold so they no longer blend with curly `{}` in nested structures like `[{ a: 1 }]`
- Markdown: style `>` blockquote markers and `-`/`*` list bullets in warm accent so structure is readable
- Markdown: mute emphasis markers (`**`, `_`), inline-code backticks, and link punctuation so content leads
- Markdown: distinct styling for link URLs (sky blue italic), fenced-code language tag (dim), strikethrough, and horizontal rules
- Nudge `editorWatermark.foreground` up to `#4a4a4a` so empty-editor shortcut labels are more legible

## 1.1.0 — 2026-04-21

- Color curly and square brackets with the warm accent so they no longer blend with text
- Color operators (`=`, `+`, `!`, `?`, etc.) purple to match keyword class
- Mute separators (`,` `;` `.`) so structure reads first, noise second
- Distinct colors for object property keys, `this` / `super`, booleans, regex, template `${...}`, and decorators
- Set `editorWatermark.foreground` so the empty-editor logo and shortcut labels are visible on OLED black

## 1.0.0 — 2026-04-21

Initial release.
