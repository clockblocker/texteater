import { cn } from "lego";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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
	type CardKind,
	cardLang,
	type FakeCard,
	germanText,
	hebrewText,
	useFakeResolution,
	WordText,
	wordsOf,
} from "@/fixtures";
import {
	DemoInspector,
	type InspectorAvoid,
	InspectorChoice,
	InspectorSection,
	InspectorTry,
	useDemoParam,
	useInspectorAvoid,
	usePlaygroundEnv,
} from "@/shell";
import {
	FullCard,
	Inflections,
	LemmaLink,
	OpenAsSheet,
	ParentTag,
} from "./cards";
import { SteppedDeck, StoryDeck } from "./deck";
import { inflectionsOf } from "./inflections";
import { type Box, type Placement, placeBeside, type Scene } from "./placement";
import { PreviewLayer } from "./preview-layer";
import type { PreviewHost } from "./rules";
import { type Cover, type CoverStack, Sheet } from "./sheet";

const texts = [germanText, hebrewText];
const allWords = texts.flatMap(wordsOf);

/** The Deck's preferred width, as tf-demo's Deck roughly has it. */
const deckWidth = 360;
/** Quicker than the fixtures' default deal, so trying hops doesn't drag. */
const dealDelaysMs: readonly number[] = [120, 300, 520, 760];
/** The Deck (a) and (e) deal: the form's story; its lemma is a Sheet away. */
const formKinds: readonly CardKind[] = ["Attestation", "Surface"];

type Variant = {
	readonly id: string;
	readonly label: string;
	/** `story`: Attestation and Surface; `tails` and `crumbs`: all four. */
	readonly deck: "story" | "tails" | "crumbs";
	/** (a) the `↑ gehen` tag in place of the lemma link. */
	readonly tag: boolean;
	/** (d) the inflection table on the Lemma Card. */
	readonly table: boolean;
	/** (e) ⌘-hover previews on lemma links. */
	readonly previews: boolean;
	readonly about: ReactNode;
};

const variants: readonly Variant[] = [
	{
		id: "tag",
		label: "a · Parent tag → Sheet",
		deck: "story",
		tag: true,
		table: false,
		previews: false,
		about: (
			<p>
				Lute v3's parent-term tag. The Deck deals the form's story
				(Attestation, Surface); the <i>↑ gehen</i> tag on the Surface
				Card opens the Lemma as a Cover over the reader. Back returns to
				the reader with the Deck as it was.
			</p>
		),
	},
	{
		id: "tails",
		label: "b · Tails bring Cards forward",
		deck: "tails",
		tag: false,
		table: false,
		previews: false,
		about: (
			<p>
				The Deck holds Attestation, Surface, Lemma and Reading in deal
				order. A tail brings its Card to the front; Cards dealt before
				it stay tails above, those after it tails below, so the Reading
				tail is always there to go back to. The Surface Card's{" "}
				<i>lemma → gehen</i> brings the Lemma forward too.
			</p>
		),
	},
	{
		id: "crumbs",
		label: "c · Breadcrumb in the Deck",
		deck: "crumbs",
		tag: false,
		table: false,
		previews: false,
		about: (
			<p>
				(b)'s mechanism with a different affordance: a{" "}
				<i>ging › gehen › 🚶 gehen</i> strip at the top of the Deck, one
				crumb per Card dealt. A crumb brings its Card to the front; the
				strip never changes order.
			</p>
		),
	},
	{
		id: "table",
		label: "d · Inflection table",
		deck: "tails",
		tag: false,
		table: true,
		previews: false,
		about: (
			<p>
				LinguaCafe's inflections, as content: the Lemma Card carries its
				inflection table with the clicked form marked. No cell is a
				link. The Lemma is reached as in (b), by its tail.
			</p>
		),
	},
	{
		id: "preview",
		label: "e · ⌘-hover preview",
		deck: "story",
		tag: false,
		table: false,
		previews: true,
		about: (
			<p>
				Obsidian's page preview. The Deck deals the form's story; hold ⌘
				(Ctrl off a Mac) and rest on <i>gehen</i> in the Surface Card's{" "}
				<i>lemma →</i> line for a preview of the Lemma. ⤢ expands it
				into a Cover; a plain click opens the Cover too.
			</p>
		),
	},
	{
		id: "combined",
		label: "b+d+e · Combined",
		deck: "tails",
		tag: false,
		table: true,
		previews: true,
		about: (
			<p>
				The likely final mix: tails bring Cards forward (b), the Lemma
				Card carries its inflection table (d), and ⌘-hover on a lemma
				link previews the Lemma, table included, with ⤢ to a Cover (e).
				A plain click on the link brings the Lemma Card forward.
			</p>
		),
	},
];

