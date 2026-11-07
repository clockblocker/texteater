/* `src/lib/helpers/Math.js`. */

/** `value` rounded to `precision` decimal places. */
export const round = (value: number, precision = 3): number =>
	Number.parseFloat(value.toFixed(precision));

/** `value` limited between `min` and `max`. */
export const clamp = (value: number, min = 0, max = 100): number =>
	Math.min(Math.max(value, min), max);

/** `value` re-mapped from `fromMin`..`fromMax` onto `toMin`..`toMax`, rounded. */
export const adjust = (
	value: number,
	fromMin: number,
	fromMax: number,
	toMin: number,
	toMax: number,
): number =>
	round(toMin + ((toMax - toMin) * (value - fromMin)) / (fromMax - fromMin));
