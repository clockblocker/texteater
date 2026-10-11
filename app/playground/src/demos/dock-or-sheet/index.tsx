import { cn } from "lego";
import { PanelBottom, PanelRight } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useMemo, useState } from "react";
import {
	type FakeCardLink,
	germanText,
	hebrewText,
	useFakeResolution,
	type WordClick,
	WordText,
	wordsOf,
} from "@/fixtures";
import { useDemoParam, useFrameSize, usePlaygroundEnv } from "@/shell";
import { Dock } from "./dock";
import { useKeepWordInView, useSize } from "./keep-word-in-view";
import { Lookup, type LookupState } from "./lookup";
import { Sheet, type Snap, snapHeights } from "./sheet";

const allWords = [...wordsOf(germanText), ...wordsOf(hebrewText)];

/** Where the lookup switches from sheet to dock, with who switches there. */
const breakpoints = [
	{ px: 640, who: "Readest" },
	{ px: 800, who: null },
	{ px: 980, who: "Lute" },
] as const;
const defaultBreakpoint = 800;

const dockWidths = { min: 280, default: 360, max: 560 } as const;
/** The text column the dock never squeezes below. */
const minTextWidth = 320;

/**
 * Dock or sheet: at or above the breakpoint the lookup docks at the
 * text's inline end, below it the same `Lookup` rides a bottom sheet.
 * The lookup's state lives here, above both containers, so crossing the
 * breakpoint hands the very same content from one to the other.
 */
