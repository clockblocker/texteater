import { BAR_REM, HEADER_REM } from "compass";
import { ArrowLeftIcon, XIcon } from "lucide-react";
import { AnimatePresence, type MotionValue, motion } from "motion/react";
import {
	createContext,
	type ReactNode,
	type RefObject,
	useContext,
	useEffect,
	useState,
} from "react";
import { after, type motionOf } from "@/workspace/motion/motion-spec";
import { useDeckReducedMotion } from "@/workspace/motion/reduced-motion";
import { useDeckMotion } from "@/workspace/motion/runtime-config";
import { COVER_GUTTER_REM, remPx } from "./layout";
import { RestingControls } from "./resting-controls";
import type { Form } from "./subject";

/**
 * The Heading Block, pinned first, and the Sheet chrome it carries as a
 * Cover (tf-demo ADR 0006).
 *
 * As a Cover the Heading is the Cover's bar: ← in the column's inline-start
 * gutter, × in its inline-end one, and the title on the body's own
 * column, so the Heading's first letter is the Blocks' first letter. It
 * folds on scroll: while the body rests at its top it is the Notes page's
 * title row, with room above it and no rule of its own; once the body
 * scrolls it folds to the Pane bar's height, and the divider arrives with
 * the fold.
 */

/** How a Heading's title reads a press. */
export type HeadingDesign = {
	/**
	 * On: pressing a link in the Heading and moving past the slop lifts the
	 * Cover, and a release inside the slop follows the link. Off: a link,
	 * and a little padding either side of it, never starts a drag.
	 */
	readonly linksDrag: boolean;
};

export const DEFAULT_HEADING_DESIGN: HeadingDesign = { linksDrag: true };

const HeadingDesignContext = createContext(DEFAULT_HEADING_DESIGN);
export const HeadingDesignProvider = HeadingDesignContext.Provider;
export function useHeadingDesign(): HeadingDesign {
	return useContext(HeadingDesignContext);
}

/** The tall Heading: a title row with the Notes page's air above it. */
const TALL_REM = 4.5;
/** The fold starts this far into the body, and undoes only at its top. */
const FOLD_AT_PX = 24;

export function coverHeadingRem(folded: boolean): number {
	return folded ? BAR_REM : TALL_REM;
}

/**
 * Whether a Heading is folded: its Sheet's body has scrolled past
 * `FOLD_AT_PX`. It unfolds only back at the top, so the height the fold
 * gives the body cannot scroll it back under the line and flicker.
 */
export function foldedAt(was: boolean, scrollTop: number): boolean {
	return was ? scrollTop > 0 : scrollTop > FOLD_AT_PX;
}

/** `foldedAt`, for a Cover, whose Heading is its own. */
export function useFolded(
	section: RefObject<HTMLElement | null>,
	watching: boolean,
): boolean {
	const [folded, setFolded] = useState(false);
	/* an unwatched Cover is unfolded at once, so a re-watched one starts
	   unfolded until its scroller says otherwise */
	const [wasWatching, setWasWatching] = useState(watching);
	if (watching !== wasWatching) {
		setWasWatching(watching);
		if (!watching) setFolded(false);
	}
	useEffect(() => {
		if (!watching) return;
		const scroller =
			section.current?.querySelector<HTMLElement>("[data-scroller]");
		if (!scroller) return;
		const update = () =>
			setFolded((was) => foldedAt(was, scroller.scrollTop));
		update();
		scroller.addEventListener("scroll", update, { passive: true });
		return () => scroller.removeEventListener("scroll", update);
	}, [section, watching]);
	return folded;
}

/** A control a Heading or a Pane bar draws: ←, ×, or a keyboard handle. */
export type HeadingControl = {
	readonly label: string;
	readonly enabled: boolean;
	readonly onPress: () => void;
};

/**
 * Widens every link in the title by half a rem either side, so that the
 * padding is part of the link: it follows on a click and never drags.
 */
const STILL_LINKS =
	"[&_button]:relative [&_button]:before:absolute [&_button]:before:inset-y-0 [&_button]:before:-inset-x-2 [&_button]:before:content-['']";
