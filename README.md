# Ember Black

An OLED-first VS Code theme built on true black with warm, Claude-inspired accents.

![Ember Black preview](./preview.png)

## Two themes

| Theme | Canvas | For |
|---|---|---|
| **Ember Black** | `#000000` | OLED panels, where true black means the pixel is off |
| **Ember Ash** | `#1f1e1d` | LCD/IPS panels, bright rooms, or anyone who finds true black too stark |

Both share one syntax palette. Ember Ash raises the canvas and warms the greys;
the saturated token colors are byte-for-byte identical, and the dim tokens are
lifted just enough to hold the contrast they had on black.

## Design

- **True-black editor** (`#000000`) — designed for OLED displays
- **Layered chrome** — sidebar, status bar, tabs, and title bar lift with near-black greys (`#0a0a0a`, `#0d0d0d`) for visual separation without breaking the OLED benefit
- **Warm accent** — `#d97757` orange on focus borders, buttons, cursor, text links, active tab top border, and function parentheses
- **Saturated syntax palette** — a distinct mid-tone hue per token category (purple keywords, blue tags, terracotta strings, gold functions, sky variables, green numbers, teal types) for fast visual sorting

## Install

1. Download the latest `ember-black-<version>.vsix` from [Releases](https://github.com/malinfossum/ember-black/releases)
2. In VS Code, open the Extensions view
3. Click the `⋯` menu in the top-right → **Install from VSIX...**
4. Select the downloaded file
5. Open the command palette (`Ctrl+Shift+P`) → **Preferences: Color Theme** → pick **Ember Black** or **Ember Ash**

## Recommended setting

Add this to your `settings.json` so the custom bracket colors apply:

```json
"editor.bracketPairColorization.enabled": false
```

## Development

Ember Black is the source of truth. Ember Ash is generated from it:

```
npm run build
```

Edit `themes/ember-black-color-theme.json`, re-run the build, and commit both theme files.
Never hand-edit `themes/ember-ash-color-theme.json` — it is overwritten.

`icon.png` is hand-made artwork, not generated. Nothing in the build touches it.

## License

MIT
