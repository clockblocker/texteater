import { animate, type MotionValue } from "motion/react";
import type { Box, WritingDirection } from "react-resizable-panels/workspace";
import { useDeckReducedMotion } from "@/workspace/motion/reduced-motion";
import { useDeckMotion } from "@/workspace/motion/runtime-config";
import { inlineSign, type NoteHandle } from "./gesture";

/**
 * The imperative moves a gesture makes on a Note's motion values. Every
 * `animate()` here is unreachable by CSS and by `MotionConfig`, so each
 * move says what it does under reduced motion; see `reduced-motion.ts`.
 */
export function useNoteMoves() {
	const {
		transition,
		SPRING,
		MORPH,
		FLY_DISTANCE,
		FLY_ROTATE_TO,
		FLY_TRAVEL,
		FLY_ROTATE,
		FLY_FADE,
	} = useDeckMotion();
	const reduce = useDeckReducedMotion();

	/** Back to rest on the drag spring; reduced, at once. */
	function toRest(value: MotionValue<number>) {
		if (reduce) value.jump(0);
		else animate(value, 0, SPRING);
	}

	return {
		reduce,
		toRest,
		/** The drag transforms off: the Note sits in its box, upright and opaque. */
		resetTransforms(h: NoteHandle) {
			h.x.jump(0);
			h.y.jump(0);
			h.rotate.jump(0);
			h.opacity.jump(1);
		},
		/**
		 * Put the Card's tilt back where it rests. Reduced motion takes it
		 * there at once: the tilt says nothing the border and the label are
		 * not already saying.
		 */
		settleTilt(h: NoteHandle) {
			toRest(h.rotate);
		},
		/** Where the Note is drawn now, drag offset aside. */
		boxOf(h: NoteHandle): Box {
			return {
				left: h.left.get(),
				top: h.top.get(),
				width: h.width.get(),
				height: h.height.get(),
			};
		},
		/**
		 * A Card leaving for good, toward inline-start. Reduced motion keeps
		 * the fade and drops the travel: the Card still visibly leaves, it
		 * just does not fly across the page.
		 *
		 * The travel spring picks up the speed `h.x` already has, so a
		 * flicked Card leaves at the hand's pace. The flight is over when
		 * the Card has faded and turned; the travel's long tail is out of
		 * sight by then.
		 */
		flight(h: NoteHandle, direction: WritingDirection): Promise<unknown> {
			if (reduce)
				return Promise.all([
					animate(h.opacity, 0, transition(FLY_FADE)),
				]);
			const sign = inlineSign(direction);
			const travel = animate(
				h.x,
				h.x.get() - sign * FLY_DISTANCE,
				transition(FLY_TRAVEL),
			);
			return Promise.all([
				animate(h.rotate, sign * FLY_ROTATE_TO, transition(FLY_ROTATE)),
				animate(h.opacity, 0, transition(FLY_FADE)),
			]).then(() => travel.stop());
		},
		/** A Card that goes where it is: it fades. */
		fade(h: NoteHandle): Promise<unknown> {
			return Promise.all([animate(h.opacity, 0, transition(FLY_FADE))]);
		},
		/**
		 * The Note stays exactly where the hand left it and grows from
		 * there: its drag offset is folded into its box, so the next box it
		 * is given is a morph from the hand.
		 */
		foldOffset(h: NoteHandle) {
			/* jump, not set: a set would hand the spring the drag's velocity */
			h.left.jump(h.left.get() + h.x.get());
			h.top.jump(h.top.get() + h.y.get());
			h.x.jump(0);
			h.y.jump(0);
			if (reduce) h.rotate.jump(0);
			else animate(h.rotate, 0, MORPH);
		},
		/** The box jumps to `box`: a Sheet lifted by its bar emerges from the bar. */
		jumpTo(h: NoteHandle, box: Box) {
			h.left.jump(box.left);
			h.top.jump(box.top);
			h.width.jump(box.width);
			h.height.jump(box.height);
		},
	};
}

export type NoteMoves = ReturnType<typeof useNoteMoves>;
