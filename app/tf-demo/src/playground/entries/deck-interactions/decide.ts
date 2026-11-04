import {
	contains,
	distanceToRect,
	flickOf,
	HYSTERESIS_PX,
	type Point,
	project,
	type Rect,
	returning,
	unit,
} from "./geometry";

type Outcome = "back" | "dismiss" | "expand";

/** What a release does, why, and which way it goes. */
type Decision = {
	readonly outcome: Outcome;
	readonly reason: string;
	/** Logical, unit length: the way a dismissal leaves. */
	readonly direction: Point;
};

const DOWN: Point = { u: 0, v: 1 };

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
