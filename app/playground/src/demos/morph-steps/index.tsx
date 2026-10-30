import { AnimatePresence } from "motion/react";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { WordText, wordsOf } from "@/fixtures";
import {
	type InspectorAvoid,
	useDemoParam,
	useInspectorAvoid,
	usePlaygroundEnv,
} from "@/shell";
import {
	AttestationCard,
	DeckTail,
	LemmaCard,
	OpenAsSheet,
	type Presentation,
	StepList,
	SurfaceCard,
	type TitleWord,
} from "./cards";
import { cases, lineText, type MorphCase } from "./cases";
import { type CardKind, Deck } from "./deck";
import { cardWidth, FloatingDeck, type Measured, measure } from "./floating";
import { initialKnobs, type Knobs, MorphInspector } from "./inspector";
import { type Placement, placeBeside } from "./placement";
import { type Cover, type CoverStack, Sheet } from "./sheet";
import { MorphStage, type StageLook } from "./stage";
import { beatsOf, type Track } from "./timeline";
import { usePlayback } from "./use-playback";

/** The Cards a click has pushed, and the one in front. */
type DeckState = {
	readonly cards: readonly CardKind[];
	readonly front: CardKind;
};

/**
 * Morph steps: a click on any word of a unit deals its Attestation Card
 * beside the sentence, headed by the words on the page. Its stage plays
 * Syntax one visible step at a time, after Keynote's Magic Move and
 * Duolingo's tips, and ends on the Surface, whose route pushes the Surface
 * Card. That Card, headed by the slotted Surface line, plays Inflection
 * and ends on the Lemma, whose route pushes the Lemma Card. Each Card has
 * its own clock; a tail brings a Card back, and ⤢ opens the front Card as
 * a Sheet that lists its steps. The case and the clicked word live in the
 * URL.
 */
