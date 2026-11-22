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
import {
	HEADING_CHROME_OPACITY_CSS,
	HEADING_CHROME_SCALE_CSS,
	headingGutterCss,
	headingTitleStyle,
	sheetChromeTitleStyle,
} from "./morph";
import { RestingControls } from "./resting-controls";
import { COVER_GUTTER_REM } from "./skin";

/**
 * What a Heading row holds: one persistent layout shared across Card and
 * Cover forms (tf-demo ADR 0006), plus `SheetChrome` for a Pane bar's Ground.
 *
 * `lego`'s `[data-title-bar]` rules own `NoteTitle` / `NoteTitleRow` layout,
 * truncation, and fluid sizing via `--note-title-size`, so this module needs
 * no deep descendant selector overrides.
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

/**
 * One unified Heading layout for a Note Presentation across Card and Cover
 * forms. Never unmounts or crossfades between two heading trees:
 *
 * - Gutters glide from `0.875rem` (Card) to `2.5rem` (Cover) via `--note-morph`,
 *   keeping the headword's first letter aligned with the Body's blocks at every
 *   frame.
 * - `←` and `×` fade smoothly into the gutters as the Card opens into a Cover
 *   and rest `inert` while in Card form.
 * - The title scales fluidly from `1rem` (Card / folded bar) to the Cover
 *   headword (`clamp(1.375rem, 5.5cqi, 1.75rem)`).
 */
export function PresentationHeading({
	maxWidth,
	atFoot,
	folded,
	foldTransition = false,
	resting,
	chromeActive,
	back,
	clear,
	children,
}: {
	readonly maxWidth: string;
	readonly atFoot: boolean;
	readonly folded: boolean;
	/**
	 * Enables CSS transitions on title font-size/weight/tracking ONLY when a
	 * settled Cover folds or unfolds via scroll — never while `--note-morph`
	 * is animating or scrubbed.
	 */
	readonly foldTransition?: boolean;
	readonly resting: boolean;
	readonly chromeActive: boolean;
	readonly back: HeadingControl | null;
	readonly clear: HeadingControl | null;
	readonly children: ReactNode;
}) {
	const { linksDrag } = useHeadingDesign();
	const gutter = headingGutterCss();
	const bottomPad = folded
		? "0px"
		: atFoot
			? "0.875rem"
			: "calc(0.875rem - 0.375rem * var(--note-morph))";
	const chromeStyle = {
		opacity: HEADING_CHROME_OPACITY_CSS,
		scale: HEADING_CHROME_SCALE_CSS,
	};
	return (
		<>
			<div className="absolute inset-0 flex">
				<div
					className={`@container mx-auto grid h-full w-full min-w-0 ${folded ? "items-center" : "items-end"}`}
					style={{ maxWidth, paddingBottom: bottomPad }}
				>
					<div
						className="grid min-w-0 items-center"
						style={{
							gridTemplateColumns: `${gutter} minmax(0, 1fr) ${gutter}`,
						}}
					>
						{back ? (
							<div
								inert={!chromeActive || undefined}
								className={`col-start-1 row-start-1 justify-self-start ${chromeActive ? "" : "pointer-events-none"}`}
								style={chromeStyle}
							>
								<ChromeButton control={back} name="back">
									{/* Back points toward inline-start (#479) */}
									<ArrowLeftIcon
										aria-hidden="true"
										className="-translate-x-px rtl:translate-x-px rtl:-scale-x-100"
									/>
								</ChromeButton>
							</div>
						) : null}
						<div
							data-heading-title=""
							data-title-bar=""
							data-title-fold-transition={
								foldTransition || undefined
							}
							data-links={linksDrag ? "drag" : "still"}
							style={headingTitleStyle(folded)}
							className={`col-start-2 row-start-1 min-w-0 ${linksDrag ? "" : STILL_LINKS}`}
						>
							<RestingControls
								resting={resting}
								className="min-w-0"
							>
								{children}
							</RestingControls>
						</div>
						{clear ? (
							<div
								inert={!chromeActive || undefined}
								className={`col-start-3 row-start-1 justify-self-end ${chromeActive ? "" : "pointer-events-none"}`}
								style={chromeStyle}
							>
								<ChromeButton control={clear} name="clear">
									<XIcon aria-hidden="true" />
								</ChromeButton>
							</div>
						) : null}
					</div>
				</div>
			</div>
			<span
				aria-hidden="true"
				className={`absolute inset-x-0 bottom-0 h-px bg-line transition-opacity duration-200 ease-out motion-reduce:transition-none ${folded && chromeActive ? "opacity-100" : "opacity-0"}`}
			/>
		</>
	);
}

