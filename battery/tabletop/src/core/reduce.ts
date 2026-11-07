import { DECK_OF_CARDS_EASE, EASE_OUT_QUINT } from "./ease";
import { type Channel, startShare, type Term } from "./term";

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
const STILL = new Set<Channel>(["lift", "tiltX", "tiltY"]);

function startOf(term: Term): number {
	return term.delta * startShare(term.curve);
}

function far(term: Term): boolean {
	const limit = term.channel === "rotate" ? REDUCED.nearDeg : REDUCED.nearPx;
	return Math.abs(startOf(term)) > limit;
}

type Plan = { readonly far: boolean; readonly at: number };

/** Whether a change dissolves or travels briefly, and when it starts. */
function planOf(terms: readonly Term[]): Plan | null {
	const moving = terms.filter(
		(term) => TRAVEL.has(term.channel) && startOf(term) !== 0,
	);
	if (moving.length === 0) return null;
	return {
		far: moving.some(far),
		at: Math.min(...moving.map((term) => term.delayMs)),
	};
}

/** Holds `start` while the Body fades out, then drops it as it fades in. */
function step(term: Term, start: number, at: number): Term {
	return {
		channel: term.channel,
		delta: start,
		curve: {
			kind: "tween",
			ms: 2 * REDUCED.dissolveMs,
			ease: DECK_OF_CARDS_EASE.linear,
			keyframes: [1, 1, 0, 0],
			times: [0, 0.5, 0.5, 1],
		},
		delayMs: at,
		bornAt: term.bornAt,
		source: term.source,
	};
}

function brief(term: Term, start: number, at: number): Term {
	return {
		channel: term.channel,
		delta: start,
		curve: { kind: "tween", ms: REDUCED.tweenMs, ease: EASE_OUT_QUINT },
		delayMs: at,
		bornAt: term.bornAt,
		source: term.source,
	};
}

function rewrite(term: Term, plan: Plan | null): Term | null {
	const start = startOf(term);
	if (Math.abs(start) < 1e-4 || !plan) return null;
	return plan.far ? step(term, start, plan.at) : brief(term, start, plan.at);
}

function dip(from: Term | undefined, plan: Plan, bornAt: number): Term {
	return {
		channel: "opacity",
		delta: 1,
		curve: {
			kind: "tween",
			ms: 2 * REDUCED.dissolveMs,
			ease: DECK_OF_CARDS_EASE.linear,
			keyframes: [from ? startOf(from) : 0, -1, 0],
			times: [0, 0.5, 1],
		},
		delayMs: plan.at,
		bornAt,
		source: from?.source ?? "app",
	};
}

/**
 * The one reduced-motion policy, as a rewrite of the Terms one change of
 * rest adds to a Body. Nothing travels far, grows, spins or tilts:
 *
 * - A change past 24 px (or 1°) dissolves: the Body holds where it was
 *   while it fades out over 100 ms, then shows at its rest and fades in.
 *   It stays one element. A trick's waypoints go; its stagger stays.
 * - A smaller change, and a release from the hand, tweens there in 140 ms.
 * - A turn is a flat 140 ms crossfade; lift and tilt get no Terms.
 *
 * Without a reduced policy, and so under "Always play animations", it is
 * the identity.
 */
export function reduce(terms: readonly Term[], policy: MotionPolicy): Term[] {
	if (!policy.reduced) return [...terms];
	const plan = planOf(terms);
	const out: Term[] = [];
	let opacity: Term | undefined;
	for (const term of terms) {
		if (STILL.has(term.channel)) continue;
		if (term.channel === "opacity") opacity = term;
		else if (term.channel === "turn")
			out.push({
				...term,
				curve: {
					kind: "tween",
					ms: REDUCED.turnMs,
					ease: DECK_OF_CARDS_EASE.linear,
				},
			});
		else if (term.channel === "z")
			out.push(
				plan?.far
					? {
							...term,
							curve: {
								kind: "tween",
								ms: plan.at + REDUCED.dissolveMs,
								ease: DECK_OF_CARDS_EASE.linear,
								keyframes: [1, 1],
							},
						}
					: term,
			);
		else {
			const rewritten = rewrite(term, plan);
			if (rewritten) out.push(rewritten);
		}
	}
	const bornAt = terms[0]?.bornAt ?? 0;
	if (plan?.far) out.push(dip(opacity, plan, bornAt));
	else if (opacity) {
		const rewritten = rewrite(opacity, plan ?? { far: false, at: 0 });
		if (rewritten) out.push(rewritten);
	}
	return out;
}

/**
 * A part's Terms, or anything else that moves with a Body, under the same
 * policy: they switch when the Body's change switches, and travel briefly
 * when it does. `leader` is the Body's change as it was before `reduce`.
 */
export function reduceFollowers(
	terms: readonly Term[],
	leader: readonly Term[],
	policy: MotionPolicy,
): Term[] {
	if (!policy.reduced) return [...terms];
	const plan = planOf(leader) ?? { far: false, at: 0 };
	return terms.flatMap((term) => rewrite(term, plan) ?? []);
}