export default function MorphStepsDemo() {
	const env = usePlaygroundEnv();
	const [caseParam, setCaseParam] = useDemoParam("case");
	const [wordId, setWordId] = useDemoParam("word");
	const morph: MorphCase =
		cases.find((candidate) => candidate.id === caseParam) ?? hardCase();
	const unit = wordsOf(morph.text).filter(
		(candidate) => candidate.unitId === morph.unitId,
	);
	const word = unit.find((candidate) => candidate.id === wordId) ?? null;
	const title: readonly TitleWord[] = unit.map((member) => ({
		id: member.id,
		text: member.text,
		clicked: member.id === word?.id,
	}));

	const [knobs, setKnobs] = useState<Knobs>(initialKnobs);
	const [dealt, setDealt] = useState<DeckState | null>(null);
	const [sheet, setSheet] = useState<CoverStack | null>(null);
	const [opened, setOpened] = useState(0);
	const nextKey = useRef(0);

	const { syntax } = morph.attestation;
	const syntaxTrack = syntax.kind === "track" ? syntax.track : null;
	const firstCard = firstCardOf(morph, knobs);
	const deck: DeckState = dealt ?? { cards: [firstCard], front: firstCard };

	const syntaxBeats = useMemo(
		() => (syntaxTrack ? beatsOf(syntaxTrack) : []),
		[syntaxTrack],
	);
	const inflectionBeats = useMemo(
		() => beatsOf(morph.surface.inflection),
		[morph],
	);
	const clock = {
		speed: knobs.speed,
		loop: knobs.ending === "loop",
		captions: knobs.captions,
	};
	const syntaxPlayback = usePlayback({ beats: syntaxBeats, ...clock });
	const inflectionPlayback = usePlayback({
		beats: inflectionBeats,
		...clock,
	});
	const autoplay = knobs.start === "play" && !env.reducedMotion;
	const look: StageLook = {
		match: knobs.match,
		captions: knobs.captions,
		tags: knobs.tags,
		context: knobs.context,
		moveS: env.reducedMotion ? 0 : 0.6 / knobs.speed,
	};

	/** A Card coming in starts its own clock; the others wait at their start. */
	const startClocks = (kind: CardKind, play: boolean) => {
		syntaxPlayback.restart(kind === "attestation" && play);
		inflectionPlayback.restart(kind === "surface" && play);
	};
	const openWord = (id: string) => {
		setWordId(id, { push: true });
		setDealt(null);
		setSheet(null);
		setOpened((count) => count + 1);
		startClocks(firstCard, autoplay);
	};
	const close = () => {
		setWordId(null, { push: true });
		setDealt(null);
		setSheet(null);
	};
	/** A route in the Deck: push its Card, or bring it forward if pushed. */
	const follow = (kind: CardKind) => {
		if (deck.cards.includes(kind)) {
			setDealt({ ...deck, front: kind });
			return;
		}
		setDealt({ cards: [...deck.cards, kind], front: kind });
		if (kind === "surface") inflectionPlayback.restart(autoplay);
	};

	const cover = (kind: CardKind): Cover => {
		nextKey.current += 1;
		return {
			key: `c${nextKey.current}`,
			kind,
			label: coverLabel(morph, title, kind),
			lang: "de",
		};
	};
	const openSheet = (kind: CardKind) =>
		setSheet({ covers: [cover(kind)], move: "push" });
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

	const stage = (
		track: Track | null,
		kind: "attestation" | "surface",
		size: "card" | "sheet",
	) =>
		track ? (
			<MorphStage
				key={kind}
				beats={kind === "attestation" ? syntaxBeats : inflectionBeats}
				track={track}
				playback={
					kind === "attestation" ? syntaxPlayback : inflectionPlayback
				}
				look={look}
				size={size}
			/>
		) : null;

	/** A Card in full: in the Deck its route pushes, in a Sheet it covers. */
	const renderCard = (kind: CardKind, where: Presentation) => {
		const action =
			where === "card" ? (
				<OpenAsSheet onClick={() => openSheet(kind)} />
			) : undefined;
		const next = where === "card" ? follow : pushCover;
		const size = where === "card" ? "card" : "sheet";
		if (kind === "attestation")
			return (
				<AttestationCard
					morph={morph}
					title={title}
					presentation={where}
					stage={stage(syntaxTrack, "attestation", size)}
					action={action}
					onSurface={() => next("surface")}
				/>
			);
		if (kind === "surface")
			return (
				<SurfaceCard
					morph={morph}
					presentation={where}
					stage={stage(morph.surface.inflection, "surface", size)}
					action={action}
					onLemma={() => next("lemma")}
				/>
			);
		return <LemmaCard morph={morph} action={action} />;
	};

	const renderTail = (kind: CardKind, before: boolean) => (
		<DeckTail
			morph={morph}
			title={title}
			kind={kind}
			before={before}
			onClick={() => setDealt({ ...deck, front: kind })}
		/>
	);

	const [area, setArea] = useState<HTMLDivElement | null>(null);
	const scrollerRef = useRef<HTMLDivElement>(null);
	const deckScrollRef = useRef<HTMLDivElement>(null);
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
					stack: { width: cardWidth, height: naturalHeight },
				})
			: null;

	// When neither side of the sentence fits the Deck, the text scrolls the
	// sentence up; it asks on a new click or Card, never on the reader's
	// own scroll.
	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!area || !scroller || !word || naturalHeight === 0) return;
		const fresh = measure(area, scroller, word.id, env.dir);
		if (!fresh) return;
		const { scrollBy } = placeBeside({
			...fresh,
			stack: { width: cardWidth, height: naturalHeight },
		});
		if (Math.abs(scrollBy) > 2)
			scroller.scrollTo({
				top: scroller.scrollTop + scrollBy,
				behavior: env.reducedMotion ? "auto" : "smooth",
			});
	}, [
		area,
		word,
		opened,
		deck.cards.length,
		naturalHeight > 0,
		env.dir,
		env.reducedMotion,
	]);

	// A clamped Deck scrolls inside; keep its front Card in view.
	useLayoutEffect(() => {
		const deckScroll = deckScrollRef.current;
		const frontCard =
			deckScroll?.querySelector<HTMLElement>("[data-front]");
		if (!deckScroll || !frontCard) return;
		deckScroll.scrollTop = Math.min(
			frontCard.offsetTop,
			deckScroll.scrollHeight - deckScroll.clientHeight,
		);
	}, [deck.cards.length, deck.front, placement?.maxHeight]);

	// Escape is Back while a Sheet is open, then closes the Deck; a click
	// on the text that misses every word closes the Deck.
	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!scroller) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.defaultPrevented) return;
			if (sheet) popCover(sheet.covers.length - 2);
			else if (word) close();
		};
		const onClick = (event: MouseEvent) => {
			if (!(event.target as Element).closest("[data-word-id]")) close();
		};
		document.addEventListener("keydown", onKey);
		if (word) scroller.addEventListener("click", onClick);
		return () => {
			document.removeEventListener("keydown", onKey);
			scroller.removeEventListener("click", onClick);
		};
	});

	useInspectorAvoid(avoidSide(sheet !== null, word !== null, placement));

	const top = sheet?.covers.at(-1);
	const topBeats =
		top?.kind === "attestation" ? syntaxBeats : inflectionBeats;

	return (
		<div className="flex h-full flex-col bg-canvas text-ink">
			<MorphInspector
				morph={morph}
				knobs={knobs}
				onKnobs={(next) => {
					setKnobs(next);
					if (next.plain !== knobs.plain) {
						setDealt(null);
						setSheet(null);
					}
					if (
						next.start !== knobs.start ||
						next.plain !== knobs.plain
					)
						startClocks(
							next.plain !== knobs.plain
								? firstCardOf(morph, next)
								: deck.front,
							next.start === "play" && !env.reducedMotion,
						);
				}}
				onCase={(id) => {
					setCaseParam(id === "hard" ? null : id);
					setWordId(null);
					setDealt(null);
					setSheet(null);
					startClocks("attestation", false);
				}}
			/>

			<div ref={setArea} className="relative min-h-0 flex-1">
				<div
					ref={scrollerRef}
					className="absolute inset-0 overflow-y-auto"
				>
					<div
						data-ms-column=""
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
							text={morph.text}
							selectedWordId={word?.id ?? null}
							onWordClick={({ word: clicked }) => {
								if (clicked.unitId === morph.unitId)
									openWord(clicked.id);
								else close();
							}}
						/>
					</div>
				</div>

				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					{word ? (
						<FloatingDeck
							placement={placement}
							openKey={`${morph.id}:${opened}`}
							scrollRef={deckScrollRef}
							contentRef={setContent}
							reducedMotion={env.reducedMotion}
							onClose={close}
						>
							<Deck
								cards={deck.cards}
								front={deck.front}
								renderFront={(kind) => renderCard(kind, "card")}
								renderTail={renderTail}
								reducedMotion={env.reducedMotion}
							/>
						</FloatingDeck>
					) : null}
				</div>

				<AnimatePresence>
					{sheet && top ? (
						<Sheet
							key="sheet"
							stack={sheet}
							ground={{ title: morph.text.title, lang: "de" }}
							onPop={popCover}
						>
							{renderCard(top.kind, "sheet")}
							{top.kind !== "lemma" && topBeats.length > 1 ? (
								<StepList
									beats={topBeats}
									playback={
										top.kind === "attestation"
											? syntaxPlayback
											: inflectionPlayback
									}
								/>
							) : null}
						</Sheet>
					) : null}
				</AnimatePresence>
			</div>
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

/** A Cover's crumb: the Card's title as plain text. */
function coverLabel(
	morph: MorphCase,
	title: readonly TitleWord[],
	kind: CardKind,
): string {
	if (kind === "attestation")
		return title.map((member) => member.text).join(" ");
	return lineText(kind === "surface" ? morph.surface.line : morph.lemma.runs);
}

/** The Card a click deals first: the Attestation, unless it is skipped. */
function firstCardOf(morph: MorphCase, knobs: Knobs): CardKind {
	return morph.attestation.syntax.kind === "track" || knobs.plain === "still"
		? "attestation"
		: "surface";
}

function hardCase(): MorphCase {
	const first = cases[0];
	if (!first) throw new Error("morph-steps: no cases");
	return first;
}
