import { cn } from "lego";
import {
	ArrowDownLeft,
	ArrowDownRight,
	ArrowUpLeft,
	ArrowUpRight,
	CircleCheck,
	TriangleAlert,
	X,
} from "lucide-react";
import { motion } from "motion/react";
import {
	type ReactNode,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import {
	CardSkeleton,
	CardStack,
	germanText,
	hebrewText,
	useFakeResolution,
	type WordClick,
	WordText,
	wordsOf,
} from "@/fixtures";
import {
	DemoInspector,
	InspectorCheck,
	InspectorSection,
	InspectorTry,
	useDemoParam,
	useInspectorAvoid,
	usePlaygroundEnv,
} from "@/shell";
import {
	type Box,
	covered,
	type Placement,
	placeBeside,
	type Scene,
} from "./placement";

const texts = [germanText, hebrewText];
const allWords = texts.flatMap(wordsOf);

/** The stack's preferred width, as tf-demo's Deck roughly has it. */
const stackWidth = 360;

type Measured = Omit<Scene, "stack">;
type Corner = "top-start" | "top-end" | "bottom-start" | "bottom-end";

/**
 * The floating Card stack beside the clicked word's sentence, as KOReader
 * keeps clear of its highlight, with the text scrolling to make room when
 * neither side of the sentence has it. With the marks knob on, the clicked
 * word and its sentence are tinted, and red dashes mark every sentence line
 * the stack covers.
 */
export default function NeverCoverWordDemo() {
	const env = usePlaygroundEnv();
	const [wordId, setWordId] = useDemoParam("word");
	const [marksParam, setMarksParam] = useDemoParam("marks");
	const marks = marksParam === "on";
	const word = allWords.find((candidate) => candidate.id === wordId) ?? null;

	const [front, setFront] = useState<number | null>(null);
	const { cards, pending } = useFakeResolution(word);
	const frontIndex = front ?? cards.length - 1;

	const [area, setArea] = useState<HTMLDivElement | null>(null);
	const scrollerRef = useRef<HTMLDivElement>(null);
	const stackScrollRef = useRef<HTMLDivElement>(null);
	const [stackContent, setStackContent] = useState<HTMLDivElement | null>(
		null,
	);
	const [measured, setMeasured] = useState<Measured | null>(null);
	const [naturalHeight, setNaturalHeight] = useState(0);

	const remeasure = useCallback(() => {
		const scroller = scrollerRef.current;
		setMeasured(
			area && scroller && wordId
				? measure(area, scroller, wordId, env.dir)
				: null,
		);
	}, [area, wordId, env.dir]);

	// Re-measure whenever anything that moves the word or the stack changes.
	useLayoutEffect(remeasure, [
		remeasure,
		cards.length,
		frontIndex,
		naturalHeight,
	]);

	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!area || !scroller) return;
		let frame = 0;
		const onScroll = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(remeasure);
		};
		const observer = new ResizeObserver(onScroll);
		observer.observe(area);
		scroller.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
			scroller.removeEventListener("scroll", onScroll);
		};
	}, [area, remeasure]);

	useEffect(() => {
		if (!stackContent) return;
		const observer = new ResizeObserver(([entry]) => {
			const height = entry?.borderBoxSize[0]?.blockSize;
			if (height !== undefined) setNaturalHeight(Math.round(height));
		});
		observer.observe(stackContent);
		return () => observer.disconnect();
	}, [stackContent]);

	const scene: Scene | null =
		measured && naturalHeight > 0
			? {
					...measured,
					stack: { width: stackWidth, height: naturalHeight },
				}
			: null;
	const placement = scene ? placeBeside(scene) : null;
	useInspectorAvoid(
		word && placement?.where.endsWith("end side")
			? "inline-end"
			: word && placement?.where.endsWith("start side")
				? "inline-start"
				: null,
	);

	// The placement may ask the text to scroll the sentence up to make room.
	// It asks on a new word or Card, never on the reader's own scroll.
	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!area || !scroller || !wordId) return;
		const fresh = measure(area, scroller, wordId, env.dir);
		if (!fresh || naturalHeight === 0) return;
		const { scrollBy } = placeBeside({
			...fresh,
			stack: { width: stackWidth, height: naturalHeight },
		});
		if (Math.abs(scrollBy) > 2)
			scroller.scrollTo({
				top: scroller.scrollTop + scrollBy,
				behavior: env.reducedMotion ? "auto" : "smooth",
			});
	}, [area, wordId, cards.length, naturalHeight, env.dir, env.reducedMotion]);

	// A clamped stack scrolls inside; keep its front Card in view.
	useLayoutEffect(() => {
		const stackScroll = stackScrollRef.current;
		if (stackScroll) stackScroll.scrollTop = stackScroll.scrollHeight;
	}, [cards.length, frontIndex, placement?.maxHeight]);

	const open = (id: string) => {
		setWordId(id, { push: true });
		setFront(null);
	};
	const close = () => {
		setWordId(null, { push: true });
		setFront(null);
	};

	// Escape, or a click on the text that misses every word, closes.
	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!wordId || !scroller) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") close();
		};
		const onClick = (event: MouseEvent) => {
			if (!(event.target as Element).closest("[data-word-id]")) close();
		};
		window.addEventListener("keydown", onKey);
		scroller.addEventListener("click", onClick);
		return () => {
			window.removeEventListener("keydown", onKey);
			scroller.removeEventListener("click", onClick);
		};
	});

	const { lineHits, wordHit, visibleLines } = coverage(placement, scene);
	const sentenceId = word?.sentenceId;

	// The panel is left-to-right chrome; the arrows follow the frame's dir.
	const cornerIcon = cn("size-4", env.dir === "rtl" && "-scale-x-100");
	const pickCorner = (corner: Corner) => {
		const scroller = scrollerRef.current;
		if (!area || !scroller) return;
		const target = cornerWord(area, scroller, corner, env.dir);
		if (target) open(target);
	};

	return (
		<div className="flex h-full flex-col bg-canvas text-ink">
			<DemoInspector>
				<InspectorSection>
					<InspectorTry>
						<p>
							The floating Deck goes beside the clicked word's
							sentence (the Attestation) and never covers it. When
							neither side has room, the text scrolls the sentence
							up to make it. The readout below says what the Deck
							covers; the marks knob tints the sentence and dashes
							covered lines.
						</p>
					</InspectorTry>
				</InspectorSection>
				<InspectorSection title="Try">
					<InspectorTry>
						<p>
							A word in the last visible line (or the corner
							buttons), at 390 and at 1440.
						</p>
					</InspectorTry>
				</InspectorSection>
				<InspectorSection title="Knobs">
					<InspectorCheck
						checked={marks}
						onChange={(on) => setMarksParam(on ? "on" : null)}
						title="Tint the Attestation and dash the sentence lines the Deck covers"
					>
						<TriangleAlert aria-hidden="true" className="size-4" />
						Mark the sentence and covered lines
					</InspectorCheck>
					<fieldset className="grid gap-1.5">
						<legend className="mb-1.5 text-xs text-ink-muted">
							Click the word nearest a corner
						</legend>
						<div className="flex gap-0.5">
							<CornerButton
								corner="top-start"
								onPick={pickCorner}
							>
								<ArrowUpLeft className={cornerIcon} />
							</CornerButton>
							<CornerButton corner="top-end" onPick={pickCorner}>
								<ArrowUpRight className={cornerIcon} />
							</CornerButton>
							<CornerButton
								corner="bottom-start"
								onPick={pickCorner}
							>
								<ArrowDownLeft className={cornerIcon} />
							</CornerButton>
							<CornerButton
								corner="bottom-end"
								onPick={pickCorner}
							>
								<ArrowDownRight className={cornerIcon} />
							</CornerButton>
						</div>
					</fieldset>
				</InspectorSection>
				<InspectorSection title="Readout">
					<Status
						open={Boolean(word)}
						placement={placement}
						wordHit={wordHit}
						lineHits={lineHits.length}
						visibleLines={visibleLines}
					/>
				</InspectorSection>
			</DemoInspector>

			<div ref={setArea} className="relative min-h-0 flex-1">
				<div
					ref={scrollerRef}
					data-ncw-reader=""
					className="absolute inset-0 overflow-y-auto"
				>
					{marks && sentenceId && wordId ? (
						<style>{attestationStyle(sentenceId, wordId)}</style>
					) : null}
					<div
						data-ncw-column=""
						className="mx-auto grid max-w-[36rem] gap-4 px-4 pt-4 @min-[640px]/frame:px-6 @min-[640px]/frame:pt-6"
						style={{
							paddingBlockEnd: Math.round(
								(measured?.view.height ??
									area?.clientHeight ??
									0) * 0.55,
							),
						}}
					>
						{texts.map((text) => (
							<WordText
								key={text.id}
								text={text}
								selectedWordId={wordId}
								onWordClick={({ word: clicked }: WordClick) =>
									open(clicked.id)
								}
							/>
						))}
					</div>
				</div>

				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					{word ? (
						<FloatingDeck
							placement={placement}
							covering={marks && lineHits.length > 0}
							clamped={
								placement !== null &&
								naturalHeight > placement.maxHeight + 1
							}
							wordId={wordId}
							scrollRef={stackScrollRef}
							contentRef={setStackContent}
							onClose={close}
						>
							<CardStack
								cards={cards}
								frontIndex={frontIndex}
								onFront={setFront}
							/>
							{pending[0] ? (
								<CardSkeleton kind={pending[0]} collapsed />
							) : null}
						</FloatingDeck>
					) : null}

					{(marks ? lineHits : []).map((hit) => (
						<div
							key={`${hit.top}:${hit.start}`}
							className="absolute rounded-sm border-2 border-dashed border-destructive bg-destructive/15"
							style={{
								insetInlineStart: hit.start,
								top: hit.top,
								width: hit.width,
								height: hit.height,
							}}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

/** The stack's floating box, tracking the word without lag while scrolling. */
function FloatingDeck({
	placement,
	covering,
	clamped,
	wordId,
	scrollRef,
	contentRef,
	onClose,
	children,
}: {
	readonly placement: Placement | null;
	readonly covering: boolean;
	/** Too tall for its room: it scrolls, and its top fades out. */
	readonly clamped: boolean;
	readonly wordId: string | null;
	readonly scrollRef: RefObject<HTMLDivElement | null>;
	readonly contentRef: (element: HTMLDivElement | null) => void;
	readonly onClose: () => void;
	readonly children: ReactNode;
}) {
	return (
		<div
			className={cn(
				"pointer-events-auto absolute",
				!placement && "invisible",
			)}
			style={{
				insetInlineStart: placement?.box.start ?? 0,
				top: placement?.box.top ?? 0,
				width: placement?.box.width ?? stackWidth,
			}}
		>
			<motion.div
				key={wordId}
				initial={{ opacity: 0, scale: 0.97 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.18, ease: "easeOut" }}
				className={cn(
					"rounded-xl",
					covering &&
						"outline-2 outline-offset-2 outline-destructive",
				)}
			>
				<div
					ref={scrollRef}
					className="overflow-y-auto overscroll-contain rounded-xl"
					style={{
						maxHeight: placement?.maxHeight,
						maskImage: clamped
							? "linear-gradient(to bottom, transparent, black 2.5rem)"
							: undefined,
					}}
				>
					<div ref={contentRef} className="grid gap-1.5">
						{children}
					</div>
				</div>
			</motion.div>
			<button
				type="button"
				aria-label="Close the lookup"
				onClick={onClose}
				className="absolute -end-2 -top-2 grid size-6 cursor-pointer place-items-center rounded-full border border-line bg-paper text-ink-soft shadow hover:text-ink"
			>
				<X aria-hidden="true" className="size-3.5" />
			</button>
		</div>
	);
}

function CornerButton({
	corner,
	onPick,
	children,
}: {
	readonly corner: Corner;
	readonly onPick: (corner: Corner) => void;
	readonly children: ReactNode;
}) {
	return (
		<button
			type="button"
			title={`Click the word nearest the ${corner.replace("-", " ")} corner`}
			aria-label={`Word nearest the ${corner.replace("-", " ")} corner`}
			onClick={() => onPick(corner)}
			className="grid size-7 cursor-pointer place-items-center rounded-md text-ink-soft hover:bg-raised hover:text-ink"
		>
			{children}
		</button>
	);
}

function Status({
	open,
	placement,
	wordHit,
	lineHits,
	visibleLines,
}: {
	readonly open: boolean;
	readonly placement: Placement | null;
	readonly wordHit: boolean;
	readonly lineHits: number;
	readonly visibleLines: number;
}) {
	if (!open || !placement)
		return <p className="text-xs text-ink-muted">Click any word.</p>;
	const verdict = wordHit
		? "covers the clicked word"
		: lineHits > 0
			? `covers ${lineHits} of ${visibleLines} sentence ${visibleLines === 1 ? "line" : "lines"}`
			: "word and sentence clear";
	return (
		<p
			role="status"
			className={cn(
				"flex items-center gap-1.5 text-xs",
				lineHits > 0 ? "text-destructive" : "text-ink-soft",
			)}
		>
			{lineHits > 0 ? (
				<TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
			) : (
				<CircleCheck aria-hidden="true" className="size-4 shrink-0" />
			)}
			<span>
				<span className="text-ink-muted">{placement.where} · </span>
				{verdict}
			</span>
		</p>
	);
}

/** Tints the Attestation's sentence, and its word more strongly. */
function attestationStyle(sentenceId: string, wordId: string): string {
	return `[data-ncw-reader] [data-sentence-id="${sentenceId}"] {
	background: color-mix(in oklch, var(--link) 16%, transparent);
	border-radius: 4px;
	box-decoration-break: clone;
	-webkit-box-decoration-break: clone;
}
[data-ncw-reader] [data-word-id="${wordId}"] {
	background: color-mix(in oklch, var(--link) 38%, transparent);
	border-radius: 3px;
}`;
}

/** The word, its sentence's lines and the viewport, in logical px. */
function measure(
	area: HTMLElement,
	scroller: HTMLElement,
	wordId: string,
	dir: "ltr" | "rtl",
): Measured | null {
	const wordElement = scroller.querySelector<HTMLElement>(
		`[data-word-id="${wordId}"]`,
	);
	if (!wordElement) return null;
	const sentenceElement =
		wordElement.closest<HTMLElement>("[data-sentence-id]") ?? wordElement;
	const origin = area.getBoundingClientRect();
	const toBox = (rect: DOMRect): Box => ({
		start:
			dir === "rtl" ? origin.right - rect.right : rect.left - origin.left,
		top: rect.top - origin.top,
		width: rect.width,
		height: rect.height,
	});
	return {
		view: { width: origin.width, height: origin.height },
		word: toBox(wordElement.getBoundingClientRect()),
		column: toBox(
			(
				scroller.querySelector("[data-ncw-column]") ?? scroller
			).getBoundingClientRect(),
		),
		lines: [...sentenceElement.getClientRects()]
			.filter((rect) => rect.width > 1)
			.map(toBox),
		scrollRoom: {
			back: scroller.scrollTop,
			forward:
				scroller.scrollHeight -
				scroller.clientHeight -
				scroller.scrollTop,
		},
	};
}

/** The id of the fully visible word nearest one corner of the viewport. */
function cornerWord(
	area: HTMLElement,
	scroller: HTMLElement,
	corner: Corner,
	dir: "ltr" | "rtl",
): string | null {
	const origin = area.getBoundingClientRect();
	const atStart = corner.endsWith("start");
	const x = atStart === (dir === "ltr") ? origin.left : origin.right;
	const y = corner.startsWith("top") ? origin.top : origin.bottom;
	let best: string | null = null;
	let bestDistance = Number.POSITIVE_INFINITY;
	for (const element of scroller.querySelectorAll<HTMLElement>(
		"[data-word-id]",
	)) {
		const rect = element.getBoundingClientRect();
		if (rect.top < origin.top || rect.bottom > origin.bottom) continue;
		const distance = Math.hypot(
			(rect.left + rect.right) / 2 - x,
			(rect.top + rect.bottom) / 2 - y,
		);
		if (distance < bestDistance) {
			bestDistance = distance;
			best = element.dataset.wordId ?? null;
		}
	}
	return best;
}

/** What the stack covers: sentence lines, the word, and lines in view. */
function coverage(placement: Placement | null, scene: Scene | null) {
	if (!placement || !scene)
		return { lineHits: [], wordHit: false, visibleLines: 0 };
	return {
		lineHits: covered(placement.box, scene.lines, scene.view),
		wordHit: covered(placement.box, [scene.word], scene.view).length > 0,
		visibleLines: covered(
			{ start: 0, top: 0, ...scene.view },
			scene.lines,
			scene.view,
		).length,
	};
}
