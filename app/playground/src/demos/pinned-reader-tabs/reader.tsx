import { cn } from "lego";
import { Maximize2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
	type MouseEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	CardSkeleton,
	CardView,
	germanText,
	hebrewText,
	useFakeResolution,
	WordText,
	wordsOf,
} from "@/fixtures";
import { useDemoParam, usePlaygroundEnv } from "@/shell";
import { type Box, beside, type Scene } from "./beside";
import { resolveEntry } from "./entries";
import { LinkedCard } from "./notes";
import { type OpenHow, openHowOf } from "./tabs";

const texts = [germanText, hebrewText];
const allWords = texts.flatMap(wordsOf);

/** The Deck's preferred width, as tf-demo's Deck roughly has it. */
const deckWidth = 360;
/** Quicker than the fixtures' default deal, so trying links doesn't drag. */
const dealDelaysMs: readonly number[] = [120, 300, 520, 760];

type Measured = Omit<Scene, "stack">;

/** What the inspector shows to prove the reader kept its state. */
export type ReaderState = {
	readonly scrollTop: number;
	readonly word: string | null;
	readonly sentence: string | null;
	readonly front: string | null;
};

/**
 * The pinned reader tab: the text, and the Deck a clicked word deals
 * beside its sentence, as in the hover-preview demo. It stays mounted
 * while another tab shows, so its scroll, its Deck and its front Card
 * survive. Links in a Card and the Card's ⤢ call `onOpen`, which opens a
 * Sheet tab; the reader itself never navigates.
 */
