import {
	AnimatePresence,
	animate,
	type MotionValue,
	motion,
	useMotionValue,
	useTransform,
} from "motion/react";
import {
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useLayoutEffect,
	useRef,
} from "react";
import { BodyBlock, ContextsBlock, LinksBlock, TextBlock } from "./blocks";
import type { NoteLink } from "./dummy";
import { remPx, sheetColumn } from "./geometry";
import {
	coverHeadingRem,
	ONE_LINE_TITLE,
	SheetChrome,
	useFolded,
	useHeadingDesign,
} from "./heading-design";
import { useDeckInteractions } from "./interaction-policy";
import {
	type Box,
	type CoverBack,
	type Fate,
	type NoteForm,
	type NoteHandle,
	type Place,
	type Presentation,
	type Subject,
	subjectGloss,
	subjectLabel,
} from "./model";
import { HEADER_REM, type motionOf } from "./motion-spec";
import {
	PortedBlocks,
	PortedTitle,
	usePortedFollow,
	usePortedReading,
} from "./real-note";
import { useDeckReducedMotion } from "./reduced-motion";
import { useDeckMotion } from "./runtime-config";

/** A Presentation, drawn in whatever form it is in: `PresentationView` and its Heading. */

/**
 * One Presentation, in one of its forms. Its box is four motion values
 * that animate to whatever target the model hands it; the drag transforms
 * sit on top of the box, so a release can fold them in and grow from there.
 * The Blocks inside read `form` and `place` and adapt.
 */
