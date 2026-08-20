/**
 * Builds "Ember Ash" from "Ember Black".
 *
 * Ember Black is the single source of truth. This script derives the lighter
 * sibling so 539 colour keys never have to be maintained twice.
 *
 * Two transforms, each doing the job the other cannot:
 *
 * 1. RAMP — a hand-authored map over the `colors` block. Backgrounds, chrome and
 *    borders are about *layering*, not contrast, so the relative order of the
 *    surfaces is chosen by eye and stated explicitly.
 *
 * 2. Contrast preservation — applied to `tokenColors` and `semanticTokenColors`.
 *    Ember Black's dim tokens (comments, delimiters) are calibrated against
 *    #000000. On a lifted base they fall below their intended contrast, so each
 *    one is scaled in linear-light space until its ratio against the new canvas
 *    matches its original ratio against black. Hue is preserved; only luminance
 *    moves. Tokens already at or above their original ratio are left alone.
 *
 * Run: npm run build:ash
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(root, "themes", "ember-black-color-theme.json");
const TARGET = join(root, "themes", "ember-ash-color-theme.json");

/** The canvas colour of Ember Black, and of Ember Ash. */
const OLD_CANVAS = "#000000";
const NEW_CANVAS = "#1f1e1d";

/** No token is lifted past this ratio — see liftToken(). */
const LEGIBILITY_FLOOR = 4.5;

/**
 * Neutral and warm-dark surfaces, old -> new.
 *
 * Covers every neutral present in the source `colors` block. Hue sits around
 * 35-40 degrees at low saturation, so the greys read warm rather than blue.
 * The light end barely moves — it is already at the top of the range.
 */
const RAMP = {
	"#000000": NEW_CANVAS, // editor canvas, gutter, terminal, active tab
	"#0a0a0a": "#272522", // status bar, title bar, inactive tabs, panels
	"#0d0d0d": "#2b2926", // sidebar, activity bar, widgets, dropdowns
	"#151515": "#302e2a", // line highlight, list hover
	"#1a1a1a": "#35322e",
	"#2a2a2a": "#423e39",
	"#3a3a3a": "#524d46", // borders, scrollbar slider
	"#4a4a4a": "#6b655d", // line numbers, structural punctuation
	"#6a6a6a": "#8a8378",
	"#8a8a8a": "#a49c90",
	"#a0a0a0": "#b8b0a3",
	"#f0f0f0": "#f2f0ec", // primary foreground, warmed a touch
	"#f5f5f5": "#f7f5f1",
	"#ffffff": "#ffffff",
	"#1a1010": "#2e2724", // warm dark surface
	"#2a1a12": "#402c1f", // active selection
	"#3a1a1a": "#4d2b26", // error background
	"#3a2a1a": "#4d3a26", // warning background
	"#152838": "#24384a", // info background
};

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

function luminance(hex) {
	const [r, g, b] = channels(hex).map(toLinear);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

function toHex([r, g, b]) {
	return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Scales `hex` in linear-light space until it hits `targetRatio` against
 * `NEW_CANVAS`. Uniform scaling keeps the hue; only lightness changes.
 * Returns the original when it is already bright enough or already clipping.
 */
function preserveContrast(hex, targetRatio) {
	if (contrast(hex, NEW_CANVAS) >= targetRatio) return hex;

	const needed = targetRatio * (luminance(NEW_CANVAS) + 0.05) - 0.05;
	const current = luminance(hex);
	if (current <= 0) return hex;

	const linear = channels(hex).map(toLinear);
	const scale = needed / current;
	return toHex(linear.map((c) => fromLinear(c * scale)));
}

// ---------------------------------------------------------------------------
// transforms
// ---------------------------------------------------------------------------

const stats = { ramped: 0, lifted: 0, untouched: 0 };

/** Applies the RAMP map, preserving any alpha suffix. */
function rampColor(value) {
	const parts = splitHex(value);
	if (!parts) return value;
	const mapped = RAMP[parts.base];
	if (!mapped) {
		stats.untouched += 1;
		return value;
	}
	stats.ramped += 1;
	return mapped + parts.alpha;
}

/**
 * Lifts a token colour only when the raised canvas costs it real legibility.
 *
 * The target is the token's original ratio against black, capped at LEGIBILITY_FLOOR.
 * That cap is the whole point: the saturated mid-tones are the identity of this
 * palette, and chasing their original double-digit ratios would drag them toward
 * white. They comfortably clear the floor on the Ash canvas already, so they are
 * emitted byte-for-byte unchanged. Only the deliberately dim furniture — comments,
 * delimiters, bracket greys — gets moved, and only back to where it was.
 */
function liftToken(value) {
	const parts = splitHex(value);
	if (!parts) return value;

	// A grey that already has a ramp entry uses it, so the same grey means the
	// same thing in the gutter and in the code. Scaling it instead would leave a
	// cold grey sitting on a warm canvas.
	const ramped = RAMP[parts.base];
	if (ramped) {
		stats.lifted += 1;
		return ramped + parts.alpha;
	}

	const target = Math.min(contrast(parts.base, OLD_CANVAS), LEGIBILITY_FLOOR);
	const lifted = preserveContrast(parts.base, target);
	if (lifted === parts.base) {
		stats.untouched += 1;
		return value;
	}
	stats.lifted += 1;
	return lifted + parts.alpha;
}

/** Token settings are either a bare hex string or { foreground, ... }. */
function liftSetting(setting) {
	if (typeof setting === "string") return liftToken(setting);
	if (setting && typeof setting === "object" && setting.foreground) {
		return { ...setting, foreground: liftToken(setting.foreground) };
	}
	return setting;
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

const source = JSON.parse(readFileSync(SOURCE, "utf8"));

const ash = {
	...source,
	name: "Ember Ash",
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

writeFileSync(TARGET, `${JSON.stringify(ash, null, "\t")}\n`);

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------

console.log(`Built ${TARGET.replace(root, ".")}`);
console.log(`  canvas   ${OLD_CANVAS} -> ${NEW_CANVAS}`);
console.log(`  ramped   ${stats.ramped} surface values`);
console.log(`  lifted   ${stats.lifted} token values to hold their contrast`);
console.log(`  untouched ${stats.untouched} values already correct`);

const checks = [
	["foreground", ash.colors["editor.foreground"]],
	["line numbers", ash.colors["editorLineNumber.foreground"]],
	["borders", ash.colors["panel.border"]],
];

console.log("\ncontrast against the Ash canvas:");
for (const [label, value] of checks) {
	const parts = splitHex(value);
	if (parts) console.log(`  ${label.padEnd(14)} ${parts.base}  ${contrast(parts.base, NEW_CANVAS).toFixed(2)}:1`);
}
