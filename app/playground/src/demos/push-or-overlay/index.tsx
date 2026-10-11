import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	CardSkeleton,
	CardStack,
	type FakeCardLink,
	germanText,
	useFakeResolution,
	type WordClick,
	WordText,
	wordsOf,
} from "@/fixtures";
import { useDemoParam, usePlaygroundEnv } from "@/shell";
import { PxSlider, Segmented } from "./controls";
import { placeWord, useInlineSize, type WordState } from "./geometry";

const words = wordsOf(germanText);
const thresholds = [360, 480, 600] as const;
type Threshold = (typeof thresholds)[number];
const overlayStyles = ["shadow", "scrim"] as const;
type OverlayStyle = (typeof overlayStyles)[number];
const keepClearOptions = ["nudge", "off"] as const;
type KeepClear = (typeof keepClearOptions)[number];

/** An overlaid pane always leaves this much text uncovered. */
const minUncovered = 56;
const slide = { type: "spring", duration: 0.35, bounce: 0 } as const;

/**
 * Push or overlay: a lookup pane on the inline end that pushes the text
 * aside while at least `threshold` px of text remains beside it, and
 * otherwise floats over the text. In overlay, the text can slide sideways
 * so the clicked word lands in the uncovered strip. While the text
 * reflows, the clicked word keeps its height on screen.
 */
