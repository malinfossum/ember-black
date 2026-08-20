/**
 * Rasterises icon.svg to icon.png.
 *
 * The VSIX manifest only accepts PNG, but hand-exported PNGs drift from the
 * vector they came from. This renders the same geometry the SVG describes —
 * rounded rectangles and filled bezier paths — with supersampled edges, and
 * writes the PNG with nothing but node:zlib.
 *
 * The path `d` strings below are copied verbatim from icon.svg. Keep them in
 * sync: the SVG is the artwork you edit and preview, this is the export step.
 *
 * Run: npm run build:icon
 */

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = join(root, "icon.png");

const SIZE = 256;
const SAMPLES = 4; // per axis
const CANVAS = "#000000";
const FLAME = "#d97757";
const CORE = "#e6d260";

/** Outer flame silhouette: leaning tip, concave shoulder on the left. */
const FLAME_PATH =
	"M 150 30 C 137 76 191 112 191 155 C 191 193 163 219 128 219 " +
	"C 93 219 65 193 65 155 C 65 111 130 84 150 30 Z";

/** Inner core, sitting low in the flame where it burns hottest. */
const CORE_PATH =
	"M 137 122 C 132 148 153 163 153 180 C 153 197 142 209 128 209 " +
	"C 114 209 103 197 103 180 C 103 158 128 147 137 122 Z";

/** Painted in order. Mirrors icon.svg. */
const SHAPES = [
	{ kind: "rect", x: 0, y: 0, w: 256, h: 256, r: 58, fill: CANVAS },
	{ kind: "path", d: FLAME_PATH, fill: FLAME },
	{ kind: "path", d: CORE_PATH, fill: CORE },
];

/** Radial ember glow, clipped to the tile, painted between tile and flame. */
const GLOW = {
	cx: 128,
	cy: 140,
	radius: 136,
	color: FLAME,
	stops: [
		[0, 0.24],
		[0.55, 0.08],
		[1, 0],
	],
};

// ---------------------------------------------------------------------------
// paths
// ---------------------------------------------------------------------------

const FLATTEN_STEPS = 24;

/**
 * Flattens an absolute M/C/Z path into a polygon.
 * Only the commands icon.svg actually uses are supported — this is an export
 * step for known artwork, not a general SVG engine.
 */
function flatten(d) {
	const tokens = d.trim().split(/[\s,]+/);
	const points = [];
	let cursor = [0, 0];
	let i = 0;

	const number = () => Number.parseFloat(tokens[i++]);

	while (i < tokens.length) {
		const command = tokens[i++];
		if (command === "M") {
			cursor = [number(), number()];
			points.push(cursor);
		} else if (command === "C") {
			const p1 = [number(), number()];
			const p2 = [number(), number()];
			const p3 = [number(), number()];
			const p0 = cursor;
			for (let s = 1; s <= FLATTEN_STEPS; s += 1) {
				const t = s / FLATTEN_STEPS;
				const u = 1 - t;
				points.push([
					u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
					u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
				]);
			}
			cursor = p3;
		} else if (command === "Z" || command === "z") {
			break;
		} else {
			throw new Error(`unsupported path command: ${command}`);
		}
	}
	return points;
}

function boundsOf(points) {
	const xs = points.map((p) => p[0]);
	const ys = points.map((p) => p[1]);
	return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** Crossing-number test. */
function inPolygon(px, py, points, bounds) {
	if (px < bounds[0] || py < bounds[1] || px > bounds[2] || py > bounds[3]) return false;
	let inside = false;
	for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
		const [xi, yi] = points[i];
		const [xj, yj] = points[j];
		if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}

function inRoundedRect(px, py, { x, y, w, h, r }) {
	if (px < x || py < y || px > x + w || py > y + h) return false;
	const dx = Math.max(x + r - px, 0, px - (x + w - r));
	const dy = Math.max(y + r - py, 0, py - (y + h - r));
	return dx * dx + dy * dy <= r * r;
}

// prepare geometry once
for (const shape of SHAPES) {
	if (shape.kind === "path") {
		shape.points = flatten(shape.d);
		shape.bounds = boundsOf(shape.points);
	}
}

const covers = (px, py, shape) =>
	shape.kind === "rect"
		? inRoundedRect(px, py, shape)
		: inPolygon(px, py, shape.points, shape.bounds);

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------

const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.substr(i, 2), 16));

function glowAlpha(px, py) {
	const t = Math.hypot(px - GLOW.cx, py - GLOW.cy) / GLOW.radius;
	if (t >= 1) return 0;
	const { stops } = GLOW;
	for (let i = 1; i < stops.length; i += 1) {
		const [t0, a0] = stops[i - 1];
		const [t1, a1] = stops[i];
		if (t <= t1) return a0 + ((a1 - a0) * (t - t0)) / (t1 - t0);
	}
	return 0;
}

const tile = SHAPES[0];
const glowColor = rgb(GLOW.color);
const fills = SHAPES.map((s) => rgb(s.fill));
const pixels = Buffer.alloc(SIZE * SIZE * 4);

for (let y = 0; y < SIZE; y += 1) {
	for (let x = 0; x < SIZE; x += 1) {
		let r = 0;
		let g = 0;
		let b = 0;
		let a = 0;

		for (let sy = 0; sy < SAMPLES; sy += 1) {
			for (let sx = 0; sx < SAMPLES; sx += 1) {
				const px = x + (sx + 0.5) / SAMPLES;
				const py = y + (sy + 0.5) / SAMPLES;

				let sr = 0;
				let sg = 0;
				let sb = 0;
				let sa = 0;

				SHAPES.forEach((shape, index) => {
					if (!covers(px, py, shape)) return;
					[sr, sg, sb] = fills[index];
					sa = 1;

					// the glow sits directly on the tile, under the flame
					if (shape === tile) {
						const ga = glowAlpha(px, py);
						if (ga > 0) {
							sr = sr * (1 - ga) + glowColor[0] * ga;
							sg = sg * (1 - ga) + glowColor[1] * ga;
							sb = sb * (1 - ga) + glowColor[2] * ga;
						}
					}
				});

				r += sr * sa;
				g += sg * sa;
				b += sb * sa;
				a += sa;
			}
		}

		const alpha = a / (SAMPLES * SAMPLES);
		const i = (y * SIZE + x) * 4;
		// un-premultiply so partially covered edge pixels keep their colour
		pixels[i] = a > 0 ? Math.round(r / a) : 0;
		pixels[i + 1] = a > 0 ? Math.round(g / a) : 0;
		pixels[i + 2] = a > 0 ? Math.round(b / a) : 0;
		pixels[i + 3] = Math.round(alpha * 255);
	}
}

// ---------------------------------------------------------------------------
// PNG container
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
	const table = new Int32Array(256);
	for (let n = 0; n < 256; n += 1) {
		let c = n;
		for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		table[n] = c;
	}
	return table;
})();

function crc32(buf) {
	let c = -1;
	for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
	return (c ^ -1) >>> 0;
}

function chunk(type, data) {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(body));
	return Buffer.concat([length, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // truecolour with alpha

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y += 1) {
	const at = y * (SIZE * 4 + 1);
	raw[at] = 0; // filter: none
	pixels.copy(raw, at + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

writeFileSync(
	TARGET,
	Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk("IHDR", ihdr),
		chunk("IDAT", deflateSync(raw, { level: 9 })),
		chunk("IEND", Buffer.alloc(0)),
	]),
);

console.log(`Built ${TARGET.replace(root, ".")}  ${SIZE}x${SIZE}, ${SAMPLES}x supersampled`);
