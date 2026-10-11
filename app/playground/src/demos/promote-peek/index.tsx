import { cn } from "lego";
import { AnimatePresence } from "motion/react";
import {
	type CSSProperties,
	type Dispatch,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useReducer,
	useRef,
	useState,
} from "react";
import { germanText, hebrewText, type WordClick, WordText } from "@/fixtures";
import { useDemoParam, useFrameSize, usePlaygroundEnv } from "@/shell";
import { Caption, type Dock, docks } from "./caption";
import { LookupSurface } from "./lookup-surface";
import { type PeekPlacement, placePeek } from "./placement";
import {
	initialState,
	type PromoteAction,
	type PromoteState,
	promote,
} from "./state";

/** In auto, the pane sits beside the text from this frame width. */
const sideFromPx = 760;

/**
 * Promote a peek: a click opens a transient peek by the word; a pin turns
 * it into a pane beside the text that survives clicks; expand turns it
 * into a sheet over the whole frame. Each step morphs the same surface,
 * and each one reverses.
 */
export default function PromotePeekDemo() {
	const env = usePlaygroundEnv();
	const { inlineSize } = useFrameSize();
	const [dockParam, setDockParam] = useDemoParam("dock");
	const dock: Dock = docks.find((name) => name === dockParam) ?? "auto";
	const side =
		dock === "side" || (dock === "auto" && inlineSize >= sideFromPx);
	const [state, dispatch] = useReducer(promote, initialState);
	const column = useRef<HTMLDivElement>(null);
	const peek = useRef<HTMLElement>(null);
	const [placement, placeNow] = usePeekPlacement(
		column,
		state.peek?.lookup.wordId ?? null,
		env.dir,
	);
	const isFresh = useFreshSurfaces(state);
	const root = useRef<HTMLDivElement>(null);
	useDismissals(root, peek, dispatch);

	const selectedWordId =
		state.peek?.lookup.wordId ??
		state.pane?.lookup.wordId ??
		state.sheet?.surface.lookup.wordId ??
		null;
	const closePeek = () => dispatch({ type: "close", level: "peek" });
	const onWordClick = ({ word }: WordClick) => {
		// Placed in the same render as it opens, so a new peek never slides
		// over from the last word's place.
		if (!(state.pane && state.follow)) placeNow(word.id);
		dispatch({ type: "click", word, at: performance.now() });
	};

	return (
		<div
			ref={root}
			className="relative flex h-full flex-col overflow-hidden bg-canvas text-ink"
		>
			<Caption
				state={state}
				dock={dock}
				side={side}
				onDock={(next) => setDockParam(next === "auto" ? null : next)}
			/>
			<div
				className={cn(
					"flex min-h-0 flex-1",
					side ? "flex-row" : "flex-col",
				)}
			>
				<div
					ref={column}
					className="relative z-10 min-h-0 min-w-0 flex-1"
				>
					{/* The text scrolls under a peek, so a scroll lets it go. */}
					<div
						className="h-full overflow-auto"
						onWheel={closePeek}
						onTouchMove={closePeek}
					>
						<div className="mx-auto grid max-w-[38rem] gap-6 px-5 py-6">
							<WordText
								text={germanText}
								selectedWordId={selectedWordId}
								onWordClick={onWordClick}
							/>
							<WordText
								text={hebrewText}
								selectedWordId={selectedWordId}
								onWordClick={onWordClick}
							/>
						</div>
					</div>
					<AnimatePresence>
						{state.peek ? (
							<LookupSurface
								key={state.peek.id}
								surfaceRef={peek}
								surface={state.peek}
								level="peek"
								fresh={isFresh(state.peek.id)}
								follow={state.follow}
								dispatch={dispatch}
								className="absolute z-20"
								style={peekStyle(placement)}
							/>
						) : null}
					</AnimatePresence>
				</div>
				{state.pane ? (
					<aside
						aria-label="Pinned lookup"
						className={cn(
							"relative z-20 shrink-0",
							side
								? "w-[min(24rem,50cqi)]"
								: "h-[min(55%,28rem)]",
						)}
					>
						<AnimatePresence>
							<LookupSurface
								key={state.pane.id}
								surface={state.pane}
								level="pane"
								fresh={isFresh(state.pane.id)}
								follow={state.follow}
								dispatch={dispatch}
								className={cn(
									"absolute inset-0",
									side ? "border-s" : "border-t",
								)}
							/>
						</AnimatePresence>
					</aside>
				) : null}
			</div>
			<AnimatePresence>
				{state.sheet ? (
					<LookupSurface
						key={state.sheet.surface.id}
						surface={state.sheet.surface}
						level="sheet"
						backTo={state.sheet.from}
						fresh={isFresh(state.sheet.surface.id)}
						follow={state.follow}
						dispatch={dispatch}
						className="absolute inset-0 z-30"
					/>
				) : null}
			</AnimatePresence>
		</div>
	);
}

