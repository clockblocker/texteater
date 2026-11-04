import {
	contains,
	flickOf,
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

const TARGET_OUTCOME: Record<Target, Outcome> = {
	slot: "back",
	tray: "dismiss",
	pad: "expand",
};

/**
 * B's release. The target lit under the hand is what the release does,
 * so the learner never commits to a place that was not shown, and a hand
 * still moving over the tray or the pad is not read as a throw. With
 * nothing lit, a throw sweeps the Deck the way it went unless it is
 * coming home; otherwise the Card goes back.
 */
export function decideTable({
	centre,
	offset,
	velocity,
	footprint,
	active,
	exit,
	flickSpeed,
}: {
	/** The Card's middle: the Deck's footprint is read from it. */
	readonly centre: Point;
	readonly offset: Point;
	readonly velocity: Point;
	readonly footprint: Rect | null;
	/** The target lit at release, if any. */
	readonly active: Target | null;
	/** Logical, unit length: the way the Deck leaves into the lit tray strip. */
	readonly exit: Point;
	readonly flickSpeed: number;
}): Decision & { readonly target: Target | null } {
	if (active)
		return {
			outcome: TARGET_OUTCOME[active],
			reason: active,
			direction: active === "tray" ? exit : DOWN,
			target: active,
		};
	const flick = flickOf({ travel: offset, velocity, minSpeed: flickSpeed });
	const home = footprint ? returning(footprint, centre, velocity) : false;
	if (flick && !home)
		return {
			outcome: "dismiss",
			reason: `flick ${flick.speed.toFixed(2)}`,
			direction: unit(velocity),
			target: null,
		};
	if (footprint && contains(footprint, project(centre, velocity)))
		return {
			outcome: "back",
			reason: "footprint",
			direction: DOWN,
			target: "slot",
		};
	return {
		outcome: "back",
		reason: "nothing",
		direction: DOWN,
		target: null,
	};
}
