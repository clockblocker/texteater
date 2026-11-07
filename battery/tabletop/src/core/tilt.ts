import type { Logical, Point } from "./geometry";
import { SPRINGS, type SpringSpec } from "./springs";
import { type Curve, done, sumAt, type Term, velocityAt } from "./term";

/**
 * How a handled Body tilts toward the pointer over it (#1312): about its
 * own two axes, the side under the pointer coming up toward the reader as
 * pokemon-cards and vanilla-tilt do, with a glare lit on that Body alone.
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
 * inline-end edge up, so it mirrors in RTL. Both in degrees. `lift` is a
 * share of the Body's size and `glare` how lit it is, 0 to 1.
 */
export type Lean = {
	readonly tiltX: number;
	readonly tiltY: number;
	readonly lift: number;
	readonly glare: number;
};

export const FLAT: Lean = { tiltX: 0, tiltY: 0, lift: 0, glare: 0 };

const LEAN_CHANNELS = ["tiltX", "tiltY", "lift", "glare"] as const;

function epsilon(channel: (typeof LEAN_CHANNELS)[number]): number {
	return channel === "tiltX" || channel === "tiltY" ? 0.01 : 1e-4;
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
		lift: feel.lift,
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

/** What a tilt shows: its target plus its live Terms. */
export function shownLean(
	target: Lean,
	terms: readonly Term[],
	now: number,
): Lean {
	return {
		tiltX: target.tiltX + sumAt(terms, "tiltX", now),
		tiltY: target.tiltY + sumAt(terms, "tiltY", now),
		lift: target.lift + sumAt(terms, "lift", now),
		glare: target.glare + sumAt(terms, "glare", now),
	};
}

/**
 * The Terms that let a lean showing `shown` go flat on a Move's own
 * `curve`, born with it: a move of the box takes the tilt down on the
 * box's progress, so the lean, the lift and the glare end with it.
 */
export function letGoTerms(
	shown: Lean,
	curve: Curve,
	birth: Pick<Term, "bornAt" | "delayMs" | "source">,
): Term[] {
	return LEAN_CHANNELS.flatMap((channel) =>
		Math.abs(shown[channel]) < epsilon(channel) / 10
			? []
			: [{ channel, delta: shown[channel], curve, ...birth }],
	);
}

/**
 * The Terms a tilt holds once its target moves from `from` to `to`: on each
 * channel that moved, its live springs fold into one that starts where they
 * show and as fast as they move (springs add, so this is exact for one
 * spring), and carries the jump in target. A pointer that moves every frame
 * leaves one Term per channel, and the lean stays continuous.
 */
export function followLean(
	live: readonly Term[],
	from: Lean,
	to: Lean,
	spring: SpringSpec,
	now: number,
): Term[] {
	const kept = live.filter((term) => !done(term, now));
	const out: Term[] = [];
	for (const channel of LEAN_CHANNELS) {
		const mine = kept.filter((term) => term.channel === channel);
		if (from[channel] === to[channel]) {
			out.push(...mine);
			continue;
		}
		const shown = sumAt(mine, channel, now) + from[channel] - to[channel];
		let velocity = 0;
		for (const term of mine) velocity += velocityAt(term, now);
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
			delayMs: 0,
			bornAt: now,
			source: "hand",
		});
	}
	return out;
}
