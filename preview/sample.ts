// contrast.ts — WCAG relative luminance for the Ember ramp

/** Which way a variant's greys lean off neutral. */
export type Cast = "cool" | "neutral" | "warm";

/** A variant is a canvas level and a per-channel bias. Everything else derives. */
export interface Variant {
	label: string;
	cast: Cast;
	level: number;
	tint: readonly [number, number, number];
}

const HEX = /^#([0-9a-f]{6})$/i;
const SRGB_KNEE = 0.03928;

export const VARIANTS: readonly Variant[] = [
	{ label: "Ember Black", cast: "neutral", level: 0, tint: [0, 0, 0] },
	{ label: "Ember Ink", cast: "cool", level: 22, tint: [-0.055, -0.02, 0] },
	{ label: "Ember Slate", cast: "cool", level: 30, tint: [-0.055, -0.02, 0] },
];

function toLinear(channel: number): number {
	const v = channel / 255;
	return v <= SRGB_KNEE ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of a `#rrggbb` colour, per WCAG 2.1. */
export function luminance(hex: string): number {
	const match = HEX.exec(hex);
	if (!match) throw new Error(`Not a hex colour: ${hex}`);

	const [r, g, b] = [0, 2, 4].map((i) => toLinear(Number.parseInt(match[1].slice(i, i + 2), 16)));
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio — 1:1 for identical colours, 21:1 for black on white. */
export function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/** The tinted grey `level`, cast capped so the bias stays a whisper at the light end. */
export function grey({ level, tint }: Variant, at = level): readonly number[] {
	const scale = Math.min(at, 90);
	return tint.map((bias) => Math.round(at + bias * scale));
}

const ink = VARIANTS[1];
const ratio = contrast("#d1d4d6", "#151616");

console.log(`${ink.label} — canvas ${grey(ink).join(", ")}, text ${ratio.toFixed(2)}:1`);
