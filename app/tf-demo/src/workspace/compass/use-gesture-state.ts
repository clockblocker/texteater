import type { Box, Presentation } from "compass";
import { animate } from "motion/react";
import { useRef, useState } from "react";
import { useDeckReducedMotion } from "@/workspace/motion/reduced-motion";
import { useDeckMotion } from "@/workspace/motion/runtime-config";
import type { Destination, Drag, NoteHandle } from "./gesture";

/**
 * The gesture in progress and how it winds down: the Card in hand, where
 * letting go would send it, and the settling a release starts. Each piece
 * is state, to render, and where handlers must see a change before the
 * next render, a ref.
 */
export function useGestureState<S>() {
	const { SPRING, SETTLE_TIMEOUT_MS } = useDeckMotion();
	const reduce = useDeckReducedMotion();
	const [drag, setDrag] = useState<Drag<S> | null>(null);
	const dragRef = useRef<Drag<S> | null>(null);
	/** A Card lifted from a Link or a Segment: in no Deck, in no Sheet, in hand. */
	const [loose, setLoose] = useState<{
		readonly card: Presentation<S>;
		readonly box: Box;
	} | null>(null);
	const [destination, setDestination] = useState<Destination | null>(null);
	const destinationRef = useRef<Destination | null>(null);
	destinationRef.current = destination;
	/** A swiped Deck a release now would sweep. */
	const [pastCommit, setPastCommit] = useState(false);
	/**
	 * The gesture is over and the Note is on its way home. It stops being
	 * boxed at the hand from this frame: the release is where it learns
	 * its slot, not the teardown, so the box morphs to the slot while the
	 * drag offset unwinds on its own spring and the two read as one move.
	 * The Deck closes over it at once: it travels home under the Cards
	 * that overlap it, so nothing happens on arrival.
	 */
	const [returning, setReturning] = useState(false);
	/** `returning`, read by handlers: a returning Card can be taken back. */
	const returningRef = useRef(false);
	/** A release is settling; nothing new is picked up until it has. */
	const settlingRef = useRef(false);
	/** The return's own animations, so a fresh grab can take the Card back. */
	const returnRun = useRef<{ stop: () => void }[]>([]);

	/** The gesture's state is gone: nothing in hand, nothing previewed. */
	function tearDown() {
		setLoose(null);
		setDrag(null);
		setDestination(null);
		setPastCommit(false);
	}

	/**
	 * Wait for a release's animations, at most `SETTLE_TIMEOUT_MS`, then
	 * commit what it decided and tear the gesture down.
	 */
	function settle(run: () => Promise<unknown>, then: () => void) {
		settlingRef.current = true;
		const timeout = new Promise((resolve) =>
			window.setTimeout(resolve, SETTLE_TIMEOUT_MS),
		);
		void Promise.race([run(), timeout]).then(() => {
			settlingRef.current = false;
			then();
			/* a Card picked up again while it was settling is in hand now,
			   and tearing the drag down under it would drop it */
			if (dragRef.current) return;
			returnRun.current = [];
			returningRef.current = false;
			setReturning(false);
			tearDown();
		});
	}
	/**
	 * The Card goes back to the slot it was picked up from, and the Deck
	 * closes over it at the release rather than on arrival: the frame it
	 * gets its resting z back is then no event at all.
	 */
	function snapBack(h: NoteHandle) {
		returningRef.current = true;
		setReturning(true);
		if (reduce) {
			for (const value of [h.x, h.y, h.rotate]) value.jump(0);
			settle(
				() => Promise.resolve(),
				() => {},
			);
			return;
		}
		settle(
			() => {
				const run = [
					animate(h.x, 0, SPRING),
					animate(h.y, 0, SPRING),
					animate(h.rotate, 0, SPRING),
				];
				returnRun.current = run;
				return Promise.all(run);
			},
			() => {},
		);
	}

	return {
		drag,
		setDrag,
		dragRef,
		loose,
		setLoose,
		destination,
		setDestination,
		destinationRef,
		pastCommit,
		setPastCommit,
		returning,
		returningRef,
		settlingRef,
		tearDown,
		/** A gesture is in hand under this pointer from now on. */
		begin(d: Drag<S>, at: Destination | null) {
			dragRef.current = d;
			setDrag(d);
			setDestination(at);
		},
		/**
		 * Forget a return in flight. A Card picked up again mid-return is
		 * under the pointer from that frame on, and nothing that was taking
		 * it home may still be writing.
		 */
		endReturn() {
			for (const run of returnRun.current) run.stop();
			returnRun.current = [];
			returningRef.current = false;
			setReturning(false);
		},
		settle,
		snapBack,
	};
}

export type GestureState<S> = ReturnType<typeof useGestureState<S>>;
