import type { PlacementStyle, Presentation } from "compass";
import { motion } from "motion/react";
import {
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
} from "react";
import { cardForm, type PresentationForm } from "@/presentation/form";
import {
	type HeadingControl,
	KeyHandles,
	useHeadingDesign,
} from "@/presentation/heading";
import { PresentationBox } from "@/presentation/presentation-box";
import { PresentationContent } from "@/presentation/presentation-content";
import { restingBorder } from "@/presentation/skin";
import { useDeckReducedMotion } from "@/workspace/motion/reduced-motion";
import { useDeckMotion } from "@/workspace/motion/runtime-config";
import { useContentMotion } from "./content-motion";
import type { Fate, NoteHandle } from "./gesture";
import { useDeckInteractions } from "./interaction-policy";
import type { Form, Place, SubjectRenderer, SubjectView } from "./subject";
import { useNoteBox } from "./use-note-box";

/**
 * What a Note's Segments and Links do, and how it updates its Deck. A
 * Card's Segments and Links do nothing, and a ghost does nothing at all.
 */
export type SheetActions<S> = Pick<
	SubjectView<S>,
	"deal" | "follow" | "liftOnDrag" | "reconcile" | "line" | "walk"
>;

export function inertActions<S>(): SheetActions<S> {
	return {
		deal: () => {},
		follow: () => {},
		liftOnDrag: () => {},
		reconcile: () => {},
		line: null,
		walk: () => {},
	};
}

/** What the gesture in progress says of a Note, for the page and its specs to read. */
function gestureData({
	held,
	swiping,
	fate,
	pastCommit,
	preview,
}: {
	held: boolean;
	swiping: boolean;
	fate: Fate | null;
	pastCommit: boolean;
	preview: boolean;
}) {
	return {
		"data-held": held || undefined,
		"data-arm": held && swiping ? "sweep" : undefined,
		"data-fate": fate ?? undefined,
		"data-past": pastCommit,
		"data-swiping": swiping || undefined,
		"data-preview": preview || undefined,
	};
}

/** The foundation's form for a Presentation the Compass holds this way. */
function shapeOf(
	form: Form,
	place: Place,
	ground: boolean,
	/** It has a ←: a Cover draws its own bar. */
	barred: boolean,
): PresentationForm {
	if (form === "card") return cardForm(place);
	return ground ? "ground" : barred ? "cover" : "sheet";
}

/**
 * Whether a press picks the Note up. A Sheet is handled by its bar, never
 * by its content: a Card is picked up from anywhere, a Sheet's body only
 * scrolls. A Cover's bar is its Heading.
 */
function picksUp(
	event: ReactPointerEvent<HTMLElement>,
	{
		form,
		covered,
		linksDrag,
	}: { form: Form; covered: boolean; linksDrag: boolean },
): boolean {
	const target = event.target as HTMLElement;
	/* a button is a click, except a link in a Cover's title while the
	   links drag: that one is the Heading's to read past the slop */
	if (
		target.closest("button") &&
		!(linksDrag && target.closest("[data-heading-title] button"))
	)
		return false;
	if (covered) return false;
	/* a press on a scrollbar scrolls; it never picks the Note up */
	if (
		target.hasAttribute("data-scroller") &&
		event.nativeEvent.offsetX >= target.clientWidth
	)
		return false;
	return form === "card" || target.closest("[data-heading]") !== null;
}

/**
 * One Presentation, in one of its forms (tf-demo ADR 0006): the Compass's
 * motion around the Presentation foundation, which draws the box and what
 * it holds. Its box is the placement the renderer hands it, as CSS; a new
 * placement is a morph from the old one (`useNoteBox`). The drag
 * transforms sit on top of the box, so a release can fold them in and
 * grow from there. The Subject's parts read `form` and `place` and adapt.
 */
