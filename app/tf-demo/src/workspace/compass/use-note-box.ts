import type { Box, PlacementStyle } from "compass";
import {
	type AnimationPlaybackControls,
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

function samePlace(a: PlacementStyle, b: PlacementStyle): boolean {
	return (
		a.insetInlineStart === b.insetInlineStart &&
		a.top === b.top &&
		a.width === b.width &&
		a.height === b.height
	);
}

/** A size as CSS: its place's, plus the morph's offset from it in px. */
function offsetSize(place: string, by: number): string {
	return `calc(${place} + ${by.toString()}px)`;
}

/**
 * The Note's box as laid out now, in its containing block's px: its
 * place plus the morph's size offset, transforms aside. `null` where the
 * page does no layout.
 */
function laidOut(element: HTMLElement): Box | null {
	const style = getComputedStyle(element);
	const box = {
		left: Number.parseFloat(style.left),
		top: Number.parseFloat(style.top),
		width: Number.parseFloat(style.width),
		height: Number.parseFloat(style.height),
	};
	return Object.values(box).every(Number.isFinite) ? box : null;
}

/**
 * Where `place` puts a box beside `note`, in the same containing block,
 * read off an empty stand-in: the Note itself is never laid out at a size
 * it will not be painted at.
 */
function placedBox(note: HTMLElement, place: PlacementStyle): Box | null {
	const parent = note.parentElement;
	if (!parent) return null;
	const probe = document.createElement("div");
	probe.setAttribute("aria-hidden", "true");
	Object.assign(probe.style, {
		position: "absolute",
		visibility: "hidden",
		pointerEvents: "none",
		boxSizing: "border-box",
		...place,
	});
	parent.append(probe);
	const box = laidOut(probe);
	probe.remove();
	return box;
}

/** Below this many px, a morph's offset is no offset. */
const SAME_PX = 0.01;

/**
 * A Note's box. At rest it is its `place`: CSS the browser resolves
 * against the Note's Pane, in the same layout pass as the Pane, so a
 * zoom, a window resize or a Split resize moves the Note with its Pane
 * and never draws it in the Pane's old box (tf-demo ADR 0012).
 *
 * A move is a morph from where the Note was: when `place` changes, the
 * Note is laid out at its new place, offset back to its old box in px,
 * and the offset animates to nothing. The offset's origin travels as a
 * transform; its size goes into `width` and `height` as a `calc()` over
 * the place, because a Note genuinely reflows its text between a Card
 * and a Sheet. Nothing is measured at rest: only a morph reads the page,
 * once, as it starts. A preview, and any move under reduced motion, is
 * placed at once.
 *
 * The drag transforms sit on top of the box, so a release can fold them
 * in and grow from there. The handle is what the gesture code moves; the
 * style values are what the Note draws.
 */
export function useNoteBox({
	element,
	place,
	preview,
	reduce,
	MORPH,
}: {
	/** The Note's element, which the box is drawn on. */
	element: RefObject<HTMLElement | null>;
	place: PlacementStyle;
	preview: boolean;
	reduce: boolean;
	MORPH: Transition;
}): {
	handle: RefObject<NoteHandle>;
	insetInlineStart: MotionValue<string>;
	top: MotionValue<string>;
	width: MotionValue<string>;
	height: MotionValue<string>;
	shownX: MotionValue<number>;
	shownY: MotionValue<number>;
	rotate: MotionValue<number>;
	opacity: MotionValue<number>;
} {
	const insetInlineStart = useMotionValue(place.insetInlineStart);
	const top = useMotionValue(place.top);
	const placeWidth = useMotionValue(place.width);
	const placeHeight = useMotionValue(place.height);
	/** The morph's offset from the place, in px; nothing at rest. */
	const offset = {
		x: useMotionValue(0),
		y: useMotionValue(0),
		width: useMotionValue(0),
		height: useMotionValue(0),
	};
	const width = useTransform(() =>
		offsetSize(placeWidth.get(), offset.width.get()),
	);
	const height = useTransform(() =>
		offsetSize(placeHeight.get(), offset.height.get()),
	);
	const x = useMotionValue(0);
	const y = useMotionValue(0);
	const rotate = useMotionValue(0);
	/* A dealt Note is simply there: opaque on its first frame, never faded. */
	const opacity = useMotionValue(1);
	const shownX = useTransform(() => offset.x.get() + x.get());
	const shownY = useTransform(() => offset.y.get() + y.get());
	const running = useRef<AnimationPlaybackControls[]>([]);

	function stop() {
		for (const control of running.current) control.stop();
		running.current = [];
	}
	/**
	 * Writes the box to the element now, as Motion would on its next
	 * frame, so what the page lays out next agrees with the motion values.
	 */
	function paint(target: HTMLElement) {
		target.style.insetInlineStart = insetInlineStart.get();
		target.style.top = top.get();
		target.style.width = offsetSize(placeWidth.get(), offset.width.get());
		target.style.height = offsetSize(
			placeHeight.get(),
			offset.height.get(),
		);
	}
	/** The box the Note shows now, drag offset aside. */
	function shown(target: HTMLElement): Box | null {
		const box = laidOut(target);
		return box
			? {
					...box,
					left: box.left + offset.x.get(),
					top: box.top + offset.y.get(),
				}
			: null;
	}
	/** The Note sits at its place, with no offset. */
	function rest() {
		stop();
		for (const value of Object.values(offset)) value.jump(0);
	}
	/**
	 * The Note shows at `from` now and morphs to its place from there.
	 * Reduced, it is at its place at once.
	 */
	function morphFrom(from: Box) {
		rest();
		const target = element.current;
		if (!target) return;
		/* measured before anything is written, so the Note is laid out
		   only at the box it shows */
		const to = reduce
			? null
			: placedBox(target, {
					insetInlineStart: insetInlineStart.get(),
					top: top.get(),
					width: placeWidth.get(),
					height: placeHeight.get(),
				});
		if (to) {
			offset.width.jump(from.width - to.width);
			offset.height.jump(from.height - to.height);
			/* in right-to-left text the place holds the right edge, so a
			   size offset moves the left one */
			const rtl = getComputedStyle(target).direction === "rtl";
			offset.x.jump(
				from.left - (rtl ? to.left - offset.width.get() : to.left),
			);
			offset.y.jump(from.top - to.top);
			const controls: AnimationPlaybackControls[] = [];
			for (const value of Object.values(offset)) {
				if (Math.abs(value.get()) < SAME_PX) value.jump(0);
				else controls.push(animate(value, 0, MORPH));
			}
			running.current = controls;
		}
		paint(target);
	}

	/* the handle outlives renders; a morph must run on this one's motion */
	const latestMorph = useRef(morphFrom);
	latestMorph.current = morphFrom;
	const handle = useRef<NoteHandle>({
		x,
		y,
		rotate,
		opacity,
		box: () => {
			const target = element.current;
			return (
				(target && shown(target)) ?? {
					left: 0,
					top: 0,
					width: 0,
					height: 0,
				}
			);
		},
		morphFrom: (box) => latestMorph.current(box),
	});

	/* a new place: from wherever the Note shows now, morph there */
	const placed = useRef(place);
	useLayoutEffect(() => {
		if (samePlace(placed.current, place)) return;
		placed.current = place;
		const target = element.current;
		const from = target && !preview ? shown(target) : null;
		rest();
		insetInlineStart.jump(place.insetInlineStart);
		top.jump(place.top);
		placeWidth.jump(place.width);
		placeHeight.jump(place.height);
		if (from) morphFrom(from);
		else if (target) paint(target);
	});
	useEffect(() => stop, []);

	return {
		handle,
		insetInlineStart,
		top,
		width,
		height,
		shownX,
		shownY,
		rotate,
		opacity,
	};
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
