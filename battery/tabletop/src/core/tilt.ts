import { doneAfter, progressAfter, type SpringCurve } from "./curve";
import type { Logical, Point } from "./geometry";
import { SPRINGS, type SpringSpec } from "./springs";

/**
 * How a handled Body tilts toward the pointer over it (#1312): about its
 * own two axes, the side under the pointer coming up toward the reader as
 * simeydotme's pokemon-cards-css and vanilla-tilt do, with a glare lit on that Body alone.
 * Off under reduced motion.
 */
export type TiltFeel = {
	/** The lean with the pointer at an edge, in degrees. */
	readonly maxDeg: number;
	/** The viewer's distance in px, for the tilt's perspective. */
	readonly perspective: number;
	/** How much bigger the Body under the pointer grows: 0.02 is 2%. */
	readonly lift: number;
	/** The glare's opacity when it is fully lit, 0 to 1. */
	readonly glare: number;
	/** The spring the lean, the lift and the glare follow the pointer on. */
	readonly spring: SpringSpec;
	/** Whether a Body in the hand keeps leaning toward the spot it is held by. */
	readonly held: boolean;
};

/** #1312's defaults: 10° at the edge, 600 px, a 2% lift, a soft glare. */
export const DEFAULT_TILT: TiltFeel = {
	maxDeg: 10,
	perspective: 600,
	lift: 0.02,
	glare: 0.6,
	spring: SPRINGS.tilt,
	held: true,
};

/**
 * What a tilt holds. `tiltX` turns about the inline axis, positive bringing
 * the bottom edge up; `tiltY` about the block axis, positive bringing the
 * inline-end edge up, so it mirrors in RTL. Both in degrees. `tiltLift` is
 * a share of the Body's size and `glare` how lit it is, 0 to 1. They are
 * the Body's lean channels: a Move lets them go on its own progress.
 */
export type Lean = {
	readonly tiltX: number;
	readonly tiltY: number;
	readonly tiltLift: number;
	readonly glare: number;
};

export const FLAT: Lean = { tiltX: 0, tiltY: 0, tiltLift: 0, glare: 0 };

const LEAN_CHANNELS = ["tiltX", "tiltY", "tiltLift", "glare"] as const;
type LeanChannel = (typeof LEAN_CHANNELS)[number];

function epsilon(channel: LeanChannel): number {
	return channel === "tiltX" || channel === "tiltY" ? 0.01 : 1e-4;
}

/**
 * One step of a lean following the pointer: from `delta` off its target to
 * nothing on a spring of its own, which starts at the speed the lean had.
 * A pointer that moves every frame makes one a frame; it isn't a Move,
 * since nothing in the model changed.
 */
export type LeanTerm = {
	readonly channel: LeanChannel;
	readonly delta: number;
	readonly curve: SpringCurve;
	readonly bornAt: number;
};

/** The offset a lean Term holds at `now`. */
export function leanValue(term: LeanTerm, now: number): number {
	return term.delta * (1 - progressAfter(term.curve, now - term.bornAt));
}

/** How fast a lean Term moves at `now`, per second, read just ahead. */
function leanVelocity(term: LeanTerm, now: number): number {
	const h = 0.05;
	return ((leanValue(term, now + h) - leanValue(term, now)) * 1000) / h;
}

export function leanDone(term: LeanTerm, now: number): boolean {
	return doneAfter(term.curve, now - term.bornAt);
}

function leanSum(
	terms: readonly LeanTerm[],
	channel: LeanChannel,
	now: number,
) {
	let sum = 0;
	for (const term of terms)
		if (term.channel === channel) sum += leanValue(term, now);
	return sum;
}

export function isFlat(lean: Lean): boolean {
	return LEAN_CHANNELS.every((channel) => lean[channel] === 0);
}

/** A Body's box as it shows: client px, physical degrees and its scale. */
export type ShownBox = {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly rotate: number;
	readonly scale: number;
};

function clampUnit(value: number): number {
	return Math.min(1, Math.max(-1, value));
}

