/**
 * Rasterises icon.svg to icon.png.
 *
 * The VSIX manifest only accepts PNG, but hand-exported PNGs drift from the
 * vector they came from. This renders the same geometry the SVG describes —
 * rounded rectangles and one radial gradient — with 4x supersampling for the
 * edges, and writes the PNG with nothing but node:zlib.
 *
 * Keep the shape table below in sync with icon.svg. The SVG stays the artwork
 * you edit and preview; this is the export step.
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
const INK = "#f2f0ec";
const EMBER = "#d97757";

/**
 * Rounded rectangles, painted in order. Mirrors icon.svg.
 *
 * The ember arm is painted *before* the spine so the spine covers its left cap.
 * Drawn the other way round, the round cap bites a notch out of the spine; this
 * way the accent reads as growing out of the letterform.
 */
const SHAPES = [
	{ x: 0, y: 0, w: 256, h: 256, r: 58, fill: CANVAS }, // tile
	{ x: 56, y: 115, w: 102, h: 26, r: 13, fill: EMBER }, // the ember
	{ x: 56, y: 56, w: 26, h: 144, r: 13, fill: INK }, // spine
	{ x: 56, y: 56, w: 144, h: 26, r: 13, fill: INK }, // top arm
	{ x: 56, y: 174, w: 144, h: 26, r: 13, fill: INK }, // bottom arm
];

/** Radial ember glow, clipped to the tile, painted between tile and letterform. */
const GLOW = {
	cx: 128,
	cy: 133,
	radius: 133,
	color: EMBER,
	stops: [
		[0, 0.22],
		[0.55, 0.07],
		[1, 0],
	],
};

// ---------------------------------------------------------------------------
// geometry
// ---------------------------------------------------------------------------

const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.substr(i, 2), 16));

function inRoundedRect(px, py, { x, y, w, h, r }) {
	if (px < x || py < y || px > x + w || py > y + h) return false;
	const dx = Math.max(x + r - px, 0, px - (x + w - r));
	const dy = Math.max(y + r - py, 0, py - (y + h - r));
	return dx * dx + dy * dy <= r * r;
}

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

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------

const tile = SHAPES[0];
const glowColor = rgb(GLOW.color);
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

				// start transparent, then composite source-over
				let sr = 0;
				let sg = 0;
				let sb = 0;
				let sa = 0;

				for (const shape of SHAPES) {
					if (!inRoundedRect(px, py, shape)) continue;
					const [cr, cg, cb] = rgb(shape.fill);
					sr = cr;
					sg = cg;
					sb = cb;
					sa = 1;

					// the glow sits directly on the tile, under the letterform
					if (shape === tile) {
						const ga = glowAlpha(px, py);
						if (ga > 0) {
							sr = sr * (1 - ga) + glowColor[0] * ga;
							sg = sg * (1 - ga) + glowColor[1] * ga;
							sb = sb * (1 - ga) + glowColor[2] * ga;
						}
					}
				}

				r += sr * sa;
				g += sg * sa;
				b += sb * sa;
				a += sa;
			}
		}

		const total = SAMPLES * SAMPLES;
		const alpha = a / total;
		const i = (y * SIZE + x) * 4;
		// un-premultiply so partially covered edge pixels keep their colour
		pixels[i] = alpha > 0 ? Math.round(r / a) : 0;
		pixels[i + 1] = alpha > 0 ? Math.round(g / a) : 0;
		pixels[i + 2] = alpha > 0 ? Math.round(b / a) : 0;
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
// 10..12 stay zero: deflate, adaptive filtering, no interlace

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
