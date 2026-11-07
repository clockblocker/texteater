import { DECK_OF_CARDS_EASE, EASE_OUT_QUINT } from "./ease";
import type { Channel, Move, Term } from "./move";
import { FOLLOW, type Shape, startOf } from "./shape";

/** Whether motion is reduced: the one policy for the whole app (#1309 Q6). */
export type MotionPolicy = { readonly reduced: boolean };

/**
 * The policy for a reader who prefers reduced motion or not. The app's
 * "Always play animations" setting overrides the preference.
 */
export function motionPolicy(
	prefersReduced: boolean,
	alwaysPlay: boolean,
): MotionPolicy {
	return { reduced: prefersReduced && !alwaysPlay };
}

/** The reduced policy's numbers. */
export const REDUCED = {
	/** A dissolve fades out where the Body is, then in at its rest: each way. */
	dissolveMs: 100,
	/** A change of place this small may still travel, briefly. */
	nearPx: 24,
	/** A rotation this small may still turn, briefly. */
	nearDeg: 1,
	/** The brief tween a near change rides. */
	tweenMs: 140,
	/** The turn's flat crossfade. */
	turnMs: 140,
} as const;

const TRAVEL = new Set<Channel>(["x", "y", "width", "height", "rotate"]);
const STILL = new Set<Channel>(["lift", "tiltX", "tiltY", "tiltLift", "glare"]);

function startOfTerm(term: Term): number {
	return term.delta * startOf(term.shape);
}

/** Where in a reduced dissolve everything switches: halfway, while hidden. */
export const SWITCH = 0.5;

/**
 * Whether a Move dissolves (it travels past 24 px or 1°), travels briefly,
 * or doesn't travel at all under the reduced policy.
 */
export function reducedKind(move: Move): "dissolve" | "brief" | null {
	const travel = move.terms.filter(
		(term) =>
			TRAVEL.has(term.channel) && Math.abs(startOfTerm(term)) > 1e-3,
	);
	if (travel.length === 0) return null;
	return travel.some(
		(term) =>
			Math.abs(startOfTerm(term)) >
			(term.channel === "rotate" ? REDUCED.nearDeg : REDUCED.nearPx),
	)
		? "dissolve"
		: "brief";
}

const STEP: Shape = { kind: "step", at: SWITCH };

/**
 * The one reduced-motion policy, as a rewrite of a Move. Nothing travels
 * far, grows, spins or tilts:
 *
 * - A change past 24 px (or 1°) dissolves: the Body holds where it shows
 *   while it fades out over 100 ms, switches everything (place, size,
 *   Parts, stacking) while hidden, and fades in at its rest. It stays one
 *   element. A Trick's waypoints go; its stagger stays.
 * - A smaller change, and a release from the hand, tweens there in 140 ms.
 * - A turn is a flat 140 ms crossfade; lift and lean get no Terms.
 *
 * Without a reduced policy, and so under "Always play animations", it is
 * the identity.
 */
export function reduce(move: Move, policy: MotionPolicy): Move {
	if (!policy.reduced) return move;
	if (move.terms.every((term) => term.channel === "turn"))
		return {
			...move,
			curve: {
				kind: "tween",
				ms: REDUCED.turnMs,
				ease: DECK_OF_CARDS_EASE.linear,
			},
		};
	const kind = reducedKind(move);
	const kept = move.terms.filter((term) => !STILL.has(term.channel));
	if (kind === "dissolve") {
		const opacity = kept.find((term) => term.channel === "opacity");
		const from = opacity ? startOfTerm(opacity) : 0;
		return {
			...move,
			curve: {
				kind: "tween",
				ms: 2 * REDUCED.dissolveMs,
				ease: DECK_OF_CARDS_EASE.linear,
			},
			terms: [
				...kept
					.filter((term) => term.channel !== "opacity")
					.map((term) => ({
						...term,
						delta: startOfTerm(term),
						shape: STEP,
					})),
				{
					channel: "opacity",
					delta: -1,
					shape: {
						kind: "keys",
						keys: [-from, 1, 0],
						times: [0, SWITCH, 1],
					},
				},
			],
			crossing: move.crossing ? { ...move.crossing, shape: STEP } : null,
		};
	}
	return {
		...move,
		curve: { kind: "tween", ms: REDUCED.tweenMs, ease: EASE_OUT_QUINT },
		terms: kept.map((term) => ({
			...term,
			delta: startOfTerm(term),
			shape: FOLLOW,
		})),
		crossing: move.crossing ? { ...move.crossing, shape: FOLLOW } : null,
	};
}