/**
 * Where `pointer` (client px) is on a Body showing `shown`, from -1 at one
 * edge to 1 at the other through its centre, in the Body's own turned
 * frame: `u` inline (mirrored in RTL), `v` down. Clamped to its edges.
 */
export function pointerOn(
	shown: ShownBox,
	pointer: Point,
	dir: 1 | -1,
): Logical {
	const dx = pointer.x - (shown.x + shown.width / 2);
	const dy = pointer.y - (shown.y + shown.height / 2);
	const radians = (shown.rotate * Math.PI) / 180;
	const across = dx * Math.cos(radians) + dy * Math.sin(radians);
	const down = -dx * Math.sin(radians) + dy * Math.cos(radians);
	const half = (size: number) => Math.max(1, (size * shown.scale) / 2);
	return {
		u: clampUnit((dir * across) / half(shown.width)),
		v: clampUnit(down / half(shown.height)),
	};
}

function hundredths(value: number): number {
	return Math.round(value * 100) / 100 || 0;
}

/** The lean toward a pointer at `at` on the Body, lit and lifted. */
export function leanToward(at: Logical, feel: TiltFeel): Lean {
	return {
		tiltX: hundredths(at.v * feel.maxDeg),
		tiltY: hundredths(at.u * feel.maxDeg),
		tiltLift: feel.lift,
		glare: 1,
	};
}

/**
 * Where the glare's light sits on the Body, in physical % of its box: under
 * the edge that has come up, read off the lean as it shows, so the light
 * rides the tilt's spring and drifts to the centre as it lets go.
 */
export function glareAt(
	lean: Lean,
	feel: TiltFeel,
	dir: 1 | -1,
): { readonly x: number; readonly y: number } {
	if (feel.maxDeg < 1e-3) return { x: 50, y: 50 };
	const at = (share: number) =>
		Math.round((50 + 50 * clampUnit(share)) * 10) / 10;
	return {
		x: at((dir * lean.tiltY) / feel.maxDeg),
		y: at(lean.tiltX / feel.maxDeg),
	};
}

/** What a lean shows: its target plus its live follow Terms. */
export function shownLean(
	target: Lean,
	terms: readonly LeanTerm[],
	now: number,
): Lean {
	return {
		tiltX: target.tiltX + leanSum(terms, "tiltX", now),
		tiltY: target.tiltY + leanSum(terms, "tiltY", now),
		tiltLift: target.tiltLift + leanSum(terms, "tiltLift", now),
		glare: target.glare + leanSum(terms, "glare", now),
	};
}

/**
 * The Terms a lean holds once its target moves from `from` to `to`: on each
 * channel that moved, its live springs fold into one that starts where they
 * show and as fast as they move, and carries the jump in target. A pointer
 * that moves every frame leaves one Term per channel, and the lean stays
 * continuous.
 */
export function followLean(
	live: readonly LeanTerm[],
	from: Lean,
	to: Lean,
	spring: SpringSpec,
	now: number,
): LeanTerm[] {
	const kept = live.filter((term) => !leanDone(term, now));
	const out: LeanTerm[] = [];
	for (const channel of LEAN_CHANNELS) {
		const mine = kept.filter((term) => term.channel === channel);
		if (from[channel] === to[channel]) {
			out.push(...mine);
			continue;
		}
		const shown = leanSum(mine, channel, now) + from[channel] - to[channel];
		let velocity = 0;
		for (const term of mine) velocity += leanVelocity(term, now);
		if (
			Math.abs(shown) < epsilon(channel) &&
			Math.abs(velocity) < epsilon(channel) * 10
		)
			continue;
		/* a lean already on its target but still moving starts a hair off
		   it, so its speed has a delta to be a share of */
		const delta =
			Math.abs(shown) > 1e-6 ? shown : (Math.sign(velocity) || 1) * 1e-6;
		out.push({
			channel,
			delta,
			curve: { kind: "spring", ...spring, rate: -velocity / delta },
			bornAt: now,
		});
	}
	return out;
}
