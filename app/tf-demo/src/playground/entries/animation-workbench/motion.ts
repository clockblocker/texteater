import {
	type Ease,
	HEADER_REM,
	MORPH,
	PILE_HEIGHT_REM,
	type Spec,
	spanOf,
} from "../deck-models/motion-spec";

/**
 * ANIMATION WORKBENCH — the deterministic core.
 *
 * Nothing here knows about React or the DOM. A scene is a pure function
 * of time, so playback, scrubbing and frame stepping all call that one
 * function with a different `t` and cannot disagree.
 *
 * The clock only owns time. Durations and spring response are parameters
 * of the calculation, so a parameter change re-evaluates the frozen frame
 * in place. The deck's Swap is the one entry with no time in it at all:
 * its `Frame` below is a function of which Card is open.
 */

/* --------------------------------------------------------------- layout */

/**
 * The deck column and its Heading row come from `deck-models/motion-spec`,
 * so this stage is laid out with the numbers the live deck uses.
 */
export { HEADER_REM, PILE_HEIGHT_REM };

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
	const card =
		(PILE_HEIGHT_REM - (Math.max(1, count) - 1) * HEADER_REM) * px;
	return { count, px, header, card, body: card - header };
}

/* --------------------------------------------------------------- params */

/** The knobs the scene tabs read. Swap has none: nothing in it moves. */
export type Params = {
	/** A scene's main tween, in ms. */
	readonly duration: number;
	/** The physical spring the drag ghost settles on, as Motion takes it. */
	readonly stiffness: number;
	readonly damping: number;
};

export const DEFAULT_PARAMS: Params = {
	duration: 420,
	stiffness: 520,
	damping: 42,
};

/* --------------------------------------------------------------- easing */

export function clamp01(value: number): number {
	return value < 0 ? 0 : value > 1 ? 1 : value;
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

/** The preview gives a spring this long to come to rest. */
export const SPRING_SCAN_MS = 5000;

export type SpringSettle = {
	/** The timeline, in ms. */
	readonly ms: number;
	/**
	 * False when the spring is still moving at the scan's end: the preview
	 * is cut short there, and must not pretend it settled.
	 */
	readonly settled: boolean;
};

/**
 * How long the spring takes to come within a thousandth of its target and
 * stay there. Found by scanning, so it holds for any damping.
 */
/**
 * The scan is 5000 steps, and a scene asks for it once per frame with the
 * same spec, so the answer is kept. A spec is four numbers; the cache is
 * bounded by how many the knobs can produce in a session.
 */
const SETTLED = new Map<string, SpringSettle>();

export function springSettle(spec: SpringSpec): SpringSettle {
	const id = `${spec.stiffness.toString()}/${spec.damping.toString()}/${(spec.mass ?? 1).toString()}/${(spec.velocity ?? 0).toString()}`;
	const known = SETTLED.get(id);
	if (known) return known;
	const tolerance = 1e-3;
	let settled = 0;
	for (let ms = 0; ms <= SPRING_SCAN_MS; ms += 1) {
		if (Math.abs(springAt(ms, spec) - 1) > tolerance) settled = ms + 1;
	}
	const found: SpringSettle =
		settled > SPRING_SCAN_MS
			? { ms: SPRING_SCAN_MS, settled: false }
			: { ms: settled, settled: true };
	SETTLED.set(id, found);
	return found;
}

export function springLength(spec: SpringSpec): number {
	return springSettle(spec).ms;
}

/* ----------------------------------------------------- shared specs */

/**
 * A spec from `deck-models/motion-spec` is data: a duration and a named
 * curve, or a spring's response. These three turn one into the numbers a
 * scene needs, so a scene never restates a duration, a delay or an easing
 * the prototype already declares.
 */

const CURVE: Record<Ease, (p: number) => number> = {
	linear: clamp01,
	easeIn: MOTION_EASE_IN,
	easeOut: MOTION_EASE_OUT,
	easeInOut: MOTION_EASE_IN_OUT,
};

/** The cubic bézier behind one of Motion's easing names. */
export function curveOf(ease: Ease): (p: number) => number {
	return CURVE[ease];
}

/**
 * The spec's whole timeline, in ms: a tween's delay plus its duration, or
 * how long the spring takes to come to rest.
 */
export function lengthOf(spec: Spec): number {
	return spec.kind === "tween" ? spanOf(spec) : springLength(spec);
}

/**
 * How far along `spec` is at `t`, from 0 to 1. A tween waits out its
 * delay, then runs its curve; a spring is pinned to 1 once it settles, the
 * way Motion snaps a value to its target at rest. A spring the preview cut
 * short is never pinned: its last frame is wherever it had got to.
 *
 * `from` shifts the whole spec later on the timeline, for a scene that
 * plays one move after another.
 */
export function progressOf(spec: Spec, t: number, from = 0): number {
	if (spec.kind === "tween")
		return segmentAt(t, from + spec.delayMs, spec.ms, CURVE[spec.ease]);
	const settle = springSettle(spec);
	const elapsed = t - from;
	if (elapsed <= 0) return 0;
	return settle.settled && elapsed >= settle.ms
		? 1
		: springAt(elapsed, spec);
}

/**
 * The eased progress of one segment that starts at `from` ms and runs
 * `duration` ms: 0 before it, 1 after it. `scene.ts` re-exports this as
 * `segment`, which is what scenes call it.
 */
export function segmentAt(
	t: number,
	from: number,
	duration: number,
	easing: (p: number) => number,
): number {
	if (duration <= 0) return t >= from ? 1 : 0;
	return easing(clamp01((t - from) / duration));
}

/* ---------------------------------------------------------------- morph */

/** The spring a Note's box and Heading ride between forms: `MORPH`. */
export const MORPH_SPEC: SpringSpec = MORPH;
const MORPH_SETTLE = springSettle(MORPH_SPEC);

/** The MORPH spring's progress at `t`, pinned to 1 once it has settled. */
export function morphProgress(t: number): number {
	return progressOf(MORPH, t);
}

/** How long MORPH takes to settle, in ms. */
export const MORPH_MS = MORPH_SETTLE.ms;

export const MORPH_CAVEAT: string | null = MORPH_SETTLE.settled
	? null
	: "Cut short at 5 s: the MORPH spring has not settled.";

/* ----------------------------------------------------------------- deck */

/**
 * One Card's place in the deck. There is no time in here: a tap rearranges
 * the deck at once, so a frame is a function of which Card is open and
 * nothing else.
 */
export type CardFrame = {
	readonly y: number;
	readonly height: number;
	readonly z: number;
	/** The open Card rests larger than the rest: `OPEN_SCALE`. */
	readonly scale: number;
	/** Which edge the Heading row sits at inside the Card. */
	readonly headerAt: "top" | "bottom";
};

export type Frame = {
	readonly cards: readonly CardFrame[];
};
