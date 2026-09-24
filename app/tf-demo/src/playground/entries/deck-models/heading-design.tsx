import { ArrowLeftIcon, XIcon } from "lucide-react";
import {
	createContext,
	type ReactNode,
	type RefObject,
	useContext,
	useEffect,
	useState,
} from "react";
import { BAR_REM } from "./motion-spec";

/**
 * How a Cover draws its Heading. ← hangs in the Cover's left margin, × in
 * its right, and the title sits on the body's own column, so the Heading's
 * first letter is the Blocks' first letter.
 *
 * The Heading folds on scroll: while the body rests at its top it is the
 * Notes page's title row, with room above it and no rule of its own (the
 * first Block's rule is the one under the title); once the body scrolls it
 * folds to the Pane bar's height, and the divider arrives with the fold.
 */
export type HeadingDesign = {
	/**
	 * On: pressing a link in the Heading and moving past the slop lifts the
	 * Cover, and a release inside the slop follows the link. Off: a link,
	 * and a little padding either side of it, never starts a drag.
	 */
	readonly linksDrag: boolean;
};

export const DEFAULT_HEADING_DESIGN: HeadingDesign = {
	linksDrag: true,
};

const HeadingDesignContext = createContext(DEFAULT_HEADING_DESIGN);
export const HeadingDesignProvider = HeadingDesignContext.Provider;
export function useHeadingDesign(): HeadingDesign {
	return useContext(HeadingDesignContext);
}

/** The Notes page's gutter; a Cover's ← and × hang inside it. */
export const COVER_GUTTER_REM = 2.5;
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
	useEffect(() => {
		if (!watching) {
			setFolded(false);
			return;
		}
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
export const ONE_LINE_TITLE =
	"[&_[data-slot=note-title-row]]:flex-nowrap [&_[data-slot=note-title]]:min-w-0 [&_[data-slot=note-title]]:truncate";

/**
 * A Sheet's chrome: ← in the column's left gutter, × in its right, the
 * title on the body's column between them. A Cover draws it as its
 * Heading; a Ground's Pane bar draws it too, because a Ground's chrome is
 * its Pane's (ADR 0006). The three share one line, so ← and × sit level
 * with the title's middle whatever the row's height, and they stay by the
 * title however wide the Sheet is.
 */
export function SheetChrome({
	ruled,
	maxWidth,
	back,
	clear,
	linksDrag,
	children,
}: {
	/** A divider along the bottom edge, edge to edge. */
	ruled: boolean;
	/** The body column's width, gutters included. */
	maxWidth: string;
	back: HeadingControl | null;
	clear: HeadingControl | null;
	linksDrag: boolean;
	children: ReactNode;
}) {
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
								<ArrowLeftIcon aria-hidden="true" />
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
 * pointer it grows a touch and glows with what it does: ← the blue of a
 * link, × the red a Card turns when letting go removes it. Its box is
 * larger than the line it sits on; the negative margin keeps it from
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
			className={`${className} ${CHROME_HOVER[name]} row-start-1 -my-1.5 grid size-8 place-items-center rounded-md text-ink-muted transition-[color,scale,filter] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link/50 enabled:hover:scale-115 enabled:active:scale-95 disabled:text-ink-muted/40 [&_svg]:size-4 [&_svg]:stroke-[1.75]`}
		>
			{children}
		</button>
	);
}