type Measured = Omit<Scene, "stack">;

/**
 * Lemma hop: ways from the clicked form (ging) to its lemma (gehen) and
 * back, under #1166's decisions. The Deck sits beside the clicked
 * sentence and never changes in place; deeper reading opens a Sheet as a
 * Cover over the reader, with Back only; lemma links get ⌘-hover
 * previews. The variant and the clicked word live in the URL.
 */
export default function LemmaHopDemo() {
	const env = usePlaygroundEnv();
	const [variantParam, setVariantParam] = useDemoParam("variant");
	const [wordId, setWordId] = useDemoParam("word");
	const variant =
		variants.find((candidate) => candidate.id === variantParam) ??
		variants[0];
	if (!variant) throw new Error("lemma-hop: no variants");
	const word = allWords.find((candidate) => candidate.id === wordId) ?? null;
	const text = texts.find((candidate) =>
		wordsOf(candidate).some((member) => member.id === word?.id),
	);

	const [front, setFront] = useState<CardKind | null>(null);
	const [sheet, setSheet] = useState<CoverStack | null>(null);
	const nextKey = useRef(0);

	const dealt = useFakeResolution(word, dealDelaysMs);
	const inDeck = (kind: CardKind) =>
		variant.deck !== "story" || formKinds.includes(kind);
	const cards = dealt.cards.filter((card) => inDeck(card.kind));
	const pending = dealt.pending.filter(inDeck);
	const frontKind =
		cards.find((card) => card.kind === front)?.kind ?? cards.at(-1)?.kind;
	const allCards = dealt.resolution?.cards ?? [];
	const cardOf = (kind: CardKind) =>
		allCards.find((card) => card.kind === kind);

	const cover = (kind: Cover["kind"]): Cover | null => {
		const card = cardOf(kind === "lemma" ? "Lemma" : "Surface");
		if (!card) return null;
		nextKey.current += 1;
		return {
			key: `c${nextKey.current}`,
			kind,
			label: card.title,
			lang: cardLang(card),
		};
	};
	/** From the Deck: a fresh Cover stack over the reader. */
	const openCover = (kind: Cover["kind"]) => {
		const next = cover(kind);
		if (next) setSheet({ covers: [next], move: "push" });
	};
	/** From inside a Sheet: one more Cover on its stack. */
	const pushCover = (kind: Cover["kind"]) => {
		const next = cover(kind);
		if (next)
			setSheet((open) =>
				open
					? { covers: [...open.covers, next], move: "push" }
					: { covers: [next], move: "push" },
			);
	};
	/** Pops the stack down to `index`; below the bottom Cover, the reader. */
	const popCover = (index: number) =>
		setSheet((open) => {
			if (!open || index >= open.covers.length - 1) return open;
			if (index < 0) return null;
			return { covers: open.covers.slice(0, index + 1), move: "back" };
		});
	const onExpand = (host: PreviewHost) =>
		host === "sheet" ? pushCover("lemma") : openCover("lemma");

	/**
	 * A Card in full, with what the variant adds. In the Deck a lemma link
	 * brings the Lemma Card forward where the Deck holds it, and opens it
	 * as a Cover where it doesn't; in a Sheet it pushes a Cover.
	 */
	const renderCard = (card: FakeCard, where: "deck" | "sheet") => {
		const link = card.links[0];
		const lang = cardLang(card);
		const toLemma =
			where === "sheet"
				? () => pushCover("lemma")
				: variant.deck === "story"
					? () => openCover("lemma")
					: () => setFront("Lemma");
		const table =
			variant.table && card.kind === "Lemma"
				? inflectionsOf(card.title)
				: undefined;
		return (
			<FullCard
				card={card}
				tag={
					variant.tag && link && card.kind === "Surface" ? (
						<ParentTag
							word={link.word}
							lang={lang}
							onClick={toLemma}
						/>
					) : null
				}
				lemma={
					!variant.tag && link ? (
						<LemmaLink
							word={link.word}
							lang={lang}
							onClick={toLemma}
						/>
					) : null
				}
				extra={table ? <Inflections table={table} /> : null}
				action={
					where === "deck" ? (
						<OpenAsSheet
							onClick={() =>
								openCover(
									card.kind === "Lemma" ||
										card.kind === "Reading"
										? "lemma"
										: "form",
								)
							}
						/>
					) : null
				}
			/>
		);
	};
	const renderFront = (card: FakeCard) => (
		<div data-lh-host="deck">{renderCard(card, "deck")}</div>
	);

	const [area, setArea] = useState<HTMLDivElement | null>(null);
	const scrollerRef = useRef<HTMLDivElement>(null);
	const deckScrollRef = useRef<HTMLDivElement>(null);
	const [deckContent, setDeckContent] = useState<HTMLDivElement | null>(null);
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

	// Re-measure whenever anything that moves the word or the Deck changes.
	useLayoutEffect(remeasure, [
		remeasure,
		cards.length,
		frontKind,
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
		if (!deckContent) return;
		const observer = new ResizeObserver(([observed]) => {
			const height = observed?.borderBoxSize[0]?.blockSize;
			if (height !== undefined) setNaturalHeight(Math.round(height));
		});
		observer.observe(deckContent);
		return () => observer.disconnect();
	}, [deckContent]);

	const placement: Placement | null =
		measured && naturalHeight > 0
			? placeBeside({
					...measured,
					stack: { width: deckWidth, height: naturalHeight },
				})
			: null;

	// When neither side of the sentence fits the whole Deck, the text
	// scrolls the sentence up. It asks on a new word or Card, never on the
	// reader's own scroll.
	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!area || !scroller || !wordId || naturalHeight === 0) return;
		const fresh = measure(area, scroller, wordId, env.dir);
		if (!fresh) return;
		const { scrollBy } = placeBeside({
			...fresh,
			stack: { width: deckWidth, height: naturalHeight },
		});
		if (Math.abs(scrollBy) > 2)
			scroller.scrollTo({
				top: scroller.scrollTop + scrollBy,
				behavior: env.reducedMotion ? "auto" : "smooth",
			});
	}, [area, wordId, cards.length, naturalHeight, env.dir, env.reducedMotion]);

	// A clamped Deck scrolls inside; keep its front Card, and the tails
	// under it, in view.
	useLayoutEffect(() => {
		const deckScroll = deckScrollRef.current;
		if (!deckScroll) return;
		const frontCard = deckScroll.querySelector<HTMLElement>("[data-front]");
		if (!frontCard) {
			deckScroll.scrollTop = deckScroll.scrollHeight;
			return;
		}
		deckScroll.scrollTop = Math.min(
			frontCard.offsetTop,
			deckScroll.scrollHeight - deckScroll.clientHeight,
		);
	}, [cards.length, frontKind, placement?.maxHeight]);

	const openWord = (id: string) => {
		setWordId(id, { push: true });
		setFront(null);
		setSheet(null);
	};
	const closeDeck = () => {
		setWordId(null, { push: true });
		setFront(null);
	};

	// Escape is Back while a Sheet is open, then closes the Deck, once no
	// preview takes it; a click on the text that misses every word closes
	// the Deck.
	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!scroller) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.defaultPrevented) return;
			if (sheet) popCover(sheet.covers.length - 2);
			else if (wordId) closeDeck();
		};
		const onClick = (event: MouseEvent) => {
			if (!(event.target as Element).closest("[data-word-id]"))
				closeDeck();
		};
		document.addEventListener("keydown", onKey);
		if (wordId) scroller.addEventListener("click", onClick);
		return () => {
			document.removeEventListener("keydown", onKey);
			scroller.removeEventListener("click", onClick);
		};
	});

	useInspectorAvoid(avoidSide(sheet !== null, word !== null, placement));

	const sheetCards = coverCards(sheet?.covers.at(-1)?.kind, cardOf);

	return (
		<div className="flex h-full flex-col bg-canvas text-ink">
			<DemoInspector>
				<InspectorSection>
					<InspectorTry>
						<p>
							Ways from the clicked form to its lemma and back,
							under #1166's decisions: the Deck sits beside the
							sentence and never changes in place; deeper reading
							opens a Sheet as a Cover over the reader, with Back
							only; lemma links get ⌘-hover previews.
						</p>
					</InspectorTry>
				</InspectorSection>
				<InspectorSection title="Variant">
					<InspectorChoice
						label="Way to the lemma"
						options={variants.map((candidate) => ({
							value: candidate.id,
							label: candidate.label,
						}))}
						value={variant.id}
						onChange={(id) => {
							setVariantParam(id === variants[0]?.id ? null : id);
							setFront(null);
							setSheet(null);
						}}
					/>
					<InspectorTry>{variant.about}</InspectorTry>
				</InspectorSection>
				<InspectorSection title="Try">
					<InspectorTry>
						<p>
							Click <i>ging</i>, <i>detaillierte</i> or <i>zum</i>
							, get to the lemma, then back to the form. Compare
							at 390 and 1440.
						</p>
						<p>
							⤢ on the front Card opens it as a Sheet. Esc is Back
							in a Sheet, then closes the Deck.
						</p>
					</InspectorTry>
				</InspectorSection>
			</DemoInspector>

			<div ref={setArea} className="relative min-h-0 flex-1">
				<div
					ref={scrollerRef}
					className="absolute inset-0 overflow-y-auto"
				>
					<div
						data-lh-column=""
						className="mx-auto grid max-w-[36rem] gap-4 px-4 pt-4 @min-[640px]/frame:px-6 @min-[640px]/frame:pt-6"
						style={{
							paddingBlockEnd: Math.round(
								(measured?.view.height ??
									area?.clientHeight ??
									0) * 0.55,
							),
						}}
					>
						{texts.map((shown) => (
							<WordText
								key={shown.id}
								text={shown}
								selectedWordId={wordId}
								onWordClick={({ word: clicked }) =>
									openWord(clicked.id)
								}
							/>
						))}
					</div>
				</div>

				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					{word && frontKind ? (
						<FloatingDeck
							placement={placement}
							wordId={wordId}
							scrollRef={deckScrollRef}
							contentRef={setDeckContent}
							onClose={closeDeck}
						>
							{variant.deck === "story" ? (
								<StoryDeck
									cards={cards}
									pending={pending}
									front={frontKind}
									renderFront={renderFront}
								/>
							) : (
								<SteppedDeck
									shape={variant.deck}
									cards={cards}
									pending={pending}
									front={frontKind}
									renderFront={renderFront}
									onFront={setFront}
								/>
							)}
						</FloatingDeck>
					) : null}
				</div>

				<AnimatePresence>
					{sheet && text ? (
						<Sheet
							key="sheet"
							stack={sheet}
							ground={{ title: text.title, lang: text.lang }}
							onPop={popCover}
						>
							{sheetCards.map((card) => (
								<div key={card.id}>
									{renderCard(card, "sheet")}
								</div>
							))}
						</Sheet>
					) : null}
				</AnimatePresence>
			</div>

			{variant.previews ? (
				<PreviewLayer withTable={variant.table} onExpand={onExpand} />
			) : null}
		</div>
	);
}

