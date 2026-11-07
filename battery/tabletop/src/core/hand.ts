import type { SpringSpec } from "./springs";

/**
 * How a Body looks while the hand holds it. deck-of-cards keeps it as it
 * was (`KEEP_POSE`): the same rotation and size, raised over every other
 * Card at once. A Note lifts a little and straightens, and comes over the
 * Cards in front of it by a dissolve.
 */
export type HandPose = {
	/** How much bigger it rides: 0.03 is 3%. */
	readonly lift: number;
	/** Whether it turns upright while held. */
	readonly straighten: boolean;
	/** How it comes over the Bodies above it: a dissolve, or a cut at once. */
	readonly raise: "dissolve" | "cut";
};

/** A Note in the hand: 3% bigger, upright, dissolving over what it passes. */
export const LIFTED: HandPose = {
	lift: 0.03,
	straighten: true,
	raise: "dissolve",
};

/** deck-of-cards' hand: the Card keeps its pose and comes to the top at once. */
export const KEEP_POSE: HandPose = { lift: 0, straighten: false, raise: "cut" };

/** The stacking order every Body in the hand or leaving for good rides at. */
export const HAND_Z = 10_000;

/**
 * How fast a straight move from `from` to `to` starts, as a share of the
 * way per second: the part of `velocity` (px/s) that runs along the line
 * toward `to`. None of it carries across the line, none away from `to`,
 * and none at all when there is no way to go: a release where the Body
 * already rests throws the hand's speed away.
 */
export function approachRate(
	from: { readonly x: number; readonly y: number },
	to: { readonly x: number; readonly y: number },
	velocity: { readonly x: number; readonly y: number },
): number {
	const way = { x: to.x - from.x, y: to.y - from.y };
	const squared = way.x * way.x + way.y * way.y;
	if (squared < 0.25) return 0;
	return Math.max(0, (velocity.x * way.x + velocity.y * way.y) / squared);
}

/**
 * The spring a release lands on: `spring` itself while the hand comes in
 * no faster than the spring's own rate, √stiffness, which it takes without
 * passing the rest. A faster hand lands on a critically damped spring of
 * its own rate: the Body keeps the hand's speed and still never passes its
 * rest (#1311 rule 5).
 */
export function landing(spring: SpringSpec, rate: number): SpringSpec {
	if (rate <= Math.sqrt(spring.stiffness)) return spring;
	const stiffness = rate * rate;
	return { stiffness, damping: 2 * Math.sqrt(stiffness) };
}
