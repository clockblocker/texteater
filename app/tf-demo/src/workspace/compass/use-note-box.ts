import type { Box } from "compass";
import {
	animate,
	type MotionValue,
	useMotionValue,
	useTransform,
} from "motion/react";
import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";
import type { motionOf, Spec, Tween } from "@/workspace/motion/motion-spec";
import type { NoteHandle } from "./gesture";
import type { Form } from "./subject";

type Transition = ReturnType<typeof motionOf>;

/**
 * A Note's box: four motion values that animate to whatever target the
 * renderer hands it, with the drag transforms on top, so a release can
 * fold them in and grow from there. The handle is what the gesture code
 * moves; the style values are what the Note draws.
 */
export function useNoteBox({
	box,
	form,
	epoch,
	preview,
	reduce,
	MORPH,
}: {
	box: Box;
	form: Form;
	/** The Panes' measurement pass; see `layoutEpoch` in `usePaneBoxes`. */
	epoch: number;
	preview: boolean;
	reduce: boolean;
	MORPH: Transition;
}): {
	handle: RefObject<NoteHandle>;
	width: MotionValue<number>;
	height: MotionValue<number>;
	shownX: MotionValue<number>;
	shownY: MotionValue<number>;
	rotate: MotionValue<number>;
	opacity: MotionValue<number>;
} {
	const left = useMotionValue(box.left);
	const top = useMotionValue(box.top);
	const width = useMotionValue(box.width);
	const height = useMotionValue(box.height);
	const x = useMotionValue(0);
	const y = useMotionValue(0);
	const rotate = useMotionValue(0);
	/* A dealt Note is simply there: opaque on its first frame, never faded. */
	const opacity = useMotionValue(1);
	const handle = useRef<NoteHandle>({
		left,
		top,
		width,
		height,
		x,
		y,
		rotate,
		opacity,
	});
	/**
	 * The box's origin travels as a transform, not as `left`/`top`, so two
	 * of the four properties on MORPH leave the layout path; `width` and
	 * `height` have to stay, because a Note genuinely reflows its text
	 * between a Card and a Sheet. The drag offset rides along in the same
	 * translate, so the two cannot fight over it.
	 */
	const shownX = useTransform(() => left.get() + x.get());
	const shownY = useTransform(() => top.get() + y.get());

	/* the box: animate to wherever the renderer puts the Note now. A
	   preview is placed, never moved: it appears where it will be, at
	   once. And a box that changed because the Panes were re-measured,
	   with the form unchanged, is a resize, not a move: the Note is where
	   its Pane put it, at once. A change of form in the same pass is still
	   a morph. */
	const boxPass = useRef({ form, epoch });
	useEffect(() => {
		const previous = boxPass.current;
		boxPass.current = { form, epoch };
		const resized = previous.epoch !== epoch && previous.form === form;
		if (reduce || preview || resized) {
			left.jump(box.left);
			top.jump(box.top);
			width.jump(box.width);
			height.jump(box.height);
			return;
		}
		const controls = [
			animate(left, box.left, MORPH),
			animate(top, box.top, MORPH),
			animate(width, box.width, MORPH),
			animate(height, box.height, MORPH),
		];
		return () => {
			for (const control of controls) control.stop();
		};
	}, [
		box.left,
		box.top,
		box.width,
		box.height,
		left,
		top,
		width,
		height,
		reduce,
		preview,
		epoch,
		form,
		MORPH,
	]);

	return { handle, width, height, shownX, shownY, rotate, opacity };
}

/**
 * The Heading and the Blocks sliding when a Card's place flips between
 * open and below with its form unchanged: they are laid out at their new
 * ends at once, then offset back to where they were and animated home on
 * `HEADING_EDGE`. A held Card, reduced motion or a zero-length edge
 * jumps.
 */
export function useHeadingEdgeSlide({
	section,
	form,
	below,
	held,
	reduce,
	HEADING_EDGE,
	transition,
}: {
	section: RefObject<HTMLElement | null>;
	form: Form;
	below: boolean;
	held: boolean;
	reduce: boolean;
	HEADING_EDGE: Tween;
	transition: (value: Spec) => Transition;
}): {
	headingOffset: MotionValue<number>;
	bodyOffset: MotionValue<number>;
} {
	const headingOffset = useMotionValue(0);
	const bodyOffset = useMotionValue(0);
	const previousPositions = useRef<{
		form: Form;
		below: boolean;
		heading: number;
		body: number;
	} | null>(null);
	useLayoutEffect(() => {
		const heading =
			section.current?.querySelector<HTMLElement>("[data-heading]");
		const body =
			section.current?.querySelector<HTMLElement>("[data-scroller]");
		if (!heading || !body) return;
		const previous = previousPositions.current;
		previousPositions.current = {
			form,
			below,
			heading: heading.offsetTop,
			body: body.offsetTop,
		};
		if (
			previous?.form === form &&
			previous.below !== below &&
			!held &&
			!reduce &&
			HEADING_EDGE.ms > 0
		) {
			headingOffset.set(
				headingOffset.get() + previous.heading - heading.offsetTop,
			);
			bodyOffset.set(bodyOffset.get() + previous.body - body.offsetTop);
			const controls = [
				animate(headingOffset, 0, transition(HEADING_EDGE)),
				animate(bodyOffset, 0, transition(HEADING_EDGE)),
			];
			return () => {
				for (const control of controls) control.stop();
			};
		}
		headingOffset.jump(0);
		bodyOffset.jump(0);
	}, [
		below,
		form,
		held,
		reduce,
		HEADING_EDGE,
		transition,
		headingOffset,
		bodyOffset,
	]);
	return { headingOffset, bodyOffset };
}
