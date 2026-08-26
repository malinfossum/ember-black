# Changelog

## 1.6.0 — 2026-08-26

- Fix `.vue`, `.svelte`, C#, Java, and PHP rendering as near-plain white text with `editor.bracketPairColorization.enabled` set to `false` — brackets and punctuation were only colored under the scope names JS/TS/CSS grammars use, so every other grammar fell through to `editor.foreground`
- Add a fallback tier on the root TextMate scopes (`punctuation`, `entity.name`, `entity.other`, `constant`, `storage`, `support`) so a language the theme has never heard of gets the full palette instead of white; the specific rules still win
- Map the bracket and punctuation names used by C#, Java, and PHP onto the existing families — `()` orange, `{}` teal, `[]` gold, generics `<>` teal
- Add Vue template coverage — `{{ }}` interpolation and the `:prop` / `@click` / `#slot` shorthand — plus Svelte block punctuation and the PHP ` sigil
- Add `semanticTokenColors` for language-server token types that ship no scope mapping: Pylance's `parenthesis`, `bracket`, `curlybrace`, `module`, and `intrinsic` (all previously white in Python), and the Roslyn C# set (`controlKeyword`, `field`, `constant`, `delegate`, `recordClass`, `recordStruct`, `extensionMethod`, `operatorOverloaded`, `stringVerbatim`, `stringEscapeCharacter`)
- Color `variable.other.constant` green so TextMate agrees with the `variable.readonly` already in `semanticTokenColors`
- Document what the recommended setting actually does, and add a **Language coverage** section to the README
- Reshoot every screenshot: the hero is now a Vue single-file component, the three variant shots are C#, and a Python shot is added to the README
- Add preview samples for C#, Vue, Python, and Markdown (`preview/sample.cs`, `sample.vue`, `VariantCard.vue`, `sample.py`, `sample.md`)

## 1.5.0 — 2026-08-21

- Add **Ember Ink** (`#151616`) and **Ember Slate** (`#1c1d1e`), two cool dark siblings for when true black is too stark for a long session — same syntax palette, canvas lifted off black with a blue-grey cast on the greys
- Derive both from Ember Black at build time (`npm run build`) so the three themes cannot drift; Ember Black stays the single source of truth
- Derive the neutral ramp from contrast ratios instead of a hand-authored map: every grey is re-found on the new canvas at the ratio it held against black, so a lifted canvas costs no crispness
- Lift the tinted surfaces (selection, error, warning, info) and the deliberately dim tokens (comments, delimiters, bracket greys) so they hold their separation on a lifted canvas
- Drop the chrome *below* the editor in Ink and Slate — sidebar, status bar, tabs, and title bar sit darker than the code rather than framing it
- New extension icon — interlocking ember and teal forms around a lit gold core

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