export default function PushOrOverlayDemo() {
	const { dir } = usePlaygroundEnv();
	const [wordId, setWordId] = useDemoParam("word");
	const [thresholdParam, setThreshold] = useDemoParam("threshold");
	const [paneParam, setPane] = useDemoParam("pane");
	const [overlayStyle, setOverlayStyle] = useState<OverlayStyle>("shadow");
	const [keepClear, setKeepClear] = useState<KeepClear>("nudge");
	const [lookup, setLookup] = useState<string | null>(null);
	const [front, setFront] = useState<number | null>(null);

	const threshold = (thresholds.find((t) => String(t) === thresholdParam) ??
		480) as Threshold;
	const requestedPane = clampPane(Number(paneParam) || 360);

	const word = words.find((candidate) => candidate.id === wordId) ?? null;
	const open = word !== null;
	const { cards, pending } = useFakeResolution(lookup ?? word);

	const [body, setBody] = useState<HTMLDivElement | null>(null);
	const bodyWidth = useInlineSize(body);
	const paneWidth = Math.min(
		requestedPane,
		Math.max(0, bodyWidth - minUncovered),
	);
	const remaining = bodyWidth - paneWidth;
	const mode = remaining >= threshold ? "push" : "overlay";
	const pushing = open && mode === "push";

	const scrollerRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	/** The word to hold still, which outlives the pane it was opened for. */
	const anchorWordId = useRef<string | null>(null);
	/** The anchor word's top, relative to the scroller's top. */
	const anchorTop = useRef<number | null>(null);
	/** A scrollTop this demo set, so its scroll event isn't the reader's. */
	const ownScrollTop = useRef<number | null>(null);
	const [nudge, setNudge] = useState(0);
	const [wordState, setWordState] = useState<WordState | null>(null);

	const findWordElement = useCallback(
		(id: string | null) =>
			id
				? (contentRef.current?.querySelector<HTMLElement>(
						`[data-word-id="${CSS.escape(id)}"]`,
					) ?? null)
				: null,
		[],
	);

	// Runs whenever the text reflows or the layout inputs change: holds the
	// anchor word at its height, then nudges the selected word clear of an
	// overlaid pane.
	const settle = useCallback(() => {
		const scroller = scrollerRef.current;
		const content = contentRef.current;
		if (!body || !scroller || !content) return;
		const scrollerRect = scroller.getBoundingClientRect();

		const anchor = findWordElement(anchorWordId.current);
		if (anchor && anchorTop.current !== null) {
			const drift =
				anchor.getBoundingClientRect().top -
				scrollerRect.top -
				anchorTop.current;
			if (Math.abs(drift) > 0.5) {
				scroller.scrollTop += drift;
				ownScrollTop.current = scroller.scrollTop;
			}
		}

		const selected = findWordElement(wordId);
		if (!open || !selected) {
			setNudge(0);
			setWordState(null);
			return;
		}
		const wordRect = selected.getBoundingClientRect();
		const contentRect = content.getBoundingClientRect();
		const bodyRect = body.getBoundingClientRect();
		// The word's place in the body before any nudge.
		const left =
			wordRect.left -
			contentRect.left +
			scrollerRect.left -
			bodyRect.left;
		const right = left + wordRect.width;
		if (mode === "push") {
			setNudge(0);
			setWordState("clear");
			return;
		}
		const placed = placeWord({
			left,
			right,
			width: bodyRect.width,
			paneWidth,
			dir,
			nudge: keepClear === "nudge",
		});
		setNudge(placed.shift);
		setWordState(placed.state);
	}, [body, wordId, open, mode, keepClear, dir, paneWidth, findWordElement]);

	useEffect(() => {
		const content = contentRef.current;
		if (!content) return;
		const observer = new ResizeObserver(() => settle());
		observer.observe(content);
		return () => observer.disconnect();
	}, [settle]);

	useEffect(() => {
		if (!open) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setWordId(null, { push: true });
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, setWordId]);

	const onWordClick = ({ word: clicked, rect }: WordClick) => {
		const scroller = scrollerRef.current;
		anchorWordId.current = clicked.id;
		anchorTop.current = scroller
			? rect.top - scroller.getBoundingClientRect().top
			: null;
		setWordId(clicked.id, { push: true });
		setLookup(null);
		setFront(null);
	};
	const onScroll = () => {
		const scroller = scrollerRef.current;
		if (!scroller) return;
		if (ownScrollTop.current === scroller.scrollTop) {
			ownScrollTop.current = null;
			return;
		}
		// The reader scrolled: hold the word where they put it.
		const anchor = findWordElement(anchorWordId.current);
		anchorTop.current = anchor
			? anchor.getBoundingClientRect().top -
				scroller.getBoundingClientRect().top
			: null;
	};
	const onLinkClick = (link: FakeCardLink) => {
		setLookup(link.word);
		setFront(null);
	};
	const close = () => setWordId(null, { push: true });

	return (
		<div className="flex h-full flex-col text-sm">
			<header className="grid gap-2 border-b border-line bg-paper px-4 py-3">
				<div className="grid gap-0.5">
					<p className="text-ink">
						<strong className="font-semibold">
							Push or overlay.
						</strong>{" "}
						The lookup pane pushes the text aside while enough text
						remains beside it, and floats over the text otherwise.{" "}
						<span className="text-ink-muted">
							From Hypothesis; LinguaCafe pads the text by the
							sidebar width.
						</span>
					</p>
					<p className="text-ink-soft">
						Try: click a word, drag the pane width across the
						threshold, then switch the frame to 800 and 390.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
					<Segmented
						label="Push from"
						options={thresholds}
						value={threshold}
						onChange={(value) => setThreshold(String(value))}
						format={(value) => `${value}px`}
					/>
					<PxSlider
						label="Pane"
						min={paneMin}
						max={paneMax}
						step={20}
						value={requestedPane}
						onChange={(value) => setPane(String(value))}
					/>
					<Segmented
						label="Overlay"
						options={overlayStyles}
						value={overlayStyle}
						onChange={setOverlayStyle}
					/>
					<Segmented
						label="Keep word clear"
						options={keepClearOptions}
						value={keepClear}
						onChange={setKeepClear}
					/>
				</div>
				<Readout
					open={open}
					remaining={remaining}
					threshold={threshold}
					paneWidth={paneWidth}
					clamped={paneWidth < requestedPane}
					mode={mode}
					wordState={wordState}
					nudge={nudge}
				/>
			</header>

			<div
				ref={setBody}
				className="relative min-h-0 flex-1 overflow-hidden"
			>
				<div
					ref={scrollerRef}
					onScroll={onScroll}
					className="absolute inset-y-0 start-0 overflow-y-auto transition-[inset-inline-end] duration-350 ease-[cubic-bezier(0.2,0,0,1)]"
					style={{ insetInlineEnd: pushing ? paneWidth : 0 }}
				>
					<motion.div
						ref={contentRef}
						animate={{ x: nudge }}
						transition={slide}
					>
						<article className="mx-auto grid max-w-[42rem] gap-6 px-6 pt-8 pb-48 @min-[480px]/frame:px-10">
							<h2
								lang={germanText.lang}
								dir="ltr"
								className="text-2xl font-semibold text-ink"
							>
								{germanText.title}
							</h2>
							<WordText
								text={germanText}
								selectedWordId={wordId}
								onWordClick={onWordClick}
							/>
						</article>
					</motion.div>
				</div>

				<AnimatePresence>
					{open && mode === "overlay" && overlayStyle === "scrim" ? (
						<motion.button
							key="scrim"
							type="button"
							aria-label="Close lookup"
							onClick={close}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="absolute inset-0 z-10 cursor-default bg-black/30"
						/>
					) : null}
					{word ? (
						<motion.aside
							key="pane"
							aria-label="Lookup"
							initial={{ x: dir === "rtl" ? "-100%" : "100%" }}
							animate={{ x: 0 }}
							exit={{ x: dir === "rtl" ? "-100%" : "100%" }}
							transition={slide}
							style={{ width: paneWidth }}
							className={`absolute inset-y-0 end-0 z-20 flex flex-col border-s border-line bg-canvas ${
								mode === "overlay"
									? "shadow-[0_0_48px_-8px_oklch(0%_0_0/0.55)]"
									: ""
							}`}
						>
							<div className="flex items-center gap-2 border-b border-line px-4 py-2">
								<span className="truncate font-semibold text-ink">
									{lookup ?? word.text}
								</span>
								<span className="rounded-full border border-line px-2 py-px font-mono text-[0.68rem] text-ink-muted">
									{mode === "push" ? "pushing" : "overlaying"}
								</span>
								<button
									type="button"
									onClick={close}
									aria-label="Close lookup"
									className="ms-auto grid size-8 cursor-pointer place-items-center rounded-md text-ink-soft hover:bg-paper hover:text-ink"
								>
									<X className="size-4" />
								</button>
							</div>
							<div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto p-3">
								<CardStack
									cards={cards}
									frontIndex={front ?? cards.length - 1}
									onFront={setFront}
									onLinkClick={onLinkClick}
								/>
								{pending.map((kind) => (
									<CardSkeleton
										key={kind}
										kind={kind}
										collapsed
									/>
								))}
							</div>
						</motion.aside>
					) : null}
				</AnimatePresence>
			</div>
		</div>
	);
}

