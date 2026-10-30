import { cn } from "lego";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { type FixtureWord, WordText, wordsOf } from "@/fixtures";
import {
	DemoInspector,
	type InspectorAvoid,
	useInspectorAvoid,
	usePlaygroundEnv,
} from "@/shell";
import { CardTail, DeckCard } from "./cards";
import { type CardKind, firstCard, nextCard, titleOf } from "./cases";
import { type Dealt, Deck } from "./deck";
import { columnKey } from "./focus";
import { InspectorPanel } from "./inspector";
import type { GlossCase } from "./model";
import { CoverPage } from "./pages";
import { type Box, type Placement, placeBeside, type Scene } from "./placement";
import { type Cover, type CoverStack, Sheet } from "./sheet";
import { useKnobs } from "./use-knobs";

/** Wide enough for six glossed words in a row. */
const popoverWidth = 408;

type Measured = Omit<Scene, "stack">;

/** A token's focus, held for the Card or Cover it was given on. */
type Held = { readonly at: string; readonly key: string };

/**
 * Interlinear gloss: the clicked words' popover is a Deck of two glosses.
 * The Attestation Card glosses the words on the page into their Surface
 * line, syntax only, with lines that cross where the order changes; its
 * last line is the Surface line, the link that deals the Surface Card.
 * The Surface Card glosses that line morpheme by morpheme into the Lemma,
 * whose line deals the Lemma Card. A tail goes back; ⤢ opens a Card as a
 * Sheet, where the same links push Covers. The case, the clicked word and
 * the knobs live in the URL.
 */
export default function InterlinearGlossDemo() {
	const env = usePlaygroundEnv();
	const {
		glossCase,
		setCase,
		wordId,
		setWordId,
		knobs,
		note,
		quiet,
		setKnob,
	} = useKnobs();
	const words = wordsOf(glossCase.text);
	const word = words.find((each) => each.id === wordId && each.unitId);

	const nextKey = useRef(0);
	const fresh = () => {
		nextKey.current += 1;
		return `k${nextKey.current}`;
	};
	const [deck, setDeck] = useState<readonly Dealt[] | null>(null);
	// The Deck a click deals: its first Card until a link deals another.
	const shownDeck: readonly Dealt[] = word
		? (deck ?? [{ key: "first", kind: firstCard(glossCase, quiet) }])
		: [];
	const [sheet, setSheet] = useState<CoverStack | null>(null);
	const [picked, setPicked] = useState<Held | null>(null);
	const [hover, setHover] = useState<Held | null>(null);
	const top = sheet?.covers.at(-1);
	const front = shownDeck.at(-1);

	const cover = (kind: CardKind): Cover => ({
		key: fresh(),
		kind,
		label: titleOf(glossCase, kind),
		lang: "de",
	});
	const pushCover = (kind: CardKind) =>
		setSheet((open) => ({
			covers: [...(open?.covers ?? []), cover(kind)],
			move: "push",
		}));
	const popCover = (index: number) =>
		setSheet((open) => {
			if (!open || index >= open.covers.length - 1) return open;
			if (index < 0) return null;
			return { covers: open.covers.slice(0, index + 1), move: "back" };
		});
	const deal = (kind: CardKind) =>
		setDeck([...shownDeck, { key: fresh(), kind }]);
	const backTo = (index: number) => setDeck(shownDeck.slice(0, index + 1));

	const resetFocus = () => {
		setPicked(null);
		setHover(null);
	};
	const openWord = (clicked: FixtureWord) => {
		if (!clicked.unitId) {
			closePopover();
			return;
		}
		setWordId(clicked.id, { push: true });
		setDeck(null);
		setSheet(null);
		resetFocus();
	};
	const closePopover = () => {
		setWordId(null, { push: true });
		setDeck(null);
		resetFocus();
	};
	const switchCase = (next: GlossCase) => {
		setCase(next);
		setDeck(null);
		setSheet(null);
		resetFocus();
	};
	const onKnob = (
		name: Parameters<typeof setKnob>[0],
		value: string | boolean,
	) => {
		setKnob(name, value);
		if (name === "quiet") {
			setDeck(null);
			setSheet(null);
		}
	};

	/** Everything a Card or Cover at `at` needs, its focus included. */
	const propsAt = (at: string, kind: CardKind) => {
		const focus =
			hover?.at === at
				? hover.key
				: picked?.at === at
					? picked.key
					: firstFocus(glossCase, kind, word);
		return {
			glossCase,
			knobs,
			note,
			focus,
			onFocus: (key: string) => setPicked({ at, key }),
			onHover: (key: string | null) => setHover(key ? { at, key } : null),
		};
	};

	const [area, setArea] = useState<HTMLDivElement | null>(null);
	const scrollerRef = useRef<HTMLDivElement>(null);
	const [content, setContent] = useState<HTMLDivElement | null>(null);
	const [measured, setMeasured] = useState<Measured | null>(null);
	const [naturalHeight, setNaturalHeight] = useState(0);

	const remeasure = useCallback(() => {
		const scroller = scrollerRef.current;
		setMeasured(
			area && scroller && word
				? measure(area, scroller, word.id, env.dir)
				: null,
		);
	}, [area, word, env.dir]);
	useLayoutEffect(remeasure, [remeasure, naturalHeight]);
	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!area || !scroller) return;
		let frame = 0;
		const onChange = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(remeasure);
		};
		const observer = new ResizeObserver(onChange);
		observer.observe(area);
		scroller.addEventListener("scroll", onChange, { passive: true });
		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
			scroller.removeEventListener("scroll", onChange);
		};
	}, [area, remeasure]);
	useEffect(() => {
		if (!content) return;
		const observer = new ResizeObserver(([observed]) => {
			const height = observed?.borderBoxSize[0]?.blockSize;
			if (height !== undefined) setNaturalHeight(Math.round(height));
		});
		observer.observe(content);
		return () => observer.disconnect();
	}, [content]);
	const placement: Placement | null =
		measured && naturalHeight > 0
			? placeBeside({
					...measured,
					stack: { width: popoverWidth, height: naturalHeight },
				})
			: null;

	// Escape is Back while a Sheet is open, then closes the popover; a
	// click on the text that misses every word closes it too.
	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!scroller) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.defaultPrevented) return;
			if (sheet) popCover(sheet.covers.length - 2);
			else if (word) closePopover();
		};
		const onClick = (event: MouseEvent) => {
			if (!(event.target as Element).closest("[data-word-id]"))
				closePopover();
		};
		document.addEventListener("keydown", onKey);
		if (word) scroller.addEventListener("click", onClick);
		return () => {
			document.removeEventListener("keydown", onKey);
			scroller.removeEventListener("click", onClick);
		};
	});

	useInspectorAvoid(avoidSide(sheet !== null, word !== undefined, placement));

	return (
		<div className="flex h-full flex-col bg-canvas text-ink">
			<DemoInspector>
				<InspectorPanel
					glossCase={glossCase}
					onCase={switchCase}
					knobs={knobs}
					note={note}
					quiet={quiet}
					setKnob={onKnob}
				/>
			</DemoInspector>

			<div ref={setArea} className="relative min-h-0 flex-1">
				<div
					ref={scrollerRef}
					className="absolute inset-0 overflow-y-auto"
				>
					<div
						data-ig-column=""
						className="mx-auto grid max-w-[36rem] gap-4 px-4 pt-4 @min-[640px]/frame:px-6 @min-[640px]/frame:pt-6"
						style={{
							paddingBlockEnd: Math.round(
								(measured?.view.height ??
									area?.clientHeight ??
									0) * 0.55,
							),
						}}
					>
						<WordText
							text={glossCase.text}
							selectedWordId={word?.id ?? null}
							onWordClick={({ word: clicked }) =>
								openWord(clicked)
							}
						/>
					</div>
				</div>

				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					{word && front ? (
						<Popover
							placement={placement}
							openKey={`${glossCase.id}:${word.id}`}
							contentRef={setContent}
							onClose={closePopover}
						>
							<Deck
								cards={shownDeck}
								renderTail={(card, index) => (
									<CardTail
										kind={card.kind}
										glossCase={glossCase}
										onClick={() => backTo(index)}
									/>
								)}
								renderFront={(card) => {
									const next = nextCard(card.kind);
									return (
										<DeckCard
											kind={card.kind}
											{...propsAt(card.key, card.kind)}
											onFollow={() => {
												if (next) deal(next);
											}}
											onOpenSheet={() =>
												setSheet({
													covers: [cover(card.kind)],
													move: "push",
												})
											}
										/>
									);
								}}
							/>
						</Popover>
					) : null}
				</div>

				<AnimatePresence>
					{sheet && top ? (
						<Sheet
							key="sheet"
							stack={sheet}
							ground={{ title: glossCase.text.title, lang: "de" }}
							onPop={popCover}
						>
							<CoverPage
								kind={top.kind}
								{...propsAt(top.key, top.kind)}
								onFollow={() => {
									const next = nextCard(top.kind);
									if (next) pushCover(next);
								}}
							/>
						</Sheet>
					) : null}
				</AnimatePresence>
			</div>
		</div>
	);
}

