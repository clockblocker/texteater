/**
 * ANIMATION WORKBENCH — the deterministic core.
 *
 * Nothing here knows about React or the DOM. A move is a pair of open Card
 * indices; a variant is a pure function from (move, time, params, layout) to
 * the geometry of every Card. Playback, scrubbing and frame stepping all
 * call that one function with a different `t`, so they cannot disagree.
 *
 * The clock only owns time. Durations, accents and spring response are
 * parameters of the calculation, so a parameter change re-evaluates the
 * frozen frame in place.
 */

/* --------------------------------------------------------------- layout */

export const PILE_REM = 22;
export const HEADER_REM = 2.5;

export type Layout = {
	readonly count: number;
	/** Root font size in px; every geometry below is in px. */
	readonly px: number;
	readonly header: number;
	/** The open Card's full height. */
	readonly card: number;
	/** The part of the open Card below its header. */
	readonly body: number;
};

export function layoutFor(count: number, px: number): Layout {
	const header = HEADER_REM * px;
	const card = (PILE_REM - (Math.max(1, count) - 1) * HEADER_REM) * px;
	return { count, px, header, card, body: card - header };
}

/* --------------------------------------------------------------- params */

export type Params = {
	/** The tap pulse's length, in ms. */
	readonly duration: number;
	/** How much the tap pulse shows, 0 to 1. */
	readonly accent: number;
	/** The physical spring the drag ghost settles on, as Motion takes it. */
	readonly stiffness: number;
	readonly damping: number;
};

export const DEFAULT_PARAMS: Params = {
	duration: 420,
	accent: 1,
	stiffness: 520,
	damping: 42,
};

/* --------------------------------------------------------------- easing */

