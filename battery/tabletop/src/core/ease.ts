import { cubicBezier } from "motion";

/** A curve over a tween's linear time fraction, 0 to 1. */
export type Ease = (t: number) => number;

/**
 * pakastin's deck-of-cards easing curves by name, ported from `lib/ease.js`
 * of github.com/deck-of-cards/deck-of-cards at commit
 * 54f2c4787ea51bb43656e51a3bbbd524f248e21b (MIT, `LICENSE-deck-of-cards`).
 */
export const DECK_OF_CARDS_EASE = {
	linear: (t: number) => t,
	quadIn: (t: number) => t * t,
	quadOut: (t: number) => t * (2 - t),
	quadInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
	cubicIn: (t: number) => t * t * t,
	cubicOut: (t: number) => {
		const u = t - 1;
		return u * u * u + 1;
	},
	cubicInOut: (t: number) =>
		t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
	quartIn: (t: number) => t * t * t * t,
	quartOut: (t: number) => {
		const u = t - 1;
		return 1 - u * u * u * u;
	},
	quartInOut: (t: number) => {
		if (t < 0.5) return 8 * t * t * t * t;
		const u = t - 1;
		return 1 - 8 * u * u * u * u;
	},
	quintIn: (t: number) => t * t * t * t * t,
	quintOut: (t: number) => {
		const u = t - 1;
		return 1 + u * u * u * u * u;
	},
	quintInOut: (t: number) => {
		if (t < 0.5) return 16 * t * t * t * t * t;
		const u = t - 1;
		return 1 + 16 * u * u * u * u * u;
	},
} as const satisfies Record<string, Ease>;

/** The ease-out quint the reduced path's short tweens ride. */
export const EASE_OUT_QUINT: Ease = cubicBezier(0.23, 1, 0.32, 1);