/**
 * The token that has the focus when a Card comes to the front: on the
 * Attestation, the word the reader clicked; elsewhere, the step's first.
 */
function firstFocus(
	glossCase: GlossCase,
	kind: CardKind,
	word: FixtureWord | undefined,
): string | null {
	const step =
		kind === "attestation"
			? glossCase.attestation.syntax
			: kind === "surface"
				? glossCase.surface.inflection
				: null;
	if (!step) return null;
	const clicked =
		kind === "attestation" && word
			? step.columns.find(
					(each) =>
						each.word.toLowerCase() === word.text.toLowerCase(),
				)
			: undefined;
	return columnKey(clicked?.id ?? step.first);
}

/** Where the inspector keeps clear of: the Sheet, or the popover's side. */
function avoidSide(
	sheetOpen: boolean,
	popoverOpen: boolean,
	placement: Placement | null,
): InspectorAvoid | null {
	if (sheetOpen) return "inline-end";
	if (!popoverOpen || !placement) return null;
	if (placement.where.endsWith("end side")) return "inline-end";
	if (placement.where.endsWith("start side")) return "inline-start";
	return null;
}

/** The popover's floating box, beside or under the sentence. */
function Popover({
	placement,
	openKey,
	contentRef,
	onClose,
	children,
}: {
	readonly placement: Placement | null;
	readonly openKey: string;
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
				width: placement?.box.width ?? popoverWidth,
			}}
		>
			<motion.div
				key={openKey}
				initial={{ opacity: 0, scale: 0.97 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.18, ease: "easeOut" }}
			>
				<div
					className="overflow-y-auto overscroll-contain rounded-xl"
					style={{ maxHeight: placement?.maxHeight }}
				>
					<div ref={contentRef}>{children}</div>
				</div>
			</motion.div>
			<button
				type="button"
				aria-label="Close"
				onClick={onClose}
				className="absolute -end-2 -top-2 z-10 grid size-6 cursor-pointer place-items-center rounded-full border border-line bg-paper text-ink-soft shadow hover:text-ink"
			>
				<X aria-hidden="true" className="size-3.5" />
			</button>
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
				scroller.querySelector("[data-ig-column]") ?? scroller
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