export default function DockOrSheetDemo() {
	const env = usePlaygroundEnv();
	const frame = useFrameSize();
	const [breakpointParam, setBreakpoint] = useDemoParam("bp");
	const breakpoint =
		breakpoints.find((option) => String(option.px) === breakpointParam)
			?.px ?? defaultBreakpoint;
	const [wordId, setWordId] = useDemoParam("word");
	const word = allWords.find((candidate) => candidate.id === wordId) ?? null;
	const [hop, setHop] = useState<string | null>(null);
	const [front, setFront] = useState<number | null>(null);
	const [outlined, setOutlined] = useState(true);
	const [dockWidth, setDockWidth] = useState<number>(dockWidths.default);
	const [snap, setSnap] = useState<Snap>("half");
	const [area, setArea] = useState<HTMLElement | null>(null);
	const [scroller, setScroller] = useState<HTMLElement | null>(null);
	const [content, setContent] = useState<HTMLElement | null>(null);
	const areaSize = useSize(area);
	const textSize = useSize(scroller);
	const { cards, pending } = useFakeResolution(hop ?? word);

	const mode =
		frame.inlineSize === 0
			? null
			: frame.inlineSize >= breakpoint
				? "dock"
				: "sheet";
	const heights = useMemo(
		() => snapHeights(areaSize.blockSize),
		[areaSize.blockSize],
	);
	const sheetOpen = word !== null && mode === "sheet";
	const maxDock = Math.max(
		dockWidths.min,
		Math.min(dockWidths.max, frame.inlineSize - minTextWidth),
	);
	const dock = Math.min(Math.max(dockWidth, dockWidths.min), maxDock);

	const keep = useKeepWordInView({
		scroller,
		content,
		wordId,
		covered: sheetOpen && snap !== "full" ? heights[snap] : 0,
		reducedMotion: env.reducedMotion,
	});

	const onWordClick = ({ word: clicked, element }: WordClick) => {
		keep.record(element);
		if (word === null) setSnap("half");
		setWordId(clicked.id, { push: true });
		setHop(null);
		setFront(null);
	};
	const close = () => {
		setWordId(null);
		setHop(null);
		setFront(null);
	};

	const lookup: LookupState | null = word
		? {
				clicked: word.text,
				hop,
				cards,
				pending,
				frontIndex: front ?? cards.length - 1,
				onFront: setFront,
				onLinkClick: (link: FakeCardLink) => {
					setHop(link.word);
					setFront(null);
				},
				onBack: () => {
					setHop(null);
					setFront(null);
				},
			}
		: null;

	return (
		<div className="flex h-full flex-col">
			<header className="grid shrink-0 gap-2 border-b border-line bg-canvas px-4 py-3 text-sm">
				<p className="text-ink-soft">
					<b className="font-semibold text-ink">Dock or sheet.</b>{" "}
					Wide, the lookup docks beside the text; narrow, the same{" "}
					<code className="font-mono text-xs text-link">
						&lt;Lookup /&gt;
					</code>{" "}
					rides a bottom sheet. Lute switches at 980px, LinguaCafe at
					960 and 768, Readest at 640.
				</p>
				<p className="text-xs text-ink-muted">
					Try: click a word, then drag the frame's edge across the
					breakpoint, or switch the width to 390 and back. Drag the
					dock's grip or the sheet's handle.
				</p>
				<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
					<fieldset className="flex items-center gap-2">
						<legend className="sr-only">Breakpoint</legend>
						<span className="text-ink-muted">Dock from</span>
						<span className="flex rounded-lg border border-line p-0.5">
							{breakpoints.map((option) => (
								<button
									key={option.px}
									type="button"
									aria-pressed={option.px === breakpoint}
									onClick={() =>
										setBreakpoint(
											option.px === defaultBreakpoint
												? null
												: String(option.px),
										)
									}
									className={cn(
										"cursor-pointer rounded-md px-2 py-0.5 text-ink-muted hover:text-ink",
										option.px === breakpoint &&
											"bg-raised text-ink",
									)}
								>
									{option.px}
									{option.who ? (
										<span className="text-ink-faint">
											{" "}
											{option.who}
										</span>
									) : null}
								</button>
							))}
						</span>
					</fieldset>
					<label className="flex cursor-pointer items-center gap-1.5 text-ink-muted">
						<input
							type="checkbox"
							checked={outlined}
							onChange={(event) =>
								setOutlined(event.target.checked)
							}
							className="accent-[var(--link)]"
						/>
						Outline{" "}
						<code className="font-mono text-link">
							&lt;Lookup /&gt;
						</code>
					</label>
					<Readout
						frameWidth={frame.inlineSize}
						breakpoint={breakpoint}
						mode={mode}
						textWidth={textSize.inlineSize}
					/>
				</div>
			</header>
			<div ref={setArea} className="relative flex min-h-0 flex-1">
				<div
					ref={setScroller}
					className="min-w-0 flex-1 overflow-auto [overflow-anchor:none]"
				>
					<div
						ref={setContent}
						className="mx-auto grid max-w-[38rem] gap-5 px-5 py-6 @min-[640px]/frame:px-8 @min-[640px]/frame:py-10"
					>
						<WordText
							text={germanText}
							selectedWordId={wordId}
							onWordClick={onWordClick}
						/>
						<WordText
							text={hebrewText}
							selectedWordId={wordId}
							onWordClick={onWordClick}
						/>
						{sheetOpen ? (
							<div
								aria-hidden="true"
								style={{ height: heights.half }}
							/>
						) : null}
					</div>
				</div>
				<AnimatePresence initial={false} custom={mode === "sheet"}>
					{lookup && mode === "dock" ? (
						<Dock
							key="dock"
							width={dock}
							minWidth={dockWidths.min}
							maxWidth={maxDock}
							defaultWidth={dockWidths.default}
							onWidth={setDockWidth}
							dir={env.dir}
							reducedMotion={env.reducedMotion}
							onClose={close}
						>
							<Lookup
								state={lookup}
								container="dock"
								outlined={outlined}
							/>
						</Dock>
					) : null}
				</AnimatePresence>
				<AnimatePresence initial={false} custom={mode === "dock"}>
					{lookup && mode === "sheet" ? (
						<Sheet
							key="sheet"
							snap={snap}
							heights={heights}
							onSnap={setSnap}
							onClose={close}
							reducedMotion={env.reducedMotion}
						>
							<Lookup
								state={lookup}
								container="sheet"
								outlined={outlined}
							/>
						</Sheet>
					) : null}
				</AnimatePresence>
			</div>
		</div>
	);
}

/** Frame width against the breakpoint, the container in use, and the text's width. */
function Readout({
	frameWidth,
	breakpoint,
	mode,
	textWidth,
}: {
	readonly frameWidth: number;
	readonly breakpoint: number;
	readonly mode: "dock" | "sheet" | null;
	readonly textWidth: number;
}) {
	if (mode === null) return null;
	const Icon = mode === "dock" ? PanelRight : PanelBottom;
	return (
		<p
			dir="ltr"
			className="flex items-center gap-1.5 font-mono text-ink-muted"
		>
			<span>
				frame {frameWidth} {mode === "dock" ? "≥" : "<"} {breakpoint} →
			</span>
			<span className="inline-flex items-center gap-1 rounded-md bg-raised px-1.5 py-0.5 text-ink">
				<Icon
					aria-hidden="true"
					className={cn(
						"size-3.5",
						mode === "dock" && "rtl:-scale-x-100",
					)}
				/>
				{mode}
			</span>
			<span>· text {textWidth}px</span>
		</p>
	);
}