export function clamp01(value: number): number {
	return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function easeOut(p: number): number {
	const x = clamp01(p);
	return 1 - (1 - x) ** 3;
}

/* --------------------------------------------------- browser curves */

/**
 * A CSS `cubic-bezier(x1, y1, x2, y2)` as a function of progress, solved
 * by bisection to a millionth. This is what every `transition`,
 * `animation` and Motion tween in the app runs on.
 */
export function cubicBezier(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
): (p: number) => number {
	const at = (a: number, b: number, t: number) =>
		3 * a * (1 - t) * (1 - t) * t + 3 * b * (1 - t) * t * t + t * t * t;
	return (p) => {
		const x = clamp01(p);
		if (x <= 0) return 0;
		if (x >= 1) return 1;
		let low = 0;
		let high = 1;
		let t = x;
		for (let i = 0; i < 40; i += 1) {
			const guess = at(x1, x2, t);
			if (Math.abs(guess - x) < 1e-6) break;
			if (guess < x) low = t;
			else high = t;
			t = (low + high) / 2;
		}
		return at(y1, y2, t);
	};
}

/** The browser's named timing functions. */
export const CSS_EASE = cubicBezier(0.25, 0.1, 0.25, 1);
/** Tailwind's `ease-in`, `ease-out`, `ease-in-out` and its transition default. */
export const TW_EASE_IN = cubicBezier(0.4, 0, 1, 1);
export const TW_EASE_OUT = cubicBezier(0, 0, 0.2, 1);
export const TW_EASE_IN_OUT = cubicBezier(0.4, 0, 0.2, 1);
/** Motion's named tween easings ("easeIn", "easeOut", "easeInOut"). */
export const MOTION_EASE_IN = cubicBezier(0.42, 0, 1, 1);
export const MOTION_EASE_OUT = cubicBezier(0, 0, 0.58, 1);
export const MOTION_EASE_IN_OUT = cubicBezier(0.42, 0, 0.58, 1);

export type SpringSpec = {
	readonly stiffness: number;
	readonly damping: number;
	readonly mass?: number;
	/** Initial velocity, in units per second, positive toward the target. */
	readonly velocity?: number;
};

/**
 * Motion's spring, closed form: the position at `ms` of a unit travelling
 * from 0 to 1, exactly as `animate(value, target, { type: "spring" })`
 * resolves it. Scale the result by the real travel.
 */
export function springAt(ms: number, spec: SpringSpec): number {
	const mass = spec.mass ?? 1;
	const t = Math.max(0, ms);
	const zeta = spec.damping / (2 * Math.sqrt(spec.stiffness * mass));
	const omega0 = Math.sqrt(spec.stiffness / mass) / 1000;
	const delta = 1;
	const v0 = spec.velocity ? -(spec.velocity / 1000) : 0;
	if (zeta < 1) {
		const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
		const envelope = Math.exp(-zeta * omega0 * t);
		return (
			1 -
			envelope *
				(((v0 + zeta * omega0 * delta) / omegaD) *
					Math.sin(omegaD * t) +
					delta * Math.cos(omegaD * t))
		);
	}
	if (zeta === 1) {
		return 1 - Math.exp(-omega0 * t) * (delta + (v0 + omega0 * delta) * t);
	}
	const omegaD = omega0 * Math.sqrt(zeta * zeta - 1);
	const envelope = Math.exp(-zeta * omega0 * t);
	const x = Math.min(omegaD * t, 300);
	return (
		1 -
		(envelope *
			((v0 + zeta * omega0 * delta) * Math.sinh(x) +
				omegaD * delta * Math.cosh(x))) /
			omegaD
	);
}

/**
 * How long the spring takes to come within a thousandth of its target and
 * stay there, in ms. Found by scanning, so it holds for any damping.
 */
export function springLength(spec: SpringSpec): number {
	const tolerance = 1e-3;
	let settled = 0;
	for (let ms = 0; ms <= 5000; ms += 1) {
		if (Math.abs(springAt(ms, spec) - 1) > tolerance) settled = ms + 1;
	}
	return settled;
}

/* ----------------------------------------------------------------- move */

export type Move = {
	/** The Card that was open before the tap. */
	readonly from: number;
	/** The Card that was tapped. */
	readonly to: number;
	/**
	 * When the tap landed mid-flight: the frame on screen at that instant.
	 * The variant plays its own choreography from `from`; the difference
	 * between this seed and the variant's own first frame is faded out over
	 * the move, so nothing jumps and the choreography is preserved.
	 */
	readonly seed?: Frame;
};

export function rest(open: number): Move {
	return { from: open, to: open };
}

/** The whole timeline of a move, in ms. */
export function moveLength(move: Move, params: Params): number {
	if (move.from === move.to && !move.seed) return 0;
	return params.duration;
}

/** The move's raw progress at `t`. */
export function progress(t: number, params: Params): number {
	return clamp01(t / params.duration);
}

/* ---------------------------------------------------------------- frame */

export type CardFrame = {
	readonly y: number;
	readonly height: number;
	readonly z: number;
	readonly scale: number;
	/** Where the header row sits inside the Card. */
	readonly headerAt: "top" | "bottom";
};

export type Frame = {
	readonly cards: readonly CardFrame[];
};

export type Variant = (
	move: Move,
	t: number,
	params: Params,
	layout: Layout,
) => Frame;

/* ------------------------------------------------------------- retarget */

const NUMERIC_KEYS = ["y", "height", "scale"] as const;

/**
 * Wrap a variant so a mid-flight tap starts from what is on screen. The
 * offset between the seed and the variant's own first frame is faded with
 * an ease-out over the whole timeline.
 */
export function withSeed(variant: Variant): Variant {
	return (move, t, params, layout) => {
		const frame = variant(move, t, params, layout);
		if (!move.seed) return frame;
		const first = variant(move, 0, params, layout);
		const length = moveLength(move, params);
		const keep = 1 - easeOut(length > 0 ? t / length : 1);
		if (keep <= 0) return frame;
		const seed = move.seed;
		const cards = frame.cards.map((card, index) => {
			const was = seed.cards[index];
			const base = first.cards[index];
			if (!was || !base) return card;
			const next = { ...card };
			for (const key of NUMERIC_KEYS) {
				(next as Record<typeof key, number>)[key] =
					card[key] + (was[key] - base[key]) * keep;
			}
			return next;
		});
		return { cards };
	};
}
