/**
 * D's gesture rules, pure: which action a pull uncovers, where the Card
 * sits for it, when the detent is armed, and what a release does. A pull
 * is signed logical px along the locked axis: negative toward inline-start
 * or up, positive toward inline-end or down.
 */

import { cubicBezier } from "motion/react";
import { FLICK_TRAVEL_PX } from "./geometry";

export type Axis = "inline" | "block";
export type Zone = "dismiss" | "expand";

export const COLLAPSE_CURVES = ["linear", "ease-out", "ease-in-out"] as const;
export type CollapseCurve = (typeof COLLAPSE_CURVES)[number];

/** The page's strong ease-out and ease-in-out, as scrub curves. */
const CURVES: Record<CollapseCurve, (t: number) => number> = {
	linear: (t) => t,
	"ease-out": cubicBezier(0.23, 1, 0.32, 1),
	"ease-in-out": cubicBezier(0.77, 0, 0.175, 1),
};
/** iOS's rubber-band coefficient. */
const RUBBER_C = 0.55;

/**
 * The action a pull uncovers: inline-start and down close the Deck,
 * inline-end and up open the Card.
 */
export function zoneOf(axis: Axis, pull: number): Zone {
	const toStart = pull < 0;
	if (axis === "inline") return toStart ? "dismiss" : "expand";
	return toStart ? "expand" : "dismiss";
}

/** iOS's rubber band: past an edge, each px moves less, never past `limit`. */
export function rubberBand(past: number, limit: number): number {
	if (limit <= 0 || past <= 0) return 0;
	return limit * (1 - 1 / ((past * RUBBER_C) / limit + 1));
}

export type DetentRules = {
	readonly detent: number;
	/** An armed pull disarms only this far short of the detent. */
	readonly hysteresis: number;
	/** The share of each px the Card gives up in the band before the detent. */
	readonly resistance: number;
	readonly band: number;
	/** Where the Card has uncovered its whole footprint and starts to rubber-band. */
	readonly end: number;
	readonly rubberLimit: number;
};

/** Whether a pull `distance` px long is past the detent, given whether it was. */
export function armedAt(
	distance: number,
	was: boolean,
	rules: Pick<DetentRules, "detent" | "hysteresis">,
): boolean {
	return was
		? distance >= rules.detent - rules.hysteresis
		: distance >= rules.detent;
}

/**
 * How far the Card has moved for a pull `distance` px long. Short of the
 * band it tracks 1:1; in the band it lags as the detent's spring loads;
 * once armed it is back under the hand, so crossing the detent snaps it
 * forward. Past its end it rubber-bands.
 */
export function shownAt(
	distance: number,
	armed: boolean,
	rules: DetentRules,
): number {
	const bandStart = Math.max(0, rules.detent - rules.band);
	const shown =
		!armed && distance > bandStart
			? bandStart + (distance - bandStart) * (1 - rules.resistance)
			: distance;
	const end = Math.max(rules.end, rules.detent);
	return shown <= end
		? shown
		: end + rubberBand(shown - end, rules.rubberLimit);
}

export type Verdict = {
	readonly commits: boolean;
	readonly zone: Zone;
	readonly reason: string;
};

/**
 * What a release now would do, which is also what the panel shows while
 * the hand is down. Past the detent commits; so does a flick outward. A
 * flick back toward the slot cancels even past the detent: the velocity's
 * sign wins, so a learner who changes their mind is never overruled.
 */
export function verdictOf({
	axis,
	pull,
	speed,
	armed,
	flickSpeed,
}: {
	readonly axis: Axis;
	readonly pull: number;
	/** Along the axis, px/ms, signed as `pull` is. */
	readonly speed: number;
	readonly armed: boolean;
	readonly flickSpeed: number;
}): Verdict {
	const zone = zoneOf(axis, pull);
	const distance = Math.abs(pull);
	const outward = pull === 0 ? 0 : speed * Math.sign(pull);
	const px = Math.round(distance).toString();
	if (outward <= -flickSpeed)
		return { commits: false, zone, reason: "flicked back" };
	if (armed) return { commits: true, zone, reason: `detent ${px}` };
	if (distance >= FLICK_TRAVEL_PX && outward >= flickSpeed)
		return {
			commits: true,
			zone,
			reason: `flick ${outward.toFixed(2)}`,
		};
	return { commits: false, zone, reason: `short ${px}` };
}

/**
 * How far the rest of the Deck has gathered into the Card: 0 at rest, 1 at
 * the detent, through `curve`. One value for every Card behind, so they
 * all fold in at once. Only a pull toward Close deck gathers it.
 */
export function collapseOf(
	axis: Axis,
	pull: number,
	detent: number,
	curve: CollapseCurve,
): number {
	if (detent <= 0 || zoneOf(axis, pull) !== "dismiss") return 0;
	return CURVES[curve](Math.min(1, Math.abs(pull) / detent));
}

/**
 * The hand's travel along the axis, less the slop it took to lock the
 * axis. Through the slop the Card stays put; over the next `over` px it
 * catches the hand up, a little faster than it, so it never jumps, owes
 * nothing to a timed spring, and is under the hand again once caught up.
 */
export function takeUp(raw: number, slop: number, over: number): number {
	const travel = Math.abs(raw);
	if (travel <= slop) return 0;
	const sign = raw < 0 ? -1 : 1;
	if (over <= 0 || travel >= slop + over) return sign * travel;
	return sign * (travel - slop * (1 - (travel - slop) / over));
}