export function PresentationView<S>({
	renderer,
	card,
	form,
	place,
	growsFromTop = false,
	placement,
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
	/**
	 * The open Card rests scaled from its top edge rather than its centre,
	 * when no Card lies below it, so it leaves the Card Tail above it its
	 * whole Heading row.
	 */
	growsFromTop?: boolean;
	/**
	 * Where the Note sits: its Pane's placement for it at rest, or a
	 * measured box while a gesture holds it.
	 */
	placement: PlacementStyle;
	z: number;
	held: boolean;
	/** In hand: what letting go now does to it. */
	fate: Fate | null;
	/** On a Deck being swiped: it moves with the Deck, whichever Card leads. */
	swiping?: boolean;
	/**
	 * On a Deck a release now would sweep: swiped past the line, or its
	 * Card carried into the dismiss zone.
	 */
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
	const { transition, MORPH, OPEN_SCALE, NOTE_BORDER } = useDeckMotion();
	const allows = useDeckInteractions();
	const reduce = useDeckReducedMotion();
	const design = useHeadingDesign();
	const section = useRef<HTMLElement>(null);
	const {
		handle,
		insetInlineStart,
		top,
		width,
		height,
		shownX,
		shownY,
		rotate,
		opacity,
	} = useNoteBox({
		element: section,
		place: placement,
		preview,
		reduce,
		MORPH,
	});
	/**
	 * The open Card rests larger than the ones behind it (`OPEN_SCALE`). It
	 * is a state, not a move: which Card is in front changes at once, with
	 * no pulse. A held Card does not swell, so nothing else scales a Note.
	 */
	const restScale = form === "card" && place === "open" ? OPEN_SCALE : 1;

	useEffect(() => {
		if (preview) return;
		register(card.id, handle.current);
		return () => {
			register(card.id, null);
		};
		/* register is a fresh closure every render; the handle is not */
	}, [card.id, preview]);

	function down(event: ReactPointerEvent<HTMLElement>) {
		if (picksUp(event, { form, covered, linksDrag: design.linksDrag }))
			onDown(event);
	}

	const sheet = form === "sheet";
	const below = place === "below" && !sheet;
	const shape = shapeOf(form, place, ground, back !== null);
	const draw = useContentMotion({ section, form, below, held });
	const opens = fate === "open" || preview;
	/* a Cover's Heading is its lift handle, unless another Sheet covers it */
	const grabs = shape === "cover" && !covered && !preview;
	/* the border is the Card's fate: blue where letting go opens it, red
	   on a Deck a release would sweep, and its resting colour otherwise.
	   A Card that would leave also dims; see `LEAVING`. */
	const borderColor = pastCommit
		? "var(--destructive)"
		: opens
			? "var(--link)"
			: restingBorder(shape);
	const subject = card.subject;
	const view = (as: Form): SubjectView<S> => ({
		form: as,
		place,
		ground,
		lit,
		...actions,
	});

	return (
		<PresentationBox
			as={motion.article}
			form={shape}
			lift={held ? 1 : 0}
			ref={section}
			aria-label={`${renderer.label(subject)} ${ground ? "ground" : sheet ? "sheet" : "card"}`}
			data-card-id={card.id}
			data-form={ground ? "ground" : form}
			data-place={sheet ? undefined : place}
			{...gestureData({ held, swiping, fate, pastCommit, preview })}
			data-pane={paneId}
			data-sheet-id={sheetId ?? undefined}
			/* The border is the arm state. A Note is dealt wearing its
			   resting colour; only arming changes it. */
			initial={false}
			animate={{ borderColor }}
			transition={transition(NOTE_BORDER)}
			style={{
				insetInlineStart,
				top,
				width,
				height,
				x: shownX,
				y: shownY,
				rotate,
				scale: restScale,
				originY: growsFromTop ? 0 : 0.5,
				opacity,
				zIndex: z,
				...(preview ? { borderStyle: "dashed" } : {}),
			}}
			onPointerDown={down}
			/* the shadow follows the lift as a state: it is no part of a
			   move, so it rides no spring */
			className={`${preview ? "pointer-events-none" : "pointer-events-auto"} absolute transition-shadow duration-200 ease-out`}
		>
			<PresentationContent
				form={shape}
				columnRem={renderer.columnRem(subject)}
				heading={{
					card: renderer.render(subject, view("card"), "heading"),
					cover: renderer.render(subject, view("sheet"), "heading"),
				}}
				body={renderer.render(subject, view(form), "body")}
				chrome={{ back, clear }}
				grab={grabs && allows("lift")}
				keys={
					keys.length && !preview ? (
						<KeyHandles controls={keys} />
					) : null
				}
				quiet={preview}
				draw={draw}
			/>
		</PresentationBox>
	);
}
