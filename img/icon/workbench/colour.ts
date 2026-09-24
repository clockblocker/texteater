/**
 * Colour for icon variants: OKLCH in, sRGB hex out, so variants can pick
 * perceptually even ramps and still write plain `fill="#rrggbb"`.
 */

/** OKLCH (lightness 0–1, chroma, hue in degrees) as sRGB hex, clamped. */
export function oklch(l: number, c: number, h: number): string {
	const radians = (h * Math.PI) / 180;
	const a = c * Math.cos(radians);
	const b = c * Math.sin(radians);
	const long = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const medium = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const short = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
	const linear = [
		4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
		-1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
		-0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
	];
	return `#${linear
		.map((channel) => {
			const clamped = Math.min(1, Math.max(0, channel));
			const encoded =
				clamped <= 0.0031308
					? 12.92 * clamped
					: 1.055 * clamped ** (1 / 2.4) - 0.055;
			return Math.round(encoded * 255)
				.toString(16)
				.padStart(2, "0");
		})
		.join("")}`;
}

/**
 * The product palette from `battery/lego/src/styles.css` (dark theme).
 * Blue means a Unit the dictionary knows; ink shades are text.
 */
export const PRODUCT = {
	canvas: oklch(0.212, 0.016, 256.8),
	paper: oklch(0.246, 0.015, 256.8),
	raised: oklch(0.318, 0.031, 256.3),
	scrim: oklch(0.134, 0.01, 260.6),
	ink: oklch(0.921, 0.006, 255.5),
	inkSoft: oklch(0.736, 0.016, 257.2),
	inkMuted: oklch(0.666, 0.021, 255.6),
	inkFaint: oklch(0.512, 0.023, 260.1),
	line: oklch(0.362, 0.018, 258.4),
	blue600: oklch(0.72, 0.075, 257),
	blue500: oklch(0.82, 0.08, 257),
	blue400: oklch(0.88, 0.05, 257),
	amber500: oklch(0.76, 0.09, 80),
	red500: oklch(0.71, 0.13, 22),
	rose500: oklch(0.82, 0.08, 17),
	violet500: oklch(0.82, 0.08, 305),
	green500: oklch(0.82, 0.08, 142),
} as const;

/** The shipped icon's colours. */
export const SHIPPED = {
	ground: "#000000",
	page: "#FFFFFF",
	ink: "#1E1613",
	processed: "#0D385B",
	unknown: "#071E2E",
} as const;
