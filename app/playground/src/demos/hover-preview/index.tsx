import { cn } from "lego";
import { Maximize2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
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
import {
	DemoInspector,
	InspectorCheck,
	InspectorChoice,
	InspectorRange,
	InspectorSection,
	InspectorTry,
	useDemoParam,
	useInspectorAvoid,
	usePlaygroundEnv,
} from "@/shell";
import { type Box, beside, type Scene } from "./beside";
import { resolveEntry } from "./entries";
import { LinkedCard } from "./notes";
import { PreviewLayer } from "./preview-layer";
import { obsidian, type PreviewHost } from "./rules";
import { HistorySheet, type SheetEntry, type SheetHistory } from "./sheet";

const texts = [germanText, hebrewText];
const allWords = texts.flatMap(wordsOf);

/** The Deck's preferred width, as tf-demo's Deck roughly has it. */
const deckWidth = 360;
/** Quicker than the fixtures' default deal, so trying links doesn't drag. */
const dealDelaysMs: readonly number[] = [120, 300, 520, 760];

type Measured = Omit<Scene, "stack">;

const numberParam = (value: string | null, fallback: number) => {
	const parsed = value === null ? Number.NaN : Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Obsidian's page preview over a Deck that never changes in place. A word
 * in the text deals its Deck beside the sentence. Cmd-hover (Ctrl off a
 * Mac) on any link in a Card spawns a fleeting preview; previews nest,
 * pin and expand. A plain click on a link, the Card's ⤢, or a preview's ⤢
 * opens a Sheet in History mode over the text, where links navigate in
 * place and previews work the same.
 */
export default function HoverPreviewDemo() {
	const env = usePlaygroundEnv();
	const [wordId, setWordId] = useDemoParam("word");
	const [modParam, setModParam] = useDemoParam("mod");
	const [nestedModParam, setNestedModParam] = useDemoParam("nestedmod");
	const [delayParam, setDelayParam] = useDemoParam("delay");
	const [graceParam, setGraceParam] = useDemoParam("grace");
	const [zoneParam, setZoneParam] = useDemoParam("zone");
	const [modelParam, setModelParam] = useDemoParam("model");
	const model = modelParam === "poe" ? "poe" : "obsidian";
	// Obsidian's defaults: an editor needs ⌘, a preview (reading view) not.
	const requireInHosts = modParam !== "off";
	const requireInPreviews = nestedModParam === "on";
	const hoverDelay = numberParam(delayParam, obsidian.hoverDelayMs);
	const grace = numberParam(graceParam, obsidian.graceMs);
	const showZone = zoneParam === "on";
	const word = allWords.find((candidate) => candidate.id === wordId) ?? null;

	const [sheet, setSheet] = useState<SheetHistory | null>(null);
	const nextKey = useRef(0);
	const entry = (text: string): SheetEntry => {
		nextKey.current += 1;
		return { key: `s${nextKey.current}`, word: text };
	};

	/**
	 * A link followed, or a preview expanded, from `host` along `path`:
	 * from a Card it opens a fresh Sheet whose trail starts at the Card,
	 * inside a Sheet it pushes onto the trail. Either way the Deck stays.
	 */
	const follow = (host: PreviewHost, path: readonly string[]) => {
		if (path.length === 0) return;
		const pushed = path.map(entry);
		setSheet((open) => {
			if (host.kind === "sheet" && open) {
				const trail = [...open.trail.slice(0, open.at + 1), ...pushed];
				return { trail, at: trail.length - 1, move: "push" };
			}
			const trail =
				host.kind === "deck"
					? [entry(host.subject), ...pushed]
					: pushed;
			return { trail, at: trail.length - 1, move: "push" };
		});
	};
	const openSheet = (subject: string) =>
		setSheet({ trail: [entry(subject)], at: 0, move: "push" });
	const goSheet = (index: number) =>
		setSheet((open) =>
			open && index >= 0 && index < open.trail.length && index !== open.at
				? {
						...open,
						at: index,
						move: index < open.at ? "back" : "forward",
					}
				: open,
		);

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

	const placement =
		measured && naturalHeight > 0
			? beside({
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

	// A clamped Deck scrolls inside; keep its front Card in view.
	useLayoutEffect(() => {
		const deckScroll = deckScrollRef.current;
		if (deckScroll) deckScroll.scrollTop = deckScroll.scrollHeight;
	}, [cards.length, frontIndex, placement?.maxHeight]);

	const open = (id: string) => {
		setWordId(id, { push: true });
		setFront(null);
	};
	const closeDeck = () => {
		setWordId(null, { push: true });
		setFront(null);
	};

	// Escape closes the Sheet, then the Deck, once no preview is open to
	// take it; a click on the text that misses every word closes the Deck.
	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!scroller) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.defaultPrevented) return;
			if (sheet) setSheet(null);
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

	// The Deck sits at the sentence's inline end, and previews grow from
	// their link toward the inline end, in a Card and in a Sheet alike.
	useInspectorAvoid(sheet || word ? "inline-end" : null);

	return (
		<div className="flex h-full flex-col bg-canvas text-ink">
			<DemoInspector>
				<InspectorSection>
					<InspectorTry>
						<p>
							Obsidian's page preview, copied rule for rule, over
							a Deck that never changes in place. Previews nest,
							pin and expand; deeper reading happens in a Sheet
							with back, forward and a breadcrumb.
						</p>
					</InspectorTry>
				</InspectorSection>
				<InspectorSection title="Try">
					<InspectorTry>
						<p>
							Click <i>ging</i>, hold <i>⌘</i> (Ctrl off a Mac)
							and rest on <i>Fuß</i> in the Card, then on{" "}
							<i>Beins</i> in its preview, then <i>Körperteile</i>
							.
						</p>
						<p>
							Rest on a link first and press ⌘ after: the preview
							still comes. Step off and back within the grace
							period: it stays.
						</p>
						<p>
							Pin one, or drag it by its title (that pins it too),
							then move away. Esc closes the newest unpinned
							preview, then the Sheet, then the Deck.
						</p>
						<p>
							⤢ on a preview or a Card opens a Sheet; previews
							work inside it, and ⤢ there pushes onto its trail.
						</p>
					</InspectorTry>
				</InspectorSection>
				<InspectorSection title="Rules (Obsidian 1.14)">
					<InspectorTry>
						<p>
							Shows after 300 ms of hover, fading in over 80 ms; ⌘
							pressed on a link already hovered (within 2 s of the
							last move) shows it too. Hides 300 ms after the
							pointer leaves the link, the preview and its
							children; there is no safe triangle, only a 10 px
							gap and that grace.
						</p>
						<p>
							10 px below the link, its start on the link's start;
							above when it only fits there; else the roomier
							side, clamped. 450 px wide (at most 80% of the
							frame), 400 px tall, then it scrolls. One preview
							per owner; nesting is unlimited, and a parent stays
							while a child is in use.
						</p>
						<p>
							A click outside closes every unpinned preview; a
							click into one keeps it until a click outside (the
							outline). Obsidian has no Esc for previews: ours is
							added.
						</p>
					</InspectorTry>
				</InspectorSection>
				<InspectorSection title="Decisions">
					<InspectorTry>
						<p>
							<i>Plain click</i> on a link does what Obsidian's
							does: it opens the target. Here that is a Sheet over
							the text (Obsidian's tab), whose trail starts at the
							Card, so the Deck is never replaced. Inside a Sheet
							a click navigates in place.
						</p>
						<p>
							<i>Expand</i> pushes the whole hover path onto the
							trail (gehen › Fuß › Beins), so back retraces it.
						</p>
						<p>
							<i>Touch</i>: Obsidian and PoE show nothing on
							touch. Here a long press (500 ms) shows the preview,
							held open since no hover keeps it; a tap outside or
							× closes it. A tap still follows the link.
						</p>
					</InspectorTry>
				</InspectorSection>
				<InspectorSection title="Knobs">
					<InspectorChoice
						label="Popup model"
						options={[
							{
								value: "obsidian",
								label: "Obsidian",
								hint: "Hover delay and a grace period",
							},
							{
								value: "poe",
								label: "Path of Exile 2",
								hint: "Instant; hold ⌘ to freeze the chain, release and it goes once the pointer is off it; a click pins",
							},
						]}
						value={model}
						onChange={(picked) =>
							setModelParam(picked === "poe" ? "poe" : null)
						}
					/>
					{model === "poe" ? (
						<p className="text-xs text-ink-soft">
							PoE 2: a popup shows at once and only with ⌘ held,
							inside popups too. Holding ⌘ freezes every popup;
							released, an unpinned one goes as soon as the
							pointer is off it. A click into one pins it.
						</p>
					) : (
						<>
							<p className="text-xs text-ink-muted">
								Require ⌘/Ctrl to trigger page preview
								(Obsidian's per-source setting)
							</p>
							<InspectorCheck
								checked={requireInHosts}
								onChange={(on) =>
									setModParam(on ? null : "off")
								}
								title="Links in Cards and Sheets, like Obsidian's editor: on by default"
							>
								In Cards and Sheets
							</InspectorCheck>
							<InspectorCheck
								checked={requireInPreviews}
								onChange={(on) =>
									setNestedModParam(on ? "on" : null)
								}
								title="Links inside a preview, which Obsidian renders in reading view: off by default"
							>
								Inside previews
							</InspectorCheck>
							<InspectorRange
								label="Hover delay"
								min={0}
								max={1500}
								step={50}
								value={hoverDelay}
								onChange={(value) =>
									setDelayParam(
										value === obsidian.hoverDelayMs
											? null
											: String(value),
									)
								}
								format={(value) => `${value} ms`}
							/>
							<InspectorRange
								label="Grace period"
								min={0}
								max={1500}
								step={50}
								value={grace}
								onChange={(value) =>
									setGraceParam(
										value === obsidian.graceMs
											? null
											: String(value),
									)
								}
								format={(value) => `${value} ms`}
							/>
						</>
					)}
					<InspectorCheck
						checked={showZone}
						onChange={(on) => setZoneParam(on ? "on" : null)}
						title="Outline each link and its preview, tint the gap only the grace period covers, and run the grace period out"
					>
						Show the mouse-path safe zone
					</InspectorCheck>
				</InspectorSection>
			</DemoInspector>

			<div ref={setArea} className="relative min-h-0 flex-1">
				<div
					ref={scrollerRef}
					className="absolute inset-0 overflow-y-auto"
				>
					<div
						data-hp-column=""
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
															depth > 0 &&
																"-mb-1.5",
														)}
													>
														{depth > 0 ? (
															<CardView
																card={card}
																collapsed
																onTailClick={() =>
																	setFront(
																		index,
																	)
																}
																className="pb-3"
															/>
														) : (
															<div
																data-hp-host="deck"
																data-hp-subject={
																	card.title
																}
															>
																<LinkedCard
																	card={card}
																	scope={`deck~${wordId}`}
																	action={
																		<button
																			type="button"
																			title="Open as Sheet"
																			aria-label="Open as Sheet"
																			onClick={() =>
																				openSheet(
																					card.title,
																				)
																			}
																			className="grid size-7 cursor-pointer place-items-center rounded-md text-ink-faint hover:bg-canvas hover:text-ink"
																		>
																			<Maximize2
																				aria-hidden="true"
																				className="size-3.5 rtl:-scale-x-100"
																			/>
																		</button>
																	}
																/>
															</div>
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

				<AnimatePresence>
					{sheet ? (
						<HistorySheet
							key="sheet"
							history={sheet}
							onGo={goSheet}
							onClose={() => setSheet(null)}
						/>
					) : null}
				</AnimatePresence>
			</div>

			<PreviewLayer
				settings={{
					requireInHosts,
					requireInPreviews,
					hoverDelayMs: hoverDelay,
					graceMs: grace,
					showZone,
					model,
				}}
				onFollow={follow}
			/>
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
