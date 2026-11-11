import { AnimatePresence, motion } from "motion/react";
import { type RefObject, useEffect, useRef } from "react";
import { remPx } from "@/presentation/deck-geometry";
import type { ContentDrawing } from "@/presentation/presentation-content";
import { after } from "@/workspace/motion/motion-spec";
import { useDeckReducedMotion } from "@/workspace/motion/reduced-motion";
import { useDeckMotion } from "@/workspace/motion/runtime-config";
import type { Form } from "./subject";
import { useHeadingEdgeSlide } from "./use-note-box";

/**
 * How the Compass moves the parts of a Presentation's content (tf-demo ADR
 * 0006): the foundation says what the parts are, and this draws each as a
 * Motion element.
 *
 * The Heading row is one element whose height rides `MORPH` with the
 * Note's box, so the Cover's top edge is the Note's own edge in every
 * frame. Only the words change: the face leaving goes on `BAR_EXIT`, the
 * one arriving overlaps it on `BAR_ENTER`, and the row between them never
 * fades. A change of height with no change of form, a fold, rides
 * `HEADING_RESIZE`. The Blocks travel with the Heading: the row it
 * vacates is the row they take. The Card's clip fades its content out on
 * `CLIP_FADE`; the Sheet lifts the fade.
 */
export function useContentMotion({
	section,
	form,
	below,
	held,
}: {
	/** The Note's element, which holds the Heading row and the scroller. */
	section: RefObject<HTMLElement | null>;
	form: Form;
	/** A Card folded below the open one: its Heading sits at its lower edge. */
	below: boolean;
	held: boolean;
}): ContentDrawing {
	const {
		transition,
		MORPH,
		HEADING_EDGE,
		HEADING_RESIZE,
		BAR_ENTER,
		BAR_EXIT,
		CLIP_FADE,
	} = useDeckMotion();
	const reduce = useDeckReducedMotion();
	/**
	 * Which transition the Heading and the Blocks ride when they swap ends.
	 * A change of form is a morph on `MORPH`; a deck tap changes only which
	 * edge the Heading sits at, on `HEADING_EDGE`.
	 */
	const previousForm = useRef(form);
	const morphing = previousForm.current !== form;
	useEffect(() => {
		previousForm.current = form;
	}, [form]);
	const positionSpec = morphing ? MORPH : transition(HEADING_EDGE);
	const rowSpec = morphing ? MORPH : transition(HEADING_RESIZE);
	const { headingOffset, bodyOffset } = useHeadingEdgeSlide({
		section,
		form,
		below,
		held,
		reduce,
		HEADING_EDGE,
		transition,
	});
	const layout = !held && morphing ? ("position" as const) : false;
	const layoutDependency = `${form}:${below.toString()}`;
	/* the two faces overlap for a beat, and a touch of blur makes the
	   overlap read as one title turning rather than two stacked. Reduced,
	   the box is already there, so the words do not wait for it */
	const turn = {
		initial: { opacity: 0, filter: "blur(2px)" },
		animate: {
			opacity: 1,
			filter: "blur(0px)",
			transition: transition(reduce ? after(BAR_ENTER, 0) : BAR_ENTER),
		},
		exit: {
			opacity: 0,
			filter: "blur(2px)",
			transition: transition(BAR_EXIT),
		},
	};
	return {
		row: (dom, { face, heightRem }) => (
			<motion.div
				{...dom}
				/* `initial={false}`: a Note is dealt at its size; only a
				   change of form is a move. */
				initial={false}
				layout={layout}
				layoutDependency={layoutDependency}
				transition={{ ...rowSpec, layout: positionSpec }}
				animate={{
					height: heightRem * remPx(),
					opacity: face ? 1 : 0,
				}}
				style={{ ...dom.style, y: headingOffset }}
			/>
		),
		faces: (face) => (
			<AnimatePresence initial={false}>{face}</AnimatePresence>
		),
		face: (dom, face) => <motion.div key={face} {...dom} {...turn} />,
		scroller: (dom) => (
			<motion.div
				{...dom}
				layout={layout}
				layoutDependency={layoutDependency}
				transition={{ layout: positionSpec }}
				style={{ y: bodyOffset }}
			/>
		),
		fade: (dom, shown) => (
			<motion.div
				{...dom}
				initial={false}
				animate={{ opacity: shown ? 1 : 0 }}
				transition={transition(CLIP_FADE)}
			/>
		),
	};
}
