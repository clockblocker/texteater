import type { Ease } from "./ease";

const linear: Ease = (t) => t;

/**
 * How a channel's share of its delta follows its Move's one progress `p`:
 * 1 where the Move starts, 0 where it ends, so every channel starts from
 * what is shown and ends exactly at rest whatever its shape.
 *
 * - `follow`: the share is `1 − p`: the channel rides the progress itself.
 * - `span`: still until `from`, along the progress to nothing by `to`.
 * - `keys`: through waypoints (shares of the delta) at progress `times`,
 *   one ease per leg: a Trick's scripted path, or a dip and back.
 * - `step`: whole until `at`, nothing from then: a cut.
 */
export type Shape =
	| { readonly kind: "follow" }
	| {
			readonly kind: "span";
			readonly from: number;
			readonly to: number;
			readonly ease?: Ease;
	  }
	| {
			readonly kind: "keys";
			readonly keys: readonly number[];
			readonly times: readonly number[];
			readonly eases?: readonly Ease[];
	  }
	| { readonly kind: "step"; readonly at: number };

export const FOLLOW: Shape = { kind: "follow" };

export function span(from: number, to: number, ease?: Ease): Shape {
	if (from <= 0 && to >= 1 && !ease) return FOLLOW;
	return { kind: "span", from, to, ...(ease ? { ease } : {}) };
}

function keyed(
	keys: readonly number[],
	times: readonly number[],
	eases: readonly Ease[] | undefined,
	p: number,
): number {
	const last = keys.length - 1;
	if (last < 0) return 0;
	if (p <= (times[0] ?? 0)) return keys[0] ?? 0;
	for (let index = 0; index < last; index++) {
		const start = times[index] ?? 0;
		const end = times[index + 1] ?? 1;
		if (p >= end && index < last - 1) continue;
		const width = end - start;
		const local =
			width <= 0 ? 1 : Math.min(1, Math.max(0, (p - start) / width));
		const ease = eases?.[index] ?? linear;
		const from = keys[index] ?? 0;
		const to = keys[index + 1] ?? 0;
		return from + (to - from) * ease(local);
	}
	return keys[last] ?? 0;
}

/** The share of its delta a channel of `shape` shows at progress `p`, 0 to 1. */
export function shareAt(shape: Shape, p: number): number {
	if (p >= 1) return 0;
	switch (shape.kind) {
		case "follow":
			return 1 - Math.max(0, p);
		case "span": {
			if (p <= shape.from) return 1;
			if (p >= shape.to) return 0;
			const local = (p - shape.from) / (shape.to - shape.from);
			return 1 - (shape.ease ?? linear)(local);
		}
		case "keys":
			return keyed(shape.keys, shape.times, shape.eases, p);
		case "step":
			return p < shape.at ? 1 : 0;
	}
}

/** The share a channel of `shape` starts at. */
export function startOf(shape: Shape): number {
	return shareAt(shape, 0);
}