/** Where the inspector keeps clear of: the Sheet, or the Deck's side. */
function avoidSide(
	sheetOpen: boolean,
	deckOpen: boolean,
	placement: Placement | null,
): InspectorAvoid | null {
	if (sheetOpen) return "inline-end";
	if (!deckOpen || !placement) return null;
	if (placement.where.endsWith("end side")) return "inline-end";
	if (placement.where.endsWith("start side")) return "inline-start";
	return null;
}

/** A Cover's Cards: the Lemma's and the Reading's, or the form's. */
function coverCards(
	kind: Cover["kind"] | undefined,
	cardOf: (kind: CardKind) => FakeCard | undefined,
): readonly FakeCard[] {
	if (!kind) return [];
	const kinds: readonly CardKind[] =
		kind === "lemma" ? ["Lemma", "Reading"] : ["Surface"];
	return kinds.flatMap((each) => cardOf(each) ?? []);
}

/** The Deck's floating box, beside the sentence, with its close button. */
function FloatingDeck({
	placement,
	wordId,
	scrollRef,
	contentRef,
	onClose,
	children,
}: {
	readonly placement: Placement | null;
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
				width: placement?.box.width ?? deckWidth,
			}}
		>
			<motion.div
				key={wordId}
				initial={{ opacity: 0, scale: 0.97 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.18, ease: "easeOut" }}
			>
				<div
					ref={scrollRef}
					className="overflow-y-auto overscroll-contain rounded-xl"
					style={{ maxHeight: placement?.maxHeight }}
				>
					<div ref={contentRef} className="relative">
						{children}
					</div>
				</div>
			</motion.div>
			<button
				type="button"
				aria-label="Close the Deck"
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
				scroller.querySelector("[data-lh-column]") ?? scroller
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