export function PresentationView({
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
	showText,
	litWord,
	register,
	back = null,
	clear = null,
	onDown,
	onFollow,
	onSegment,
	onSegmentDown,
}: {
	card: Presentation;
	form: NoteForm;
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
	sheetId: number | null;
	/** A Ground fills its Pane and wears no Card chrome. */
	ground: boolean;
	/** A Sheet under another Sheet in the same Pane. */
	covered?: boolean;
	/** A ghost: the Sheet a drop would make, where it would sit; seen, never touched. */
	preview?: boolean;
	/** The Panes' measurement pass; see `layoutEpoch`. */
	epoch: number;
	/** A Text Ground with the reader hidden: the workbench's quiet scenes. */
	showText: boolean;
	/** The word this Sheet's Deck was dealt for, lit in its Segments. */
	litWord: string | null;
	register: (id: number, handle: NoteHandle | null) => void;
	/** A Cover's ←, drawn in its Heading; a Ground's is on the Pane bar. */
	back?: CoverBack | null;
	/** A Cover's ×, drawn in its Heading's right margin. */
	clear?: CoverBack | null;
	onDown: (event: ReactPointerEvent<HTMLElement>) => void;
	onFollow: (link: NoteLink) => void;
	onSegment: (word: string, element: HTMLElement) => void;
	onSegmentDown: (
		event: ReactPointerEvent<HTMLElement>,
		make: () => Subject,
	) => void;
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
	const scale = useMotionValue(1);
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
		scale,
		opacity,
	});
	/**
	 * The open Card rests larger than the ones behind it (`OPEN_SCALE`). It
	 * is a state, not a move: which Card is in front changes at once, with
	 * no pulse. `scale` stays the raw value the drag animates, and the two
	 * are multiplied on the way to the DOM.
	 */
	const restScale = form === "card" && place === "open" ? OPEN_SCALE : 1;
	const shownScale = useTransform(() => scale.get() * restScale);
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

	/* the box: animate to wherever the model puts the Note now. A preview
	   is placed, never moved: it appears where it will be, at once. And a
	   box that changed because the Panes were re-measured, with the form
	   unchanged, is a resize, not a move: the Note is where its Pane put
	   it, at once. A change of form in the same pass is still a morph. */
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
		/* a Sheet is handled by its bar, never by its content: a Card is
		   picked up from anywhere, a Sheet's body only scrolls. A Cover's
		   bar is its Heading. */
		if (form === "card" || target.closest("[data-heading]")) onDown(event);
	}

	const sheet = form === "sheet";
	const below = place === "below" && !sheet;
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
		form: NoteForm;
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
	const note = subject.kind === "Note" ? subject.note : null;
	const ported = usePortedReading(note);
	const portedFollow = usePortedFollow(note?.word ?? "", onFollow);
	const isCover = sheet && !ground && back !== null;
	const folded = useFolded(section, isCover);
	const {
		column,
		gutterRem,
		body: bodyWidth,
		title: coverWidth,
	} = sheetColumn(subject, sheet, ported !== null);
	const titles = ported
		? {
				card: (
					<PortedTitle
						note={ported}
						presentation="Card"
						follow={portedFollow}
					/>
				),
				cover: (
					<PortedTitle
						note={ported}
						presentation="Sheet"
						follow={portedFollow}
					/>
				),
			}
		: null;

	return (
		<motion.article
			ref={section}
			aria-label={`${subjectLabel(subject)} ${ground ? "ground" : sheet ? "sheet" : "card"}`}
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
				scale: shownScale,
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
					subject={subject}
					form={form}
					ground={ground}
					back={back}
					clear={clear}
					coverRem={coverHeadingRem(folded)}
					coverWidth={coverWidth}
					folded={folded}
					titles={titles}
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
					className={`relative order-1 min-h-0 flex-1 ${sheet ? "overflow-y-auto" : "overflow-hidden"}`}
				>
					{ported ? (
						/* a Card's links are inert until it is a Sheet (#485).
						   A Sheet's Heading is its title, so the first Block
						   keeps only the air it keeps under a title */
						<div
							inert={!sheet}
							className={
								sheet
									? "[&_[data-note-presentation]>article]:pt-0"
									: ""
							}
						>
							<PortedBlocks
								note={ported}
								presentation={sheet ? "Sheet" : "Card"}
								follow={portedFollow}
							/>
						</div>
					) : (
						<div
							className={`mx-auto flex w-full flex-col gap-3 ${below ? "pt-3" : sheet ? "pt-4 pb-4" : "pb-4"}`}
							style={{
								maxWidth: bodyWidth,
								paddingInline: `${gutterRem.toString()}rem`,
							}}
						>
							{subject.kind === "Text" ? (
								<TextBlock
									text={subject.text}
									focus={subject.focus}
									form={form}
									shown={showText}
									litWord={litWord}
									onSegment={onSegment}
									onSegmentDown={onSegmentDown}
								/>
							) : (
								<>
									<ContextsBlock
										note={subject.note}
										form={form}
										litWord={litWord}
										onSegment={onSegment}
										onSegmentDown={onSegmentDown}
									/>
									<BodyBlock note={subject.note} />
									<LinksBlock
										note={subject.note}
										form={form}
										onFollow={onFollow}
										onSegmentDown={onSegmentDown}
									/>
								</>
							)}
						</div>
					)}
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

/**
 * The Heading: pinned first, the Note's lift handle in every form. As a
 * Card it is the one-line row (form, then gloss), at the bottom edge when
 * the Card is a Card Tail. As a Cover it is the Cover's bar: ← in its left
 * margin, × in its right, and the title on the body's column; it folds
 * to the bar's height once the body scrolls (see `heading-design.tsx`). As a Ground it folds shut,
 * because the Pane bar carries the label. A ported Note's title is its
 * real Reading Header, in both faces.
 *
 * The row is one element whose height rides `MORPH` with the Note's box,
 * so the Cover's top edge is the Note's own edge in every frame. Only the
 * words change: the face leaving goes on `BAR_EXIT`, the one arriving
 * follows on `BAR_ENTER`, and the row between them never fades. A change
 * of height with no change of form, a fold, rides
 * `HEADING_RESIZE`.
 */
export function HeadingBlock({
	subject,
	form,
	ground,
	back,
	clear,
	coverRem,
	coverWidth,
	folded,
	titles,
	morphing,
	grab,
	atBottom,
	layout,
	offset,
	positionSpec,
	column,
}: {
	subject: Subject;
	form: NoteForm;
	ground: boolean;
	back: CoverBack | null;
	clear: CoverBack | null;
	/** The Cover face's height, in rem. */
	coverRem: number;
	/** The body column the Cover's title sits on, gutters included. */
	coverWidth: string;
	folded: boolean;
	/** A ported Note's real title, as a Card and as a Cover. */
	titles: { card: ReactNode; cover: ReactNode } | null;
	/** The form changed this render: the row rides `MORPH`. */
	morphing: boolean;
	/** The row is the Cover's handle right now. */
	grab: boolean;
	atBottom: boolean;
	layout: boolean;
	offset: MotionValue<number>;
	/** What the row's position rides; see `positionSpec` in `PresentationView`. */
	positionSpec: ReturnType<typeof motionOf>;
	/** The content column's width; the Card's row is centred at it. */
	column: string;
}) {
	const { transition, MORPH, BAR_ENTER, BAR_EXIT, HEADING_RESIZE } =
		useDeckMotion();
	const design = useHeadingDesign();
	const rem = remPx();
	const face = form === "card" ? "card" : ground || !back ? null : "cover";
	const rowRem =
		face === "card" ? HEADER_REM : face === "cover" ? coverRem : 0;
	const title =
		subject.kind === "Text" ? subject.text.title : subject.note.tail.form;
	const gloss = subjectGloss(subject);
	const fade = {
		initial: { opacity: 0 },
		animate: { opacity: 1, transition: transition(BAR_ENTER) },
		exit: { opacity: 0, transition: transition(BAR_EXIT) },
	};
	const rowSpec = morphing ? MORPH : transition(HEADING_RESIZE);
	return (
		<motion.div
			data-heading=""
			data-folded={face === "cover" ? folded : undefined}
			/* `initial={false}`: a Note is dealt at its size; only a change
			   of form is a move. */
			initial={false}
			layout={layout ? "position" : false}
			layoutDependency={`${form}:${atBottom.toString()}`}
			transition={{
				...rowSpec,
				layout: positionSpec,
			}}
			animate={{ height: rowRem * rem, opacity: face ? 1 : 0 }}
			style={{ order: atBottom ? 2 : 0, y: offset }}
			className={`relative w-full shrink-0 overflow-hidden select-none ${grab ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
		>
			<AnimatePresence initial={false}>
				{face === "card" ? (
					<motion.div
						key="card"
						{...fade}
						className={`absolute inset-0 flex justify-center ${titles ? "px-3.5" : "px-4"} ${atBottom ? "" : "pb-2"}`}
					>
						<div
							className="relative flex h-full w-full min-w-0 items-end gap-4"
							style={{ maxWidth: column }}
						>
							{titles ? (
								/* a Card's links are inert until it is a Sheet (#485) */
								<div
									inert
									className={`min-w-0 flex-1 ${ONE_LINE_TITLE} ${atBottom ? "pb-3" : ""}`}
								>
									{titles.card}
								</div>
							) : (
								<>
									<h2
										className={`min-w-0 flex-1 truncate font-serif text-[1rem] font-normal leading-tight text-ink ${atBottom ? "pb-3" : ""}`}
									>
										{title}
									</h2>
									{gloss ? (
										<span
											className={`shrink-0 pb-[0.15rem] text-[0.72rem] text-ink-muted ${atBottom ? "pb-3" : ""}`}
										>
											{gloss}
										</span>
									) : null}
								</>
							)}
						</div>
					</motion.div>
				) : face === "cover" && back && clear ? (
					<motion.div
						key="cover"
						{...fade}
						className="absolute inset-0"
					>
						<SheetChrome
							ruled={folded}
							maxWidth={coverWidth}
							back={back}
							clear={clear}
							linksDrag={design.linksDrag}
						>
							{titles ? (
								titles.cover
							) : (
								<SheetTitle subject={subject} />
							)}
						</SheetChrome>
					</motion.div>
				) : null}
			</AnimatePresence>
		</motion.div>
	);
}

/** A dummy Sheet's title in its chrome: the form, then what kind of Note it is. */
export function SheetTitle({ subject }: { subject: Subject }) {
	const gloss = subjectGloss(subject);
	return (
		<div className="flex min-w-0 items-baseline gap-3">
			<h2 className="min-w-0 truncate font-serif text-[1rem] font-normal leading-[1.4] text-ink">
				{subject.kind === "Text"
					? subject.text.title
					: subject.note.tail.form}
			</h2>
			{subject.kind === "Note" ? (
				<span className="shrink-0 font-mono text-[0.62rem] tracking-[0.08em] text-ink-muted uppercase">
					{subject.note.kind}
					{gloss ? (
						<span className="ms-2 normal-case tracking-normal">
							{gloss}
						</span>
					) : null}
				</span>
			) : null}
		</div>
	);
}
