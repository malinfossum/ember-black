/**
 * Builds the lifted siblings of "Ember Black".
 *
 * Ember Black is the single source of truth. This script derives each variant so
 * 539 colour keys never have to be maintained twice.
 *
 * The whole design is two numbers per variant: how far off black the canvas
 * sits, and which way the greys lean. Everything else is derived.
 *
 * 1. NEUTRALS — every grey in Ember Black is defined by its contrast ratio
 *    against #000000. Each one is re-found on the variant's own canvas at that
 *    same ratio, in the variant's own tint. Ratios are what the eye reads as
 *    "crispness", so preserving them is what keeps a lifted theme from going
 *    muddy. The only exceptions are stated in SURFACES below.
 *
 * 2. TOKENS — the saturated syntax colours are untinted and mostly untouched.
 *    Ember Black's deliberately dim tokens (comments, delimiters) are calibrated
 *    against #000000, so on a lifted base they are scaled in linear-light space
 *    until their ratio against the new canvas matches. Hue is preserved; only
 *    luminance moves.
 *
 * Run: npm run build
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(root, "themes", "ember-black-color-theme.json");

/** The canvas Ember Black's greys are calibrated against. */
const OLD_CANVAS = "#000000";

/**
 * The variants.
 *
 * `level` is the canvas as a plain 0-255 grey before tinting — the one knob for
 * "how far off black". `tint` biases each channel by a fraction of the grey,
 * capped at level 90 so the cast stays a whisper at the light end instead of
 * turning the foreground into paper. A negative red and a flat blue read cool.
 */
const VARIANTS = [
	{
		label: "Ember Ink",
		file: "ember-ink-color-theme.json",
		level: 22,
		tint: [-0.055, -0.02, 0],
	},
	{
		label: "Ember Slate",
		file: "ember-slate-color-theme.json",
		level: 30,
		tint: [-0.055, -0.02, 0],
	},
];

/**
 * Surfaces that sit *below* the canvas rather than above it.
 *
 * Layering is a design choice, not a contrast problem, so these two are the one
 * place the ramp is stated by hand. Ember Black lifts its chrome above a black
 * editor; the variants drop it below instead, so the eye settles on the code
 * rather than on a frame glowing around it. That is the Claude Code stack.
 */
const SURFACES = {
	"#0a0a0a": -6, // status bar, title bar, inactive tabs, panels
	"#0d0d0d": -6, // sidebar, activity bar, widgets, dropdowns
};

/** Ember Black's foreground is 18:1 on black, which no lifted canvas can reach. */
const MAX_TEXT_RATIO = 12.2;

/** No token is lifted past this ratio — see liftToken(). */
const LEGIBILITY_FLOOR = 4.5;

/**
 * Below this ratio against black, a colour is a *surface* rather than an accent.
 *
 * The tinted backgrounds — selection, error, warning, info, the warm panel —
 * are not greys, so the ramp does not cover them, but they are still calibrated
 * against a black canvas and vanish on a lifted one. They get the same
 * ratio-preserving lift the dim tokens do. Real accents (#d97757 and the syntax
 * hues) sit well above this line and are left alone.
 */
const SURFACE_CEILING = 2;

// ---------------------------------------------------------------------------
// colour helpers
// ---------------------------------------------------------------------------

const HEX = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/;

/** Splits "#rrggbbaa" into its 6-digit base and optional alpha suffix. */
function splitHex(value) {
	if (typeof value !== "string") return null;
	const match = HEX.exec(value);
	if (!match) return null;
	return { base: `#${match[1].toLowerCase()}`, alpha: match[2] ?? "" };
}