const paneMin = 280;
const paneMax = 520;

function clampPane(width: number): number {
	return Math.min(paneMax, Math.max(paneMin, width));
}

/** The live measurement: what the text keeps and which mode that buys. */
function Readout({
	open,
	remaining,
	threshold,
	paneWidth,
	clamped,
	mode,
	wordState,
	nudge,
}: {
	readonly open: boolean;
	readonly remaining: number;
	readonly threshold: number;
	readonly paneWidth: number;
	readonly clamped: boolean;
	readonly mode: "push" | "overlay";
	readonly wordState: WordState | null;
	readonly nudge: number;
}) {
	const word =
		wordState === "covered"
			? "word covered"
			: wordState === "nudged"
				? `word nudged ${Math.abs(Math.round(nudge))}px`
				: wordState === "clear"
					? "word clear"
					: null;
	return (
		<p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-ink-soft">
			<span
				className={`rounded px-1.5 py-px font-semibold ${
					mode === "push"
						? "bg-link/15 text-link"
						: "bg-ink/10 text-ink"
				}`}
			>
				{mode}
			</span>
			<span>
				{open ? "" : "closed · would leave "}
				text {Math.round(remaining)}px {mode === "push" ? "≥" : "<"}{" "}
				{threshold}
			</span>
			<span className="text-ink-muted">
				· pane {Math.round(paneWidth)}px{clamped ? " (capped)" : ""}
			</span>
			{open && word ? (
				<span
					className={
						wordState === "covered" ? "text-ink" : "text-ink-muted"
					}
				>
					· {word}
				</span>
			) : null}
		</p>
	);
}