/** One line in every design: the row's height is fixed, so the title truncates. */
const ONE_LINE_TITLE =
	"[&_[data-slot=note-title-row]]:flex-nowrap [&_[data-slot=note-title]]:min-w-0 [&_[data-slot=note-title]]:truncate";

/**
 * A Sheet's chrome: ← in the column's inline-start gutter, × in its
 * inline-end one, the title on the body's column between them. A Cover
 * draws it as its Heading; a Pane bar draws it too, because a Ground's
 * chrome is its Pane's (ADR 0006). The three share one line, so ← and ×
 * sit level with the title's middle whatever the row's height, and they
 * stay by the title however wide the Sheet is.
 */
export function SheetChrome({
	ruled,
	maxWidth,
	back,
	clear,
	children,
}: {
	/** A divider along the bottom edge, edge to edge. */
	ruled: boolean;
	/** The body column's width, gutters included. */
	maxWidth: string;
	back: HeadingControl | null;
	clear: HeadingControl | null;
	children: ReactNode;
}) {
	const { linksDrag } = useHeadingDesign();
	const gutter = `${COVER_GUTTER_REM.toString()}rem`;
	return (
		<>
			<div className="absolute inset-0 flex">
				<div
					className="mx-auto grid h-full w-full min-w-0 items-end pb-2"
					style={{ maxWidth }}
				>
					<div
						className="grid min-w-0 items-center"
						style={{
							gridTemplateColumns: `${gutter} minmax(0, 1fr) ${gutter}`,
						}}
					>
						{back ? (
							<ChromeButton
								control={back}
								name="back"
								className="col-start-1 justify-self-start"
							>
								{/* Back points toward inline-start (#479) */}
								<ArrowLeftIcon
									aria-hidden="true"
									className="rtl:-scale-x-100"
								/>
							</ChromeButton>
						) : null}
						<div
							data-heading-title=""
							data-links={linksDrag ? "drag" : "still"}
							className={`col-start-2 row-start-1 min-w-0 ${ONE_LINE_TITLE} ${linksDrag ? "" : STILL_LINKS}`}
						>
							{children}
						</div>
						{clear ? (
							<ChromeButton
								control={clear}
								name="clear"
								className="col-start-3 justify-self-end"
							>
								<XIcon aria-hidden="true" />
							</ChromeButton>
						) : null}
					</div>
				</div>
			</div>
			<span
				aria-hidden="true"
				className={`absolute inset-x-0 bottom-0 h-px bg-line transition-opacity duration-200 ease-out ${ruled ? "opacity-100" : "opacity-0"}`}
			/>
		</>
	);
}

/**
 * ← or ×: one icon size and one stroke, at the outer side of its gutter so
 * the title keeps some air. At rest it is chrome, in ink; under the
 * pointer it glows with what it does: ← the blue of a link, × the red a
 * Card turns when letting go removes it. It does not grow on hover: ← is
 * pressed many times a session, and a 15 % swell under the pointer made
 * the press a swing from 1.15 to 0.95. Pressed, it gives a little. Its box
 * is larger than the line it sits on; the negative margin keeps it from
 * making the line taller.
 */
const CHROME_HOVER = {
	back: "enabled:hover:text-link enabled:hover:drop-shadow-[0_0_6px_color-mix(in_oklab,var(--link)_55%,transparent)]",
	clear: "enabled:hover:text-destructive enabled:hover:drop-shadow-[0_0_6px_color-mix(in_oklab,var(--destructive)_55%,transparent)]",
} as const;

function ChromeButton({
	control,
	name,
	className,
	children,
}: {
	control: HeadingControl;
	name: keyof typeof CHROME_HOVER;
	className: string;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			data-heading-chrome={name}
			disabled={!control.enabled}
			aria-label={control.label}
			title={control.label}
			onClick={control.onPress}
			className={`${className} ${CHROME_HOVER[name]} row-start-1 -my-1.5 grid size-8 place-items-center rounded-md text-ink-muted transition-[color,scale,filter] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link/50 enabled:active:scale-95 disabled:text-ink-muted/40 [&_svg]:size-4 [&_svg]:stroke-[1.75]`}
		>
			{children}
		</button>
	);
}

