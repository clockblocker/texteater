import { clampMorph } from "lego";
import { animate, motion, useMotionValue } from "motion/react";
import {
	type CSSProperties,
	type RefObject,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { remPx } from "@/presentation/deck-geometry";
import type { ContentDrawing } from "@/presentation/presentation-content";
import { useDeckReducedMotion } from "@/workspace/motion/reduced-motion";
import { useDeckMotion } from "@/workspace/motion/runtime-config";
import type { Form } from "./subject";
import { useHeadingEdgeSlide } from "./use-note-box";

/**
 * How the Compass moves the parts of a Presentation's content (tf-demo ADR
 * 0006): the foundation says what the parts are, and this draws each as a
 * Motion element.
 *
 * A single `--note-morph` `MotionValue` (`0` = Card, `1` = Sheet), clamped
 * to `[0, 1]`, rides `MORPH` alongside the box and the Heading row's height,
 * starting in `useLayoutEffect` to stay frame-locked with `useNoteBox`.
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
	const { transition, MORPH, HEADING_EDGE, HEADING_RESIZE } = useDeckMotion();
	const reduce = useDeckReducedMotion();
	const targetMorph = form === "sheet" ? 1 : 0;
	const morphProgress = useMotionValue(targetMorph);
	const clampedMorph = useMotionValue(clampMorph(targetMorph));
	const [animating, setAnimating] = useState(false);
	const [layoutEdgeFlip, setLayoutEdgeFlip] = useState(false);

	/* Sync `--note-morph` synchronously on every change instead of via
	   `useTransform`'s async frame step, which can be cancelled on sibling
	   reorders or StrictMode reconnects when `morphProgress.jump()` runs. */
	useLayoutEffect(() => {
		clampedMorph.set(clampMorph(morphProgress.get()));
		return morphProgress.on("change", (value) => {
			clampedMorph.set(clampMorph(value));
		});
	}, [clampedMorph, morphProgress]);

	/**
	 * Track form transitions synchronously during render so Frame 0 sets
	 * `data-morphing` and disables scroll-fold CSS transitions before paint,
	 * and only activate `layout="position"` when `headingAtFoot` (`below`)
	 * actually flips across the morph (keeping it live until settle so mid-
	 * flight re-renders never abort the projection).
	 */
	const previousForm = useRef(form);
	const previousBelow = useRef(below);
	const formChanged = previousForm.current !== form;
	const edgeFlipped = formChanged && previousBelow.current !== below;
	const morphing = !reduce && (formChanged || animating);

	useLayoutEffect(() => {
		const didFormChange = previousForm.current !== form;
		const didEdgeFlip = previousBelow.current !== below;
		previousForm.current = form;
		previousBelow.current = below;
		if (didFormChange && didEdgeFlip && !held && !reduce) {
			setLayoutEdgeFlip(true);
		} else if (held || reduce) {
			setLayoutEdgeFlip(false);
		}
	}, [below, form, held, reduce]);

	useLayoutEffect(() => {
		if (reduce) {
			morphProgress.jump(targetMorph);
			clampedMorph.jump(clampMorph(targetMorph));
			setAnimating(false);
			setLayoutEdgeFlip(false);
			return;
		}
		if (Math.abs(morphProgress.get() - targetMorph) < 1e-4) {
			morphProgress.jump(targetMorph);
			clampedMorph.jump(clampMorph(targetMorph));
			setAnimating(false);
			setLayoutEdgeFlip(false);
			return;
		}
		setAnimating(true);
		let active = true;
		const control = animate(morphProgress, targetMorph, MORPH);
		void control.then(() => {
			if (!active) return;
			morphProgress.jump(targetMorph);
			clampedMorph.jump(clampMorph(targetMorph));
			setAnimating(false);
			setLayoutEdgeFlip(false);
		});
		return () => {
			active = false;
			control.stop();
		};
	}, [MORPH, clampedMorph, morphProgress, reduce, targetMorph]);

	const instant = { duration: 0 } as const;
	const positionSpec = reduce
		? instant
		: morphing
			? MORPH
			: transition(HEADING_EDGE);
	const rowSpec = reduce
		? instant
		: morphing
			? MORPH
			: transition(HEADING_RESIZE);
	const { headingOffset, bodyOffset } = useHeadingEdgeSlide({
		section,
		form,
		below,
		held,
		reduce,
		HEADING_EDGE,
		transition,
	});
	const layout =
		!held && (edgeFlipped || layoutEdgeFlip)
			? ("position" as const)
			: false;
	const layoutDependency = `${form}:${below.toString()}`;

	return {
		morphing,
		surface: (dom) => (
			<motion.div
				{...dom}
				style={
					{
						...dom.style,
						"--note-morph": clampedMorph,
					} as CSSProperties
				}
			/>
		),
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
		scroller: (dom) => (
			<motion.div
				{...dom}
				layout={layout}
				layoutDependency={layoutDependency}
				transition={{ layout: positionSpec }}
				style={{ y: bodyOffset }}
			/>
		),
		fade: (dom) => <div {...dom} />,
	};
}