export function ReaderView({
	active,
	onOpen,
	onState,
}: {
	/** Whether the reader is the tab on show, so Esc is its own. */
	readonly active: boolean;
	readonly onOpen: (word: string, how: OpenHow) => void;
	readonly onState: (state: ReaderState) => void;
}) {
	const env = usePlaygroundEnv();
	const [wordId, setWordId] = useDemoParam("word");
	const word = allWords.find((candidate) => candidate.id === wordId) ?? null;

	const [front, setFront] = useState<number | null>(null);
	const dealt = useFakeResolution(word, dealDelaysMs);
	const allCards = useMemo(
		() => (word ? resolveEntry(word).cards : []),
		[word],
	);
	const cards = allCards.slice(0, dealt.cards.length);
	const frontIndex = Math.min(front ?? cards.length - 1, cards.length - 1);
	const shown = cards.slice(0, frontIndex + 1);

	const [area, setArea] = useState<HTMLDivElement | null>(null);
	const scrollerRef = useRef<HTMLDivElement>(null);
	const deckScrollRef = useRef<HTMLDivElement>(null);
	const [deckContent, setDeckContent] = useState<HTMLDivElement | null>(null);
	const [measured, setMeasured] = useState<Measured | null>(null);
	const [naturalHeight, setNaturalHeight] = useState(0);
	const [scrollTop, setScrollTop] = useState(0);

	const frontTitle = shown.at(-1)?.kind ?? null;
	useEffect(
		() =>
			onState({
				scrollTop,
				word: word?.text ?? null,
				sentence: word?.sentence ?? null,
				front: frontTitle,
			}),
		[onState, scrollTop, word, frontTitle],
	);

	const remeasure = useCallback(() => {
		const scroller = scrollerRef.current;
		setMeasured(
			area && scroller && wordId
				? measure(area, scroller, wordId, env.dir)
				: null,
		);
	}, [area, wordId, env.dir]);

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
			frame = requestAnimationFrame(() => {
				setScrollTop(Math.round(scroller.scrollTop));
				remeasure();
			});
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
		if (!deckContent) return;
		const observer = new ResizeObserver(([observed]) => {
			const height = observed?.borderBoxSize[0]?.blockSize;
			if (height !== undefined) setNaturalHeight(Math.round(height));
		});
		observer.observe(deckContent);
		return () => observer.disconnect();
	}, [deckContent]);

	const placement =
		measured && naturalHeight > 0
			? beside({
					...measured,
					stack: { width: deckWidth, height: naturalHeight },
				})
			: null;

	// When neither side of the sentence fits the whole Deck, the text
	// scrolls the sentence up. It asks on a new word or Card, never on the
	// reader's own scroll, nor on a tab switch.
	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!area || !scroller || !wordId || naturalHeight === 0) return;
		const fresh = measure(area, scroller, wordId, env.dir);
		if (!fresh) return;
		const { scrollBy } = beside({
			...fresh,
			stack: { width: deckWidth, height: naturalHeight },
		});
		if (Math.abs(scrollBy) > 2)
			scroller.scrollTo({
				top: scroller.scrollTop + scrollBy,
				behavior: env.reducedMotion ? "auto" : "smooth",
			});
	}, [area, wordId, cards.length, naturalHeight, env.dir, env.reducedMotion]);

	// A clamped Deck scrolls inside; keep its front Card in view. Only a
	// Deck taller than its room scrolls: an entering Card's transform
	// would otherwise scroll a Deck that fits by its few px.
	const maxHeight = placement?.maxHeight;
	useLayoutEffect(() => {
		const deckScroll = deckScrollRef.current;
		if (!deckScroll || maxHeight === undefined) return;
		deckScroll.scrollTop =
			naturalHeight > maxHeight ? deckScroll.scrollHeight : 0;
	}, [cards.length, frontIndex, maxHeight, naturalHeight]);

	const open = (id: string) => {
		setWordId(id, { push: true });
		setFront(null);
	};
	const closeDeck = useCallback(() => {
		setWordId(null, { push: true });
		setFront(null);
	}, [setWordId]);

	// Escape closes the Deck while the reader is on show; a click on the
	// text that misses every word closes it too.
	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!scroller || !wordId) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !event.defaultPrevented && active)
				closeDeck();
		};
		const onClick = (event: globalThis.MouseEvent) => {
			if (!(event.target as Element).closest("[data-word-id]"))
				closeDeck();
		};
		document.addEventListener("keydown", onKey);
		scroller.addEventListener("click", onClick);
		return () => {
			document.removeEventListener("keydown", onKey);
			scroller.removeEventListener("click", onClick);
		};
	}, [wordId, active, closeDeck]);

	const openAsSheet = (title: string) => (event: MouseEvent) => {
		if (event.type === "auxclick" && event.button !== 1) return;
		event.preventDefault();
		onOpen(title, openHowOf(event));
	};

	return (
		<div ref={setArea} className="relative h-full min-h-0">
			<div
				ref={scrollerRef}
				data-reader-scroller=""
				className="absolute inset-0 overflow-y-auto"
			>
				<div
					data-hp-column=""
					className="mx-auto grid max-w-[36rem] gap-4 px-4 pt-4 @min-[640px]/frame:px-6 @min-[640px]/frame:pt-6"
					style={{
						paddingBlockEnd: Math.round(
							(measured?.view.height ?? area?.clientHeight ?? 0) *
								0.55,
						),
					}}
				>
					{texts.map((text) => (
						<WordText
							key={text.id}
							text={text}
							selectedWordId={wordId}
							onWordClick={({ word: clicked }) =>
								open(clicked.id)
							}
						/>
					))}
				</div>
			</div>

			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				{word ? (
					<div
						className={cn(
							"pointer-events-auto absolute",
							!placement && "invisible",
						)}
						style={{
							insetInlineStart: placement?.box.start ?? 0,
							top: placement?.box.top ?? 0,
							width: placement?.box.width ?? deckWidth,
						}}
					>
						<motion.div
							key={wordId}
							initial={
								env.reducedMotion
									? false
									: { opacity: 0, scale: 0.97 }
							}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.18, ease: "easeOut" }}
						>
							<div
								ref={deckScrollRef}
								className="overflow-y-auto overscroll-contain rounded-xl"
								style={{ maxHeight: placement?.maxHeight }}
							>
								<div
									ref={setDeckContent}
									data-hp-host="reader"
									className="flex flex-col"
								>
									<AnimatePresence initial={false}>
										{shown.map((card, index) => {
											const depth =
												shown.length - 1 - index;
											return (
												<motion.div
													key={card.id}
													layout="position"
													initial={{
														opacity: 0,
														y: 10,
													}}
													animate={{
														opacity: 1,
														y: 0,
													}}
													exit={{ opacity: 0 }}
													transition={{
														type: "spring",
														duration: 0.3,
														bounce: 0,
													}}
													style={{
														marginInline: `${Math.min(depth, 4) * 0.5}rem`,
														zIndex: index,
													}}
													className={cn(
														"relative",
														depth > 0 && "-mb-1.5",
													)}
												>
													{depth > 0 ? (
														<CardView
															card={card}
															collapsed
															onTailClick={() =>
																setFront(index)
															}
															className="pb-3"
														/>
													) : (
														<LinkedCard
															card={card}
															scope={`deck~${wordId}`}
															action={
																<button
																	type="button"
																	title="Open as Sheet"
																	aria-label="Open as Sheet"
																	onClick={openAsSheet(
																		card.title,
																	)}
																	onAuxClick={openAsSheet(
																		card.title,
																	)}
																	className="grid size-7 cursor-pointer place-items-center rounded-md text-ink-faint hover:bg-canvas hover:text-ink"
																>
																	<Maximize2
																		aria-hidden="true"
																		className="size-3.5 rtl:-scale-x-100"
																	/>
																</button>
															}
														/>
													)}
												</motion.div>
											);
										})}
									</AnimatePresence>
									{front === null
										? dealt.pending.map((kind) => (
												<CardSkeleton
													key={kind}
													kind={kind}
													collapsed
													className="mt-1"
												/>
											))
										: null}
								</div>
							</div>
						</motion.div>
						<button
							type="button"
							aria-label="Close the Deck"
							onClick={closeDeck}
							className="absolute -end-2 -top-2 z-10 grid size-6 cursor-pointer place-items-center rounded-full border border-line bg-paper text-ink-soft shadow hover:text-ink"
						>
							<X aria-hidden="true" className="size-3.5" />
						</button>
					</div>
				) : null}
			</div>
		</div>
	);
}

/** The word, its sentence's lines and the viewport, in logical px. */
function measure(
	area: HTMLElement,
	scroller: HTMLElement,
	wordId: string,
	dir: "ltr" | "rtl",
): Measured | null {
	const wordElement = scroller.querySelector<HTMLElement>(
		`[data-word-id="${CSS.escape(wordId)}"]`,
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
				scroller.querySelector("[data-hp-column]") ?? scroller
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
