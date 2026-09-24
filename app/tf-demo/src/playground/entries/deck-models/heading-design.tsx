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
 * How a Cover draws its Heading, prototyped behind two switches while a
 * real Reading Note is ported in. In every design ← hangs in the Cover's
 * left margin, × in its right, and the title sits on the body's own column,
 * so the Heading's first letter is the Blocks' first letter.
 *
 * - `bar`: one row at the Pane bar's height, a divider edge to edge.
 * - `heading`: the Notes page's title row, with room above it and no rule
 *   of its own: the first Block's rule is the one under the title.
 * - `shrink`: `heading` while the body rests at its top, `bar` once it
 *   scrolls; the divider arrives with the fold.
 */
export const HEADING_VARIANTS = ["bar", "heading", "shrink"] as const;
export type HeadingVariant = (typeof HEADING_VARIANTS)[number];
export const HEADING_VARIANT_LABEL: Record<HeadingVariant, string> = {
	bar: "Bar",
	heading: "Heading",
	shrink: "Folds on scroll",
};

export type HeadingDesign = {
	readonly variant: HeadingVariant;
	/**
	 * On: pressing a link in the Heading and moving past the slop lifts the
	 * Cover, and a release inside the slop follows the link. Off: a link,
	 * and a little padding either side of it, never starts a drag.
	 */
	readonly linksDrag: boolean;
};

export const DEFAULT_HEADING_DESIGN: HeadingDesign = {
	variant: "bar",
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

export function coverHeadingRem(
	variant: HeadingVariant,
	folded: boolean,
): number {
	return variant === "bar" || (variant === "shrink" && folded)
		? BAR_REM
		: TALL_REM;
}

/**
 * Whether a `shrink` Heading is folded: its Cover's body has scrolled past
 * `FOLD_AT_PX`. It unfolds only back at the top, so the height the fold
 * gives the body cannot scroll it back under the line and flicker.
 */
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
			setFolded((was) =>
				was ? scroller.scrollTop > 0 : scroller.scrollTop > FOLD_AT_PX,
			);
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

/** Whether a Cover's Heading draws its divider: as a bar, never as a heading. */
export function coverHeadingRuled(
	variant: HeadingVariant,
	folded: boolean,
): boolean {
	return variant === "bar" || (variant === "shrink" && folded);
}

/**
 * A Sheet's chrome: ← in the left margin, × in the right, the title on the
 * body's column. A Cover draws it as its Heading; a Ground's Pane bar draws
 * it too, because a Ground's chrome is its Pane's (ADR 0006).
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
	return (
		<>
			<div className="absolute inset-0 flex">
				<div
					className="relative mx-auto flex h-full w-full min-w-0 items-end pb-2"
					style={{
						maxWidth,
						paddingInline: `${COVER_GUTTER_REM.toString()}rem`,
					}}
				>
					<div
						data-heading-title=""
						data-links={linksDrag ? "drag" : "still"}
						className={`min-w-0 flex-1 ${ONE_LINE_TITLE} ${linksDrag ? "" : STILL_LINKS}`}
					>
						{children}
					</div>
				</div>
			</div>
			<span
				aria-hidden="true"
				className={`absolute inset-x-0 bottom-0 h-px bg-line transition-opacity duration-200 ease-out ${ruled ? "opacity-100" : "opacity-0"}`}
			/>
			{back ? (
				<ChromeButton
					side="start"
					control={back}
					glyph="←"
					name="back"
				/>
			) : null}
			{clear ? (
				<ChromeButton
					side="end"
					control={clear}
					glyph="×"
					name="clear"
				/>
			) : null}
		</>
	);
}

/** ← or ×: level with the title's middle, whatever the row's height. */
function ChromeButton({
	side,
	control,
	glyph,
	name,
}: {
	side: "start" | "end";
	control: HeadingControl;
	glyph: string;
	name: string;
}) {
	return (
		<button
			type="button"
			data-heading-chrome={name}
			disabled={!control.enabled}
			aria-label={control.label}
			title={control.label}
			onClick={control.onPress}
			className={`absolute bottom-[0.3rem] grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-[0.95rem] leading-none text-link transition-transform duration-150 ease-out hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link/50 active:scale-[0.94] disabled:text-ink-muted disabled:hover:bg-transparent disabled:active:scale-100 ${side === "start" ? "start-1.5" : "end-1.5"}`}
		>
			{glyph}
		</button>
	);
}
