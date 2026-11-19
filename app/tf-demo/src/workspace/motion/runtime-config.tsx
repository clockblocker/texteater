import { OPEN_SCALE } from "@/presentation/deck-geometry";
import * as spec from "./motion-spec";

/**
 * The deck runtime's motion: the spec's values as the renderer and the
 * gesture handler read them, with Motion transitions resolved.
 */
const DECK_MOTION = {
	...spec,
	transition: spec.motionOf,
	/* the drag spring keeps its `fromRest` */
	SPRING: spec.motionOf(
		spec.spring(spec.DRAG_SPRING.stiffness, spec.DRAG_SPRING.damping, true),
	),
	MORPH: spec.motionOf(spec.MORPH),
	HEADING_EDGE: spec.tween(spec.HEADING_EDGE.ms),
	OPEN_SCALE,
	ZONE_FEEDBACK_MS: 150,
	GROUND_FILL: spec.tween(spec.GROUND_PRESS_MS, "linear"),
	ARM_SLOP: 8,
	CLICK_SLOP: 4,
	/** How far a Card off its Deck is carried, or thrown, to reach a zone. */
	COMMIT: 88,
	VELOCITY_STALE_MS: 100,
	leanFor: (dx: number) => spec.leanFor(dx, spec.TILT_MAX, 1 / 16),
	deckFollowFor: (distance: number) =>
		spec.deckFollowFor(
			distance,
			spec.DECK_FOLLOW,
			spec.DECK_FOLLOW_FALLOFF,
		),
	DECK_FOLLOW_SPRING: spec.motionOf(spec.DECK_FOLLOW_SPRING),
	TEAR_CATCH_UP: spec.motionOf(spec.TEAR_CATCH_UP),
	contextDelayFor: (nth: number) =>
		Math.min(
			spec.CONTEXT_STAGGER_MAX,
			Math.max(0, nth) * spec.CONTEXT_STAGGER,
		),
};

export function useDeckMotion() {
	return DECK_MOTION;
}
