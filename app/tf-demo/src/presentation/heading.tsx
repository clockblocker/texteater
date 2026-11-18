import { ArrowLeftIcon, XIcon } from "lucide-react";
import {
	createContext,
	type ReactNode,
	type RefObject,
	useContext,
	useEffect,
	useState,
} from "react";
import { remPx } from "./deck-geometry";
import { coverFoldRem, foldedAt } from "./form";
import { RestingControls } from "./resting-controls";
import { COVER_GUTTER_REM } from "./skin";

/**
 * What a Heading row holds: a Card's title row, and the Sheet chrome the
 * Heading carries as a Cover (tf-demo ADR 0006). `PresentationContent`
 * places the row; nothing here moves.
 *
 * As a Cover the Heading is the Cover's bar: ← in the column's inline-start
 * gutter, × in its inline-end one, and the title on the body's own
 * column, so the Heading's first letter is the Blocks' first letter. It
 * folds on scroll: while the body rests at its top it is the page's
 * headword, set large with room above it and no rule of its own; once the
 * body scrolls it folds to the Pane bar's height and the bar's type, and
 * the divider arrives with the fold.
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

/**
 * `foldedAt`, for a Cover, whose Heading is its own: watches the Body's
 * scroller under `root`.
 */
export function useFolded(
	root: RefObject<HTMLElement | null>,
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
			root.current?.querySelector<HTMLElement>("[data-scroller]");
		if (!scroller) return;
		const update = () =>
			setFolded((was) =>
				foldedAt(
					was,
					scroller.scrollTop,
					scroller.scrollHeight -
						scroller.clientHeight -
						coverFoldRem() * remPx(),
				),
			);
		update();
		scroller.addEventListener("scroll", update, { passive: true });
		return () => scroller.removeEventListener("scroll", update);
	}, [root, watching]);
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
 * One line in a Sheet's chrome. The title is a row of its own parts, an
 * emoji or an icon and then its words, and only the words give way: they
 * end in an ellipsis, where a title that truncated as a whole would swap a
 * linked headword for the ellipsis alone. The title's row is one line tall
 * and clips, so an aside that finds no room beside the title, such as a
 * transcription, wraps under it and is not drawn, rather than being cut
 * off mid-word. The title clips, so a linked headword draws its focus ring
 * inside its own box, which is a little wider than its words.
 */
const ONE_LINE_SHEET_TITLE =
	"[&_[data-slot=note-title-row]]:max-h-[1lh] [&_[data-slot=note-title-row]]:overflow-hidden [&_[data-slot=note-title]]:flex [&_[data-slot=note-title]]:max-w-full [&_[data-slot=note-title]]:min-w-0 [&_[data-slot=note-title]]:overflow-hidden [&_[data-slot=note-title]>*]:shrink-0 [&_[data-slot=note-title]>*:last-child]:min-w-0 [&_[data-slot=note-title]>*:last-child]:shrink [&_[data-slot=note-title]>*:last-child]:truncate [&_[data-slot=note-title-link]]:-ms-1 [&_[data-slot=note-title-link]]:px-1 [&_[data-slot=note-title-link]]:focus-visible:ring-inset";

/**
 * A Note's title in a Cover takes its size from its row, so it can change
 * with the fold: the title inherits what the row is given, and the row is
 * one line of that size tall. A title that is no Note's, such as a
 * Scroll's, keeps its own type. The change rides the fold's own clock,
 * `HEADING_RESIZE`, as the Heading's height does. Reduced motion ends
 * every CSS transition at once, so the type snaps. The line keeps the
 * title's own leading at both sizes: a tighter one would clip the rule a
 * linked headword draws under itself.
 */
const COVER_TITLE =
	"[&_[data-slot=note-title-row]]:leading-[1.4] [&_[data-slot=note-title-row]]:transition-[font-size] [&_[data-slot=note-title-row]]:duration-200 [&_[data-slot=note-title-row]]:ease-[cubic-bezier(0.23,1,0.32,1)] [&_[data-slot=note-title]]:text-[length:inherit] [&_[data-slot=note-title]]:transition-[font-weight,letter-spacing] [&_[data-slot=note-title]]:duration-200 [&_[data-slot=note-title]]:ease-[cubic-bezier(0.23,1,0.32,1)]";
/**
 * The page's headword: a Note's title in a Cover while its Body rests at
 * its top. It is 1.75rem where the column has the room and gives a little
 * in a narrow Pane, so a phone shows a headword of several words whole.
 */
const LARGE_TITLE =
	"[&_[data-slot=note-title-row]]:text-[length:clamp(1.375rem,5.5cqi,1.75rem)] [&_[data-slot=note-title]]:font-[600] [&_[data-slot=note-title]]:tracking-[-0.03em]";
/** The bar's title: the size a Note's title has in a Card. */
const BAR_TITLE = "[&_[data-slot=note-title-row]]:text-base";

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
	large,
	children,
}: {
	/** A divider along the bottom edge, edge to edge. */
	ruled: boolean;
	/** The body column's width, gutters included. */
	maxWidth: string;
	back: HeadingControl | null;
	clear: HeadingControl | null;
	/**
	 * A Cover's title: a Note's is set large as the page's headword, or at
	 * the bar's size once the Cover folds. Left out, the title keeps the
	 * type its words bring, as a Pane bar's does.
	 */
	large?: boolean;
	children: ReactNode;
}) {
	const { linksDrag } = useHeadingDesign();
	const gutter = `${COVER_GUTTER_REM.toString()}rem`;
	return (
		<>
			<div className="absolute inset-0 flex">
				<div
					/* the column is the container a large title sizes against */
					className="@container mx-auto grid h-full w-full min-w-0 items-end pb-2"
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
							className={`col-start-2 row-start-1 min-w-0 ${ONE_LINE_SHEET_TITLE} ${large === undefined ? "" : `${COVER_TITLE} ${large ? LARGE_TITLE : BAR_TITLE}`} ${linksDrag ? "" : STILL_LINKS}`}
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
 * A Card's title row: the Heading's words on one line, centred at the
 * content column, resting on the row's lower edge. A Card's title reads,
 * but its links rest until it is a Sheet (#485).
 */
export function CardTitleRow({
	column,
	atFoot,
	children,
}: {
	/** The content column's width, as CSS. */
	column: string;
	/** The row sits at its Card's lower edge, as a Card Tail's does. */
	atFoot: boolean;
	children: ReactNode;
}) {
	return (
		<div
			/* a Card's Heading is part of the Card: its words are set in
			   the Card's density, as its Blocks are */
			data-density="compact"
			className="relative flex h-full w-full min-w-0 items-end"
			style={{ maxWidth: column }}
		>
			<RestingControls
				resting
				className={`flex min-w-0 flex-1 items-end gap-4 ${ONE_LINE_TITLE} ${atFoot ? "pb-3.5" : ""}`}
			>
				{children}
			</RestingControls>
		</div>
	);
}

/** The classes of the face a Card's title row is drawn in, filling the Heading row. */
export function cardFaceClass(atFoot: boolean): string {
	return `absolute inset-0 flex justify-center px-4 ${atFoot ? "" : "pb-3.5"}`;
}

/** A Heading's words for a Subject with a plain name, such as a Scroll or a Section. */
export function PlainTitle({ children }: { children: ReactNode }) {
	return <span className="min-w-0 truncate font-serif">{children}</span>;
}
