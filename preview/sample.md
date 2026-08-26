# The Ember ramp

An OLED-first palette built on **true black** with warm, *Claude-inspired*
accents. Every grey is defined by its `contrast ratio` against `#000000`.

> Ratios are what the eye reads as crispness, so preserving them is what keeps
> a lifted theme from going muddy.

## Variants

| Theme | Canvas | Text ratio | For |
|---|---|---|---|
| Ember Black | `#000000` | 18.00:1 | OLED panels |
| Ember Ink | `#151616` | 12.17:1 | Long sessions |
| Ember Slate | `#1c1d1e` | 12.25:1 | LCD/IPS panels |

## Deriving a variant

1. Take the canvas level and the per-channel tint
2. Re-find every grey at the ratio it held against black
3. Scale the dim tokens in ~~gamma~~ linear-light space

```js
const scale = Math.min(level, 90);
const grey = tint.map((bias) => Math.round(level + bias * scale));
```

## Notes

- Hue is preserved; only luminance moves
- The accent `#d97757` sits well above the surface ceiling, so it is left alone
- ~~Hand-authored ramps~~ are gone — see [the build script](../tools/build-variants.mjs)

![Ember Black preview](../preview.png)

---

<!-- Ember Black is the single source of truth. Never hand-edit the siblings. -->

**Next:** run `npm run build`, then commit all three theme files.
