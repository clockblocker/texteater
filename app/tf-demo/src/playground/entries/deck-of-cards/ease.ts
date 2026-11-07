/** Easing curves by name, from `lib/ease.js`; `animateTo` takes the name. */
export const ease = {
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
};

export type EaseName = keyof typeof ease;
