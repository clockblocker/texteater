import { animate, motionValue } from "motion/react";
import type { WritingDirection } from "react-resizable-panels/workspace";
import { rubberBand } from "@/workspace/motion/motion-spec";
import { useDeckMotion } from "@/workspace/motion/runtime-config";
import {
	type Drag,
	flickOf,
	inlineSign,
	type NoteHandle,
	type ThrowTuning,
} from "./gesture";
import type { NoteMoves } from "./note-moves";

/**
 * The rubber-band swipe of a whole Deck toward inline-start, and the
 * Card tearing loose from it. Directions are along the line of text: the
 * swipe runs leftward in left-to-right text and rightward in
 * right-to-left text (#479).
 */
export function useDeckSwipe<S>({
	moves,
	direction,
	tuning,
	followersOf,
	snapBack,
	takeInHand,
}: {
	moves: NoteMoves;
	direction: WritingDirection;
	tuning: ThrowTuning;
	/** Every other Card on the Deck `d`'s Card rests in, and how many ranks away it is. */
	followersOf: (d: Drag<S>) => { h: NoteHandle; distance: number }[];
	snapBack: (h: NoteHandle) => void;
	/** The torn-off Card is in hand, a plain drag. */
	takeInHand: (d: Drag<S>) => void;
}) {
	const {
		leanFor,
		deckFollowFor,
		DECK_FOLLOW_SPRING,
		SWIPE_BREAK_PX,
		SWIPE_LET_GO_PX,
		TEAR_CATCH_UP,
	} = useDeckMotion();
	const { reduce } = moves;
	const sign = inlineSign(direction);

	/** The Cards that followed a swipe go back to their slots. */
	function settleFollowers(d: Drag<S>) {
		for (const { h } of followersOf(d)) {
			moves.toRest(h.x);
			moves.toRest(h.rotate);
		}
	}

	/**
	 * Pulled off the swipe, the Card tears loose: the Deck springs back
	 * without it, and the Card is in hand, a plain drag. It closes the gap
	 * the rubber band left between it and the finger on its own spring
	 * rather than jumping to the finger.
	 */
	function tearLoose(d: Drag<S>, dx: number, dy: number) {
		const { h } = d;
		settleFollowers(d);
		const gap = {
			x: motionValue(h.x.get() - dx),
			y: motionValue(h.y.get() - dy),
		};
		const place = () => {
			h.x.set(d.last.x - d.start.x + gap.x.get());
			h.y.set(d.last.y - d.start.y + gap.y.get());
		};
		const watching = [gap.x.on("change", place), gap.y.on("change", place)];
		const running = reduce
			? []
			: [
					animate(gap.x, 0, TEAR_CATCH_UP),
					animate(gap.y, 0, TEAR_CATCH_UP),
				];
		d.gap = {
			...gap,
			stop: () => {
				for (const stop of watching) stop();
				for (const run of running) run.stop();
			},
		};
		if (reduce) {
			gap.x.jump(0);
			gap.y.jump(0);
			place();
		}
		takeInHand(d);
	}

	return {
		/** Whether a press moving (`dx`, `dy`) past the slop starts a swipe. */
		startsSwipe(dx: number, dy: number): boolean {
			return dx * sign < 0 && Math.abs(dx) > Math.abs(dy);
		},
		/**
		 * A Deck swiped toward inline-start moves as one thing: the Card
		 * under the finger leads and the others trail at their share of its
		 * travel. Pulled back or off its axis it gives and resists, and
		 * pulled past `SWIPE_BREAK_PX`, or carried slowly on past
		 * `SWIPE_LET_GO_PX`, the Card tears loose. A hand throwing toward
		 * inline-start tears nothing: the throw is the sweep, and a throw
		 * drifts.
		 */
		swipeDeck(d: Drag<S>, dx: number, dy: number, now: number) {
			const along = dx * sign;
			if (
				flickOf(d, now, tuning, direction) !== "start" &&
				(along > SWIPE_BREAK_PX ||
					Math.abs(dy) > SWIPE_BREAK_PX ||
					along < -SWIPE_LET_GO_PX)
			) {
				tearLoose(d, dx, dy);
				return;
			}
			const { h } = d;
			const x = sign * (along < 0 ? along : rubberBand(along));
			h.x.set(x);
			h.y.set(rubberBand(dy));
			/* the lean is decoration on a move the Deck already makes */
			const lean = reduce ? 0 : leanFor(x);
			h.rotate.set(lean);
			for (const { h: other, distance } of followersOf(d)) {
				const share = deckFollowFor(distance);
				/* the lag is motion on its own; reduced, the Deck moves rigidly */
				if (reduce) other.x.set(x * share);
				else animate(other.x, x * share, DECK_FOLLOW_SPRING);
				other.rotate.set(lean * share);
			}
		},
		/** A swipe let go short of the line: the Deck springs back together. */
		snapDeck(d: Drag<S>) {
			settleFollowers(d);
			snapBack(d.h);
		},
	};
}