/**
 * The keyboard's way to Lift and Expand: buttons that are out of sight
 * and out of the pointer's way until they have keyboard focus, then show
 * at the inline-end of the row they handle. A pointer lifts by dragging
 * the row itself.
 */
export function KeyHandles({
	controls,
}: {
	controls: readonly (HeadingControl & { readonly text: string })[];
}) {
	return (
		<div className="pointer-events-none absolute end-2 top-1 z-10 flex gap-1">
			{controls.map((control) => (
				<button
					key={control.text}
					type="button"
					data-key-handle={control.text.toLowerCase()}
					aria-label={control.label}
					disabled={!control.enabled}
					onClick={(event) => {
						event.stopPropagation();
						control.onPress();
					}}
					className="pointer-events-auto sr-only rounded-md border border-link/50 bg-raised px-2 py-0.5 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-link uppercase focus-visible:not-sr-only focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link/50"
				>
					{control.text}
				</button>
			))}
		</div>
	);
}

/**
 * The Heading: pinned first, the Note's lift handle as a Card and as a
 * Cover. As a Card it is the one-line title row, at the lower edge when
 * the Card is a Card Tail. As a Cover it is the Cover's bar: ← and ×
 * around the title, folding to the bar's height once the body scrolls.
 * As a Ground it folds shut, because the Pane bar carries the label.
 *
 * The row is one element whose height rides `MORPH` with the Note's box,
 * so the Cover's top edge is the Note's own edge in every frame. Only the
 * words change: the face leaving goes on `BAR_EXIT`, the one arriving
 * overlaps it on `BAR_ENTER`, and the row between them never fades. A
 * change of height with no change of form, a fold, rides `HEADING_RESIZE`.
 */
export function HeadingBlock({
	form,
	ground,
	back,
	clear,
	coverRem,
	coverWidth,
	folded,
	cardTitle,
	coverTitle,
	keys,
	morphing,
	grab,
	atBottom,
	layout,
	offset,
	positionSpec,
	column,
}: {
	form: Form;
	ground: boolean;
	back: HeadingControl | null;
	clear: HeadingControl | null;
	/** The Cover face's height, in rem. */
	coverRem: number;
	/** The body column the Cover's title sits on, gutters included. */
	coverWidth: string;
	folded: boolean;
	/** The Subject's Heading words as a Card's title row. */
	cardTitle: ReactNode;
	/** The Subject's Heading words as a Cover's title. */
	coverTitle: ReactNode;
	/** The keyboard's Lift and Expand for this Heading; see `KeyHandles`. */
	keys: ReactNode;
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
	const reduce = useDeckReducedMotion();
	const rem = remPx();
	const face = form === "card" ? "card" : ground || !back ? null : "cover";
	const rowRem =
		face === "card" ? HEADER_REM : face === "cover" ? coverRem : 0;
	/* the two faces overlap for a beat, and a touch of blur makes the
	   overlap read as one title turning rather than two stacked. Reduced,
	   the box is already there, so the words do not wait for it */
	const fade = {
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
						className={`absolute inset-0 flex justify-center px-4 ${atBottom ? "" : "pb-2"}`}
					>
						<div
							className="relative flex h-full w-full min-w-0 items-end"
							style={{ maxWidth: column }}
						>
							{/* a Card's title reads, but its links rest until it is a Sheet (#485) */}
							<RestingControls
								resting
								className={`flex min-w-0 flex-1 items-end gap-4 ${ONE_LINE_TITLE} ${atBottom ? "pb-3" : ""}`}
							>
								{cardTitle}
							</RestingControls>
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
						>
							{coverTitle}
						</SheetChrome>
					</motion.div>
				) : null}
			</AnimatePresence>
			{face ? keys : null}
		</motion.div>
	);
}