/**
 * A Pane bar's Sheet chrome: ← in the column's inline-start gutter, × in its
 * inline-end one, and the Ground's title or trail on the body's column
 * between them (ADR 0006).
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
	 * When given, scales a Note's title between large headword and bar size.
	 * Left out, the title keeps the type its words bring (e.g. a trail).
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
					className={`@container mx-auto grid h-full w-full min-w-0 ${large ? "items-end pb-2" : "items-center"}`}
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
								<ArrowLeftIcon
									aria-hidden="true"
									className="-translate-x-px rtl:translate-x-px rtl:-scale-x-100"
								/>
							</ChromeButton>
						) : null}
						<div
							data-heading-title=""
							data-title-bar=""
							data-title-fold-transition={
								large !== undefined || undefined
							}
							data-links={linksDrag ? "drag" : "still"}
							style={
								large === undefined
									? undefined
									: sheetChromeTitleStyle(large)
							}
							className={`col-start-2 row-start-1 min-w-0 ${linksDrag ? "" : STILL_LINKS}`}
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
				className={`absolute inset-x-0 bottom-0 h-px bg-line transition-opacity duration-200 ease-out motion-reduce:transition-none ${ruled ? "opacity-100" : "opacity-0"}`}
			/>
		</>
	);
}

/**
 * ← or ×: one icon size and one stroke, at the outer side of its gutter so
 * the title keeps some air. Expands hit target to 44×44px via pseudo-element
 * and gates hover surfaces to fine pointers so touch devices never stick.
 */
const CHROME_HOVER = {
	back: "[@media(hover:hover)_and_(pointer:fine)]:enabled:hover:bg-raised [@media(hover:hover)_and_(pointer:fine)]:enabled:hover:text-ink",
	clear: "[@media(hover:hover)_and_(pointer:fine)]:enabled:hover:bg-destructive/12 [@media(hover:hover)_and_(pointer:fine)]:enabled:hover:text-destructive",
} as const;

function ChromeButton({
	control,
	name,
	className = "",
	children,
}: {
	control: HeadingControl;
	name: keyof typeof CHROME_HOVER;
	className?: string;
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
			className={`${className} ${CHROME_HOVER[name]} relative row-start-1 -my-1.5 grid size-8 translate-y-[1px] touch-manipulation place-items-center rounded-md text-ink-muted transition-[color,background-color,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link/50 enabled:active:scale-[0.96] disabled:text-ink-faint/75 motion-reduce:transition-none [&_svg]:size-4 [&_svg]:stroke-[1.75]`}
		>
			{children}
		</button>
	);
}

/**
 * The keyboard's way to Lift and Expand: buttons that are out of sight
 * and out of the pointer's way until they have keyboard focus, then show
 * at the inline-end of the row they handle.
 */
export function KeyHandles({
	controls,
}: {
	controls: readonly (HeadingControl & { readonly text: string })[];
}) {
	return (
		<div className="pointer-events-none absolute end-2 top-2 z-10 flex gap-1">
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
					className="pointer-events-auto sr-only rounded-sm border border-link/50 bg-raised px-2 py-0.5 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-link uppercase focus-visible:not-sr-only focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link/50"
				>
					{control.text}
				</button>
			))}
		</div>
	);
}

/** A Heading's words for a Subject with a plain name, such as a Scroll or a Section. */
export function PlainTitle({ children }: { children: ReactNode }) {
	return <span className="min-w-0 truncate font-serif">{children}</span>;
}
