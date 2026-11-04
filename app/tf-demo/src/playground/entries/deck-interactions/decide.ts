import {
	contains,
	distanceToRect,
	dominantAxis,
	flickOf,
	flickVector,
	HYSTERESIS_PX,
	inflate,
	magnitude,
	type Point,
	project,
	type Rect,
	returning,
	unit,
} from "./geometry";

type Outcome = "back" | "dismiss" | "expand";

/** What a release does, why, and which way it goes. */
export type Decision = {
	readonly outcome: Outcome;
	readonly reason: string;
	/** Logical, unit length: the way a dismissal leaves. */
	readonly direction: Point;
};

/** A zone the hand is over right now, for the stamp and the readout. */
export type Live = {
	readonly zone: Outcome;
	/** 0 at the slot, 1 at the zone's line. */
	readonly progress: number;
	readonly reason: string;
};

const DOWN: Point = { u: 0, v: 1 };

/** Where the hand has gone, in logical px, read as A's directions. */
function directionOf(offset: Point): Outcome {
	return dominantAxis(offset) === "inline"
		? offset.u < 0
			? "dismiss"
			: "expand"
		: offset.v > 0
			? "dismiss"
			: "expand";
}

function axisDistance(offset: Point): number {
	return Math.max(Math.abs(offset.u), Math.abs(offset.v));
}

function inFootprint(
	footprint: Rect | null,
	point: Point,
	previous: Live | null,
): boolean {
	if (!footprint) return false;
	const sticky = previous?.reason === "footprint" ? HYSTERESIS_PX : 0;
	return contains(inflate(footprint, sticky), point);
}

/**
 * A, D and E's zones while the hand moves: back over the Deck's footprint,
 * otherwise inline-start or down dismisses and inline-end or up expands
 * once the leading axis passes `threshold`. A zone is left 12 px short of
 * the line that entered it.
 */
export function liveDirectional({
	centre,
	offset,
	footprint,
	threshold,
	previous,
}: {
	readonly centre: Point;
	readonly offset: Point;
	readonly footprint: Rect | null;
	readonly threshold: number;
	readonly previous: Live | null;
}): Live {
	const distance = axisDistance(offset);
	const progress = Math.min(1, distance / threshold);
	if (inFootprint(footprint, centre, previous))
		return { zone: "back", progress, reason: "footprint" };
	const heading = directionOf(offset);
	const line =
		previous?.zone === heading ? threshold - HYSTERESIS_PX : threshold;
	return distance >= line
		? { zone: heading, progress, reason: "distance" }
		: { zone: "back", progress, reason: "short" };
}

/**
 * A, D and E's release: a flick that is not coming home sweeps the Deck
 * the way it was thrown (an upward one only expands by distance); over the
 * footprint is back; otherwise the projected offset picks the zone.
 */
export function decideDirectional({
	centre,
	offset,
	velocity,
	footprint,
	threshold,
	flickSpeed,
}: {
	readonly centre: Point;
	readonly offset: Point;
	readonly velocity: Point;
	readonly footprint: Rect | null;
	readonly threshold: number;
	readonly flickSpeed: number;
}): Decision {
	const flick = flickOf({ travel: offset, velocity, minSpeed: flickSpeed });
	const home = footprint ? returning(footprint, centre, velocity) : false;
	if (flick && !home && !(flick.axis === "block" && flick.sign < 0))
		return {
			outcome: "dismiss",
			reason: `flick ${flick.speed.toFixed(2)}`,
			direction: flickVector(flick),
		};
	const projected = project(centre, velocity);
	if (footprint && contains(footprint, projected))
		return { outcome: "back", reason: "footprint", direction: DOWN };
	const ahead = project(offset, velocity);
	const distance = axisDistance(ahead);
	if (distance < threshold)
		return {
			outcome: "back",
			reason: `short ${Math.round(distance).toString()}`,
			direction: DOWN,
		};
	const moving = magnitude(velocity) > 0.1 ? velocity : ahead;
	return {
		outcome: directionOf(ahead),
		reason: `distance ${Math.round(distance).toString()}`,
		direction: unit(moving),
	};
}

/** One of B's places: where the Card was, the tray, or the open pad. */
export type Target = "slot" | "tray" | "pad";

export type Targets = {
	readonly slot: Rect;
	readonly tray: readonly Rect[];
	readonly pad: Rect;
};

const TARGET_OUTCOME: Record<Target, Outcome> = {
	slot: "back",
	tray: "dismiss",
	pad: "expand",
};

function distanceTo(targets: Targets, target: Target, point: Point): number {
	if (target === "tray")
		return Math.min(
			...targets.tray.map((rect) => distanceToRect(rect, point)),
		);
	return distanceToRect(targets[target], point);
}

/** The nearest target within `radius` of `point`, or null. */
export function nearestTarget(
	targets: Targets,
	point: Point,
	radius: number,
	previous: Target | null,
): Target | null {
	let best: Target | null = null;
	let bestDistance = Number.POSITIVE_INFINITY;
	for (const target of ["slot", "tray", "pad"] as const) {
		const reach = radius + (target === previous ? HYSTERESIS_PX : 0);
		const distance = distanceTo(targets, target, point);
		if (distance <= reach && distance < bestDistance) {
			best = target;
			bestDistance = distance;
		}
	}
	return best;
}

/**
 * B's release: a throw sweeps the Deck the way it went unless it is coming
 * home; over the footprint or the slot is back; over the tray dismisses,
 * over the pad expands; over nothing is back.
 */
export function decideTable({
	centre,
	point,
	offset,
	velocity,
	footprint,
	targets,
	radius,
	flickSpeed,
	previous,
}: {
	readonly centre: Point;
	/** The hand: targets are hit where the hand lets go. */
	readonly point: Point;
	readonly offset: Point;
	readonly velocity: Point;
	readonly footprint: Rect | null;
	readonly targets: Targets;
	readonly radius: number;
	readonly flickSpeed: number;
	readonly previous: Target | null;
}): Decision & { readonly target: Target | null } {
	const flick = flickOf({ travel: offset, velocity, minSpeed: flickSpeed });
	const home = footprint ? returning(footprint, centre, velocity) : false;
	if (flick && !home)
		return {
			outcome: "dismiss",
			reason: `flick ${flick.speed.toFixed(2)}`,
			direction: unit(velocity),
			target: null,
		};
	const projected = project(centre, velocity);
	if (footprint && contains(footprint, projected))
		return {
			outcome: "back",
			reason: "footprint",
			direction: DOWN,
			target: "slot",
		};
	const target = nearestTarget(
		targets,
		project(point, velocity),
		radius,
		previous,
	);
	if (!target)
		return {
			outcome: "back",
			reason: "nothing",
			direction: DOWN,
			target: null,
		};
	return {
		outcome: TARGET_OUTCOME[target],
		reason: target,
		direction: unit({ u: offset.u, v: offset.v }),
		target,
	};
}
