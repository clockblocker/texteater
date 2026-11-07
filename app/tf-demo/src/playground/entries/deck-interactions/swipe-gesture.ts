/**
 * D's gesture rules, pure. A pull is the swiped Card's offset along the
 * locked axis, in signed logical px: negative toward inline-start or up,
 * positive toward inline-end or down. One threshold decides everything:
 * `progressOf` draws the Deck's collapse, every "will commit" signal turns
 * on when it reaches 1, and a release then commits. Nothing else, not the
 * hand's speed nor where it has been, moves that breakpoint.
 */

export type Axis = "inline" | "block";
export type Zone = "dismiss" | "expand";

export const COLLAPSE_CURVES = ["linear", "ease-in"] as const;
export type CollapseCurve = (typeof COLLAPSE_CURVES)[number];

/** Each maps 0 to 0 and 1 to 1 and never runs ahead of the pull, so the Deck is never whole before the threshold. */
const CURVES: Record<CollapseCurve, (t: number) => number> = {
	linear: (t) => t,
	"ease-in": (t) => t * t,
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

/**
 * Where the Card sits for the hand's travel: 1:1 up to `end`, where it has
 * uncovered its whole footprint, then rubber-banded.
 */
export function travelOf(
	distance: number,
	end: number,
	rubberLimit: number,
): number {
	return distance <= end
		? distance
		: end + rubberBand(distance - end, rubberLimit);
}

/**
 * The one breakpoint: how far a pull has got toward committing its
 * action, 0 at rest and 1 at `threshold`.
 */
export function progressOf(pull: number, threshold: number): number {
	if (threshold <= 0) return 1;
	return Math.min(1, Math.abs(pull) / threshold);
}

export type Verdict = {
	readonly commits: boolean;
	readonly zone: Zone;
	readonly reason: string;
};

/**
 * What a release now would do, which is also what the panel shows while
 * the hand is down: at the threshold it commits, short of it the Card
 * comes back.
 */
export function verdictOf(
	axis: Axis,
	pull: number,
	threshold: number,
): Verdict {
	const zone = zoneOf(axis, pull);
	const px = Math.round(Math.abs(pull)).toString();
	return progressOf(pull, threshold) >= 1
		? { commits: true, zone, reason: `threshold ${px}` }
		: { commits: false, zone, reason: `short ${px}` };
}

/**
 * How far the rest of the Deck has gathered into the Card: the pull's
 * progress through `curve`, one value for every other Card, so they fold
 * in together and are whole exactly when a release would commit. Only a
 * pull toward Close deck gathers it.
 */
export function collapseOf(
	axis: Axis,
	pull: number,
	threshold: number,
	curve: CollapseCurve,
): number {
	if (zoneOf(axis, pull) !== "dismiss") return 0;
	return CURVES[curve](progressOf(pull, threshold));
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