/**
 * A pointer down anywhere but the peek or a word lets the peek go (a word
 * click opens its own); Esc lets the peek go, or steps back from the sheet.
 */
function useDismissals(
	root: RefObject<HTMLDivElement | null>,
	peek: RefObject<HTMLElement | null>,
	dispatch: Dispatch<PromoteAction>,
) {
	useEffect(() => {
		const element = root.current;
		if (!element) return;
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			if (peek.current?.contains(target)) return;
			if (target.closest("[data-word-id]")) return;
			dispatch({ type: "close", level: "peek" });
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") dispatch({ type: "escape" });
		};
		element.addEventListener("pointerdown", onPointerDown, true);
		// A surface that moved took the focused button with it, so Esc
		// often reaches the document, not the demo.
		document.addEventListener("keydown", onKeyDown);
		return () => {
			element.removeEventListener("pointerdown", onPointerDown, true);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [root, peek, dispatch]);
}

function peekStyle(placement: PeekPlacement | null): CSSProperties {
	if (!placement)
		return { insetInlineStart: 8, top: 8, width: 336, maxHeight: 360 };
	return {
		insetInlineStart: placement.start,
		width: placement.width,
		maxHeight: placement.maxHeight,
		...(placement.side === "below"
			? { top: placement.top }
			: { bottom: placement.bottom }),
	};
}

/**
 * The peek's place by `wordId`, kept current as the column resizes: a
 * pane opening or closing beside it, a dock change, the frame's width.
 * `placeNow` places by a word at once, before the peek opens on it.
 */
function usePeekPlacement(
	column: RefObject<HTMLDivElement | null>,
	wordId: string | null,
	dir: "ltr" | "rtl",
): readonly [PeekPlacement | null, (wordId: string) => void] {
	const [placement, setPlacement] = useState<PeekPlacement | null>(null);
	const placeNow = useCallback(
		(id: string) => {
			const element = column.current;
			const word = element?.querySelector(
				`[data-word-id="${CSS.escape(id)}"]`,
			);
			if (!element || !word) return;
			const next = placePeek(
				word.getBoundingClientRect(),
				element.getBoundingClientRect(),
				dir,
			);
			setPlacement((current) =>
				JSON.stringify(current) === JSON.stringify(next)
					? current
					: next,
			);
		},
		[column, dir],
	);

	useLayoutEffect(() => {
		const element = column.current;
		if (!element || wordId === null) return;
		placeNow(wordId);
		const observer = new ResizeObserver(() => placeNow(wordId));
		observer.observe(element);
		return () => observer.disconnect();
	}, [column, wordId, placeNow]);

	return [placement, placeNow];
}

/**
 * Whether a surface is new, so it fades in, or has moved from another
 * level, so it morphs from there.
 */
function useFreshSurfaces(state: PromoteState): (id: number) => boolean {
	const seen = useRef(new Set<number>());
	useEffect(() => {
		for (const surface of [state.peek, state.pane, state.sheet?.surface])
			if (surface) seen.current.add(surface.id);
	}, [state]);
	return (id) => !seen.current.has(id);
}
