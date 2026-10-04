import { animate, motion, useMotionValue, useTransform } from "motion/react";
import {
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useLayoutEffect,
	useRef,
} from "react";
import type { Box, Presentation } from "react-resizable-panels/workspace";
import { useDeckReducedMotion } from "@/workspace/motion/reduced-motion";
import { useDeckMotion } from "@/workspace/motion/runtime-config";
import type { Fate, NoteHandle } from "./gesture";
import {
	coverHeadingRem,
	HeadingBlock,
	type HeadingControl,
	KeyHandles,
	useFolded,
	useHeadingDesign,
} from "./heading";
import { useDeckInteractions } from "./interaction-policy";
import { sheetColumn } from "./layout";
import type { Form, Place, SubjectRenderer, SubjectView } from "./subject";

/** What a Note's Segments and Links do; a Card's and a ghost's do nothing. */
export type SheetActions<S> = Pick<
	SubjectView<S>,
	"deal" | "follow" | "liftOnDrag"
>;

export function inertActions<S>(): SheetActions<S> {
	return { deal: () => {}, follow: () => {}, liftOnDrag: () => {} };
}

/**
 * One Presentation, in one of its forms (tf-demo ADR 0006). Its box is
 * four motion values that animate to whatever target the renderer hands
 * it; the drag transforms sit on top of the box, so a release can fold
 * them in and grow from there. The Subject's parts read `form` and
 * `place` and adapt.
 */