function toLinear(channel) {
	const v = channel / 255;
	return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function fromLinear(value) {
	const clamped = Math.min(1, Math.max(0, value));
	const v = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
	return Math.round(v * 255);
}

function channels(hex) {
	return [1, 3, 5].map((i) => Number.parseInt(hex.substr(i, 2), 16));
}

function luminance(rgb) {
	const [r, g, b] = rgb.map(toLinear);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

function toHex(rgb) {
	return `#${rgb.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("")}`;
}

/** A plain grey `level`, pushed toward the variant's cast. */
function tinted(level, tint) {
	const scale = Math.min(level, 90);
	return tint.map((bias) => Math.max(0, Math.min(255, Math.round(level + bias * scale))));
}

/**
 * The tinted grey whose contrast against `canvas` is closest to `target`.
 * Searches only at or above the canvas — anything below it is a surface, and
 * surfaces are placed by SURFACES rather than by ratio.
 */
function greyAtRatio(target, canvas, variant) {
	let best = null;
	for (let level = variant.level; level <= 255; level += 1) {
		const rgb = tinted(level, variant.tint);
		const delta = Math.abs(contrast(rgb, canvas) - target);
		if (best === null || delta < best.delta) best = { delta, rgb };
	}
	return best.rgb;
}

/**
 * Scales `hex` in linear-light space until it hits `targetRatio` against the
 * canvas. Uniform scaling keeps the hue; only lightness changes. Returns the
 * original when it is already bright enough or already clipping.
 */
function preserveContrast(hex, targetRatio, canvas) {
	const rgb = channels(hex);
	if (contrast(rgb, canvas) >= targetRatio) return hex;

	const needed = targetRatio * (luminance(canvas) + 0.05) - 0.05;
	const current = luminance(rgb);
	if (current <= 0) return hex;

	const scale = needed / current;
	return toHex(rgb.map((c) => fromLinear(toLinear(c) * scale)));
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

/** Every neutral in Ember Black, mapped to its counterpart in this variant. */
function buildRamp(variant) {
	const canvas = tinted(variant.level, variant.tint);
	const ramp = { [OLD_CANVAS]: toHex(canvas), "#ffffff": "#ffffff" };

	for (const [hex, offset] of Object.entries(SURFACES)) {
		ramp[hex] = toHex(tinted(Math.max(0, variant.level + offset), variant.tint));
	}

	for (const hex of NEUTRALS) {
		if (ramp[hex]) continue;
		const intent = Math.min(contrast(channels(hex), channels(OLD_CANVAS)), MAX_TEXT_RATIO);
		ramp[hex] = toHex(greyAtRatio(intent, canvas, variant));
	}
	return { canvas: toHex(canvas), ramp };
}

/** Reads the grey scale straight out of the source theme. */
function collectNeutrals(theme) {
	const seen = new Set();
	const walk = (value) => {
		if (typeof value === "string") {
			const parts = splitHex(value);
			if (!parts) return;
			const [r, g, b] = channels(parts.base);
			// A neutral is a grey: all three channels within a hair of each other.
			if (Math.max(r, g, b) - Math.min(r, g, b) <= 2) seen.add(parts.base);
			return;
		}
		if (value && typeof value === "object") Object.values(value).forEach(walk);
	};
	walk(theme);
	return [...seen];
}

const source = JSON.parse(readFileSync(SOURCE, "utf8"));
const NEUTRALS = collectNeutrals(source);

for (const variant of VARIANTS) {
	const { canvas, ramp } = buildRamp(variant);
	const canvasRgb = channels(canvas);
	const stats = { ramped: 0, lifted: 0, untouched: 0 };

	/** Applies the ramp, preserving any alpha suffix. */
	const rampColor = (value) => {
		const parts = splitHex(value);
		if (!parts) return value;
		const mapped = ramp[parts.base];
		if (mapped) {
			stats.ramped += 1;
			return mapped + parts.alpha;
		}

		const onBlack = contrast(channels(parts.base), channels(OLD_CANVAS));
		if (onBlack < SURFACE_CEILING) {
			const lifted = preserveContrast(parts.base, onBlack, canvasRgb);
			if (lifted !== parts.base) {
				stats.ramped += 1;
				return lifted + parts.alpha;
			}
		}

		stats.untouched += 1;
		return value;
	};

	/**
	 * Lifts a token colour only when the raised canvas costs it real legibility.
	 *
	 * The target is the token's original ratio against black, capped at
	 * LEGIBILITY_FLOOR. That cap is the point: the saturated mid-tones are the
	 * identity of this palette, and chasing their original double-digit ratios
	 * would drag them toward white. They clear the floor on a lifted canvas
	 * already, so they are emitted byte-for-byte unchanged. Only the deliberately
	 * dim furniture moves, and only back to where it was.
	 */
	const liftToken = (value) => {
		const parts = splitHex(value);
		if (!parts) return value;

		// A grey that has a ramp entry uses it, so the same grey means the same
		// thing in the gutter and in the code.
		const mapped = ramp[parts.base];
		if (mapped) {
			stats.lifted += 1;
			return mapped + parts.alpha;
		}

		const target = Math.min(
			contrast(channels(parts.base), channels(OLD_CANVAS)),
			LEGIBILITY_FLOOR,
		);
		const lifted = preserveContrast(parts.base, target, canvasRgb);
		if (lifted === parts.base) {
			stats.untouched += 1;
			return value;
		}
		stats.lifted += 1;
		return lifted + parts.alpha;
	};

	const liftSetting = (setting) => {
		if (typeof setting === "string") return liftToken(setting);
		if (setting && typeof setting === "object" && setting.foreground) {
			return { ...setting, foreground: liftToken(setting.foreground) };
		}
		return setting;
	};

	const built = {
		...source,
		name: variant.label,
		colors: Object.fromEntries(
			Object.entries(source.colors).map(([key, value]) => [key, rampColor(value)]),
		),
		semanticTokenColors: Object.fromEntries(
			Object.entries(source.semanticTokenColors ?? {}).map(([key, value]) => [
				key,
				liftSetting(value),
			]),
		),
		tokenColors: (source.tokenColors ?? []).map((rule) => ({
			...rule,
			settings: rule.settings?.foreground
				? { ...rule.settings, foreground: liftToken(rule.settings.foreground) }
				: rule.settings,
		})),
	};

	const target = join(root, "themes", variant.file);
	writeFileSync(target, `${JSON.stringify(built, null, "\t")}\n`);

	// -------------------------------------------------------------------------
	// report
	// -------------------------------------------------------------------------

	console.log(`\n${variant.label}  ->  themes/${variant.file}`);
	console.log(`  canvas    ${OLD_CANVAS} -> ${canvas}`);
	console.log(`  ramped    ${stats.ramped} surface values`);
	console.log(`  lifted    ${stats.lifted} token values to hold their contrast`);
	console.log(`  untouched ${stats.untouched} values already correct`);

	const checks = [
		["chrome", built.colors["sideBar.background"]],
		["line highlight", built.colors["editor.lineHighlightBackground"]],
		["borders", built.colors["panel.border"]],
		["line numbers", built.colors["editorLineNumber.foreground"]],
		["foreground", built.colors["editor.foreground"]],
	];
	for (const [label, value] of checks) {
		const parts = splitHex(value);
		if (!parts) continue;
		const ratio = contrast(channels(parts.base), canvasRgb).toFixed(2);
		console.log(`  ${label.padEnd(15)} ${parts.base}  ${ratio}:1`);
	}
}