export function PresentationView<S>({
	renderer,
	card,
	form,
	place,
	box,
	z,
	held,
	fate,
	swiping = false,
	pastCommit,
	paneId,
	sheetId,
	ground,
	covered = false,
	preview = false,
	epoch,
	lit,
	register,
	back = null,
	clear = null,
	keys = [],
	actions,
	onDown,
}: {
	renderer: SubjectRenderer<S>;
	card: Presentation<S>;
	form: Form;
	place: Place;
	box: Box;
	z: number;
	held: boolean;
	/** In hand: what letting go now does to it. */
	fate: Fate | null;
	/** On a Deck being swiped: it moves with the Deck, whichever Card leads. */
	swiping?: boolean;
	/** On a swiped Deck that a release now would sweep. */
	pastCommit: boolean;
	paneId: string;
	/** The Sheet this is, when it is one; a Deck can belong to it. */
	sheetId: string | null;
	/** A Ground fills its Pane and wears no Card chrome. */
	ground: boolean;
	/** A Sheet under another Sheet in the same Pane. */
	covered?: boolean;
	/** A ghost: the Sheet a drop would make, where it would sit; seen, never touched. */
	preview?: boolean;
	/** The Panes' measurement pass; see `layoutEpoch` in `usePaneBoxes`. */
	epoch: number;
	/** The selection this Sheet's Deck was dealt for. */
	lit: string | null;
	register: (id: string, handle: NoteHandle | null) => void;
	/** A Cover's ←, drawn in its Heading; a Ground's is on the Pane bar. */
	back?: HeadingControl | null;
	/** A Cover's ×, drawn in its Heading's inline-end gutter. */
	clear?: HeadingControl | null;
	/** The keyboard's Lift and Expand for this Note. */
	keys?: readonly (HeadingControl & { readonly text: string })[];
	actions: SheetActions<S>;
	onDown: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
	const {
		transition,
		MORPH,
		OPEN_SCALE,
		HEADING_EDGE,
		NOTE_BORDER,
		CLIP_FADE,
	} = useDeckMotion();
	const allows = useDeckInteractions();
	const reduce = useDeckReducedMotion();
	const design = useHeadingDesign();
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
	 * The open Card rests larger than the ones behind it (`OPEN_SCALE`). It
	 * is a state, not a move: which Card is in front changes at once, with
	 * no pulse. A held Card does not swell, so nothing else scales a Note.
	 */
	const restScale = form === "card" && place === "open" ? OPEN_SCALE : 1;
	/**
	 * The box's origin travels as a transform, not as `left`/`top`, so two
	 * of the four properties on MORPH leave the layout path; `width` and
	 * `height` have to stay, because a Note genuinely reflows its text
	 * between a Card and a Sheet. The drag offset rides along in the same
	 * translate, so the two cannot fight over it.
	 */
	const shownX = useTransform(() => left.get() + x.get());
	const shownY = useTransform(() => top.get() + y.get());
	const section = useRef<HTMLElement>(null);

	useEffect(() => {
		if (preview) return;
		register(card.id, handle.current);
		return () => {
			register(card.id, null);
		};
		/* register is a fresh closure every render; the handle is not */
	}, [card.id, preview]);

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

	function down(event: ReactPointerEvent<HTMLElement>) {
		const target = event.target as HTMLElement;
		/* a button is a click, except a link in a Cover's title while the
		   links drag: that one is the Heading's to read past the slop */
		if (
			target.closest("button") &&
			!(design.linksDrag && target.closest("[data-heading-title] button"))
		)
			return;
		if (covered) return;
		/* a press on a scrollbar scrolls; it never picks the Note up */
		if (
			target.hasAttribute("data-scroller") &&
			event.nativeEvent.offsetX >= target.clientWidth
		)
			return;
		/* a Sheet is handled by its bar, never by its content: a Card is
		   picked up from anywhere, a Sheet's body only scrolls. A Cover's
		   bar is its Heading. */
		if (form === "card" || target.closest("[data-heading]")) onDown(event);
	}

	const sheet = form === "sheet";
	const below = place === "below" && !sheet;
	/* the open Card reads through its body as a Sheet does; the folded
	   ones show only their Headings */
	const scrolls = sheet || place === "open";
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
	/* the border is the Card's fate: blue where letting go opens it, red
	   on a swiped Deck a release would sweep, and its resting colour
	   otherwise. A Card that would leave also dims; see `LEAVING`. */
	const borderColor =
		swiping && pastCommit
			? "var(--destructive)"
			: fate === "open" || preview
				? "var(--link)"
				: ground
					? "transparent"
					: "var(--line-strong)";
	const subject = card.subject;
	const dataForm = ground ? "ground" : form;
	const isCover = sheet && !ground && back !== null;
	const folded = useFolded(section, isCover);
	const columnRem = renderer.columnRem(subject);
	const { column, body: coverWidth } = sheetColumn(columnRem, sheet);
	const view = (as: Form): SubjectView<S> => ({
		form: as,
		place,
		ground,
		lit,
		...actions,
	});

	return (
		<motion.article
			ref={section}
			aria-label={`${renderer.label(subject)} ${ground ? "ground" : sheet ? "sheet" : "card"}`}
			data-card-id={card.id}
			data-form={dataForm}
			data-place={sheet ? undefined : place}
			data-held={held || undefined}
			data-arm={held && swiping ? "sweep" : undefined}
			data-fate={fate ?? undefined}
			data-past={pastCommit}
			data-swiping={swiping || undefined}
			data-pane={paneId}
			data-sheet-id={sheetId ?? undefined}
			data-preview={preview || undefined}
			/* The border is the arm state. A Note is dealt wearing its
			   resting colour; only arming changes it. */
			initial={false}
			animate={{ borderColor }}
			transition={transition(NOTE_BORDER)}
			style={{
				left: 0,
				top: 0,
				width,
				height,
				x: shownX,
				y: shownY,
				rotate,
				scale: restScale,
				opacity,
				zIndex: z,
				...(preview ? { borderStyle: "dashed" } : {}),
			}}
			onPointerDown={down}
			/* `contain` stops the width/height spring's recalc at this Note
			   rather than letting it walk the deck */
			className={`${preview ? "pointer-events-none" : "pointer-events-auto"} absolute flex flex-col overflow-hidden border bg-paper [contain:layout_paint] select-none ${ground ? "" : "rounded-[0.9rem]"} ${sheet ? "" : "cursor-grab touch-none active:cursor-grabbing"}`}
		>
			{/* the content column: one width in every form, centred inside a
			    Heading and a scroller that both span the Pane, so the scrollbar
			    sits at the Pane's edge, not the column's. A ghost's ink is
			    quiet, on paper as opaque as any: nothing shows through */}
			<div
				className={`flex min-h-0 w-full flex-1 flex-col ${preview ? "opacity-50" : ""}`}
			>
				<HeadingBlock
					form={form}
					ground={ground}
					back={back}
					clear={clear}
					coverRem={coverHeadingRem(folded)}
					coverWidth={coverWidth}
					folded={folded}
					cardTitle={renderer.render(
						subject,
						view("card"),
						"heading",
					)}
					coverTitle={renderer.render(
						subject,
						view("sheet"),
						"heading",
					)}
					keys={
						keys.length && !preview ? (
							<KeyHandles controls={keys} />
						) : null
					}
					morphing={morphing}
					grab={
						sheet &&
						!ground &&
						!covered &&
						!preview &&
						allows("lift")
					}
					atBottom={below}
					layout={!held && morphing}
					offset={headingOffset}
					positionSpec={positionSpec}
					column={column}
				/>
				{/* the Blocks travel with the Heading: the row it vacates is
				    the row they take */}
				<motion.div
					data-scroller=""
					layout={!held && morphing ? "position" : false}
					style={{ y: bodyOffset }}
					layoutDependency={`${form}:${below.toString()}`}
					transition={{ layout: positionSpec }}
					className={`relative order-1 min-h-0 flex-1 ${scrolls ? "overflow-y-auto" : "overflow-hidden"}`}
				>
					{renderer.render(subject, view(form), "body")}
					{/* the Card's clip fades its content out; the Sheet lifts the fade */}
					<motion.div
						aria-hidden="true"
						initial={false}
						animate={{ opacity: sheet || below ? 0 : 1 }}
						transition={transition(CLIP_FADE)}
						className="pointer-events-none sticky bottom-0 -mt-8 h-8 bg-gradient-to-t from-paper to-transparent"
					/>
				</motion.div>
			</div>
		</motion.article>
	);
}
