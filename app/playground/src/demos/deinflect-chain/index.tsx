import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { WordText, wordsOf } from "@/fixtures";
import {
	DemoInspector,
	type InspectorAvoid,
	InspectorCheck,
	InspectorChoice,
	InspectorSection,
	InspectorTry,
	useDemoParam,
	useInspectorAvoid,
	usePlaygroundEnv,
} from "@/shell";
import { type Look, OpenAsSheet, ReadingCard, SurfaceCard } from "./cards";
import { cases } from "./cases";
import type { ChainOrder, StepNames } from "./chain";
import { type Box, beside, type Placement, type Scene } from "./placement";
import { type Cover, type CoverStack, Sheet } from "./sheet";

/** tf-demo's Deck width, roughly; the popover is one Card of it. */
const popoverWidth = 360;

const layouts: readonly {
	readonly value: Look["layout"];
	readonly label: string;
	readonly hint: string;
}[] = [
	{
		value: "yomitan",
		label: "Folded · Yomitan line",
		hint: "One quiet line under the lemma, « between steps",
	},
	{
		value: "tenten",
		label: "Folded · 10ten (< …)",
		hint: "In parentheses after the lemma, < between steps",
	},
	{
		value: "list",
		label: "Unfolded · list",
		hint: "One row per step: the change and its name",
	},
];

type Measured = Omit<Scene, "stack">;

/**
 * Deinflect chain: the Surface popover explains how the clicked words
 * become the lemma as a chain of named steps, after Yomitan's and 10ten
 * Reader's deinflection reasons. The case, the clicked word and every
 * knob live in the URL.
 */
export default function DeinflectChainDemo() {
	const env = usePlaygroundEnv();
	const [caseParam, setCaseParam] = useDemoParam("case");
	const [wordId, setWordId] = useDemoParam("word");
	const [layoutParam, setLayout] = useDemoParam("layout");
	const [orderParam, setOrder] = useDemoParam("order");
	const [namesParam, setNames] = useDemoParam("names");
	const [cuesParam, setCues] = useDemoParam("cues");
	const [explainParam, setExplain] = useDemoParam("explain");

	const demoCase =
		cases.find((candidate) => candidate.id === caseParam) ?? cases[0];
	if (!demoCase) throw new Error("deinflect-chain: no cases");
	const look: Look = {
		layout:
			layouts.find((each) => each.value === layoutParam)?.value ??
			"yomitan",
		order: orderParam === "words" ? "words" : "lemma",
		names: namesParam === "plain" ? "plain" : "terse",
		cues: cuesParam !== "off",
		explained: explainParam === "on",
	};
	const words = wordsOf(demoCase.text);
	const word = words.find((candidate) => candidate.id === wordId) ?? null;
	// Only the clicked unit's words have a Surface here.
	const unitWords = words.filter(
		(each) => each.unitId !== undefined || each.text === demoCase.surface,
	);

	const [open, setOpen] = useState<string | null>(null);
	const [sheet, setSheet] = useState<CoverStack | null>(null);
	const nextKey = useRef(0);
	const cover = (kind: Cover["kind"]): Cover => {
		nextKey.current += 1;
		return {
			key: `c${nextKey.current}`,
			kind,
			label: kind === "form" ? demoCase.surface : demoCase.lemma.title,
			lang: "de",
		};
	};
	const openSheet = (kind: Cover["kind"]) =>
		setSheet({ covers: [cover(kind)], move: "push" });
	const pushCover = (kind: Cover["kind"]) =>
		setSheet((stack) => ({
			covers: [...(stack?.covers ?? []), cover(kind)],
			move: "push",
		}));
	const popCover = (index: number) =>
		setSheet((stack) => {
			if (!stack || index >= stack.covers.length - 1) return stack;
			if (index < 0) return null;
			return { covers: stack.covers.slice(0, index + 1), move: "back" };
		});

	const openWord = (id: string | null) => {
		setWordId(id, { push: true });
		setOpen(null);
		setSheet(null);
	};
	const switchCase = (id: string) => {
		setCaseParam(id === cases[0]?.id ? null : id);
		openWord(null);
	};

	const [area, setArea] = useState<HTMLDivElement | null>(null);
	const scrollerRef = useRef<HTMLDivElement>(null);
	const [content, setContent] = useState<HTMLDivElement | null>(null);
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
			? beside({
					...measured,
					stack: { width: popoverWidth, height: naturalHeight },
				})
			: null;

	// When neither side of the sentence fits the popover, the text scrolls
	// the sentence up, on a new word only, never on the reader's scroll.
	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!area || !scroller || !wordId || naturalHeight === 0) return;
		const fresh = measure(area, scroller, wordId, env.dir);
		if (!fresh) return;
		const { scrollBy } = beside({
			...fresh,
			stack: { width: popoverWidth, height: naturalHeight },
		});
		if (Math.abs(scrollBy) > 2)
			scroller.scrollTo({
				top: scroller.scrollTop + scrollBy,
				behavior: env.reducedMotion ? "auto" : "smooth",
			});
	}, [area, wordId, naturalHeight, env.dir, env.reducedMotion]);

	// Esc is Back in a Sheet, then closes the popover; a click on the text
	// that misses every word closes it too.
	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!scroller) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.defaultPrevented) return;
			if (sheet) popCover(sheet.covers.length - 2);
			else if (wordId) openWord(null);
		};
		const onClick = (event: MouseEvent) => {
			if (!(event.target as Element).closest("[data-word-id]"))
				openWord(null);
		};
		document.addEventListener("keydown", onKey);
		if (wordId) scroller.addEventListener("click", onClick);
		return () => {
			document.removeEventListener("keydown", onKey);
			scroller.removeEventListener("click", onClick);
		};
	});

	useInspectorAvoid(
		avoidSide(sheet !== null, word !== null, placement, measured),
	);

	const top = sheet?.covers.at(-1);
	const clickedId = words.find((each) => each.text === demoCase.clicked)?.id;

	return (
		<div className="flex h-full flex-col bg-canvas text-ink">
			<DemoInspector>
				<InspectorSection title="Case">
					<InspectorChoice
						label="Sentence"
						options={cases.map((each) => ({
							value: each.id,
							label: each.label,
						}))}
						value={demoCase.id}
						onChange={switchCase}
					/>
					<InspectorCheck
						checked={word !== null}
						onChange={(checked) =>
							openWord(checked ? (clickedId ?? null) : null)
						}
					>
						Click <i>{demoCase.clicked}</i> for me
					</InspectorCheck>
				</InspectorSection>
				<InspectorSection title="Chain">
					<InspectorChoice
						label="Folded or unfolded"
						options={layouts}
						value={look.layout}
						onChange={(value) =>
							setLayout(value === "yomitan" ? null : value)
						}
					/>
					<InspectorChoice<ChainOrder>
						label="Order"
						options={[
							{
								value: "lemma",
								label: "From the lemma «",
								hint: "Yomitan's and 10ten's order: the step nearest the lemma first",
							},
							{
								value: "words",
								label: "From the words »",
								hint: "The order the learner reads the clicked words in",
							},
						]}
						value={look.order}
						onChange={(value) =>
							setOrder(value === "lemma" ? null : value)
						}
					/>
					<InspectorChoice<StepNames>
						label="Step names"
						options={[
							{ value: "terse", label: "Terse · past · 3rd sg." },
							{
								value: "plain",
								label: "Plain · past tense, for er…",
							},
						]}
						value={look.names}
						onChange={(value) =>
							setNames(value === "terse" ? null : value)
						}
					/>
					<InspectorCheck
						checked={look.cues}
						onChange={(checked) => setCues(checked ? null : "off")}
					>
						Folded: each step names its word first
					</InspectorCheck>
					<InspectorCheck
						checked={look.explained}
						onChange={(checked) =>
							setExplain(checked ? "on" : null)
						}
					>
						Unfolded: every row says what it means
					</InspectorCheck>
				</InspectorSection>
				<InspectorSection title="Try">
					<InspectorTry>
						<p>
							Click any of <i>hatte es damit zu tun</i>. Rest on a
							step for its tooltip; click it for a note at the
							Card's foot, and its word is underlined in the
							headword.
						</p>
						<p>
							⤢ opens the Card as a Sheet, where the chain is
							always unfolded and explained; the lemma link pushes
							the Reading. Esc is Back, then closes.
						</p>
						<p>
							Compare the two orders on <i>Kindern</i>, at 390 and
							1440.
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
						data-dc-column=""
						className="mx-auto grid max-w-[36rem] px-4 pt-4 @min-[640px]/frame:px-6 @min-[640px]/frame:pt-6"
						style={{
							paddingBlockEnd: Math.round(
								(measured?.view.height ??
									area?.clientHeight ??
									0) * 0.55,
							),
						}}
					>
						<WordText
							text={demoCase.text}
							selectedWordId={wordId}
							onWordClick={({ word: clicked }) => {
								if (unitWords.includes(clicked))
									openWord(clicked.id);
								else openWord(null);
							}}
						/>
					</div>
				</div>

				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					{word ? (
						<div
							className="pointer-events-auto absolute"
							style={{
								insetInlineStart: placement?.box.start ?? 0,
								top: placement?.box.top ?? 0,
								width: placement?.box.width ?? popoverWidth,
								visibility: placement ? undefined : "hidden",
							}}
						>
							<motion.div
								key={`${demoCase.id}:${wordId}`}
								initial={{ opacity: 0, scale: 0.97 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.18, ease: "easeOut" }}
							>
								<div
									className="overflow-y-auto overscroll-contain rounded-xl"
									style={{ maxHeight: placement?.maxHeight }}
								>
									<div ref={setContent}>
										<SurfaceCard
											demoCase={demoCase}
											look={look}
											open={open}
											onOpen={setOpen}
											onLemma={() => openSheet("lemma")}
											action={
												<OpenAsSheet
													onClick={() =>
														openSheet("form")
													}
												/>
											}
										/>
									</div>
								</div>
							</motion.div>
							<button
								type="button"
								aria-label="Close"
								onClick={() => openWord(null)}
								className="absolute -end-2 -top-2 z-10 grid size-6 cursor-pointer place-items-center rounded-full border border-line bg-paper text-ink-soft shadow hover:text-ink"
							>
								<X aria-hidden="true" className="size-3.5" />
							</button>
						</div>
					) : null}
				</div>

				<AnimatePresence>
					{sheet && top ? (
						<Sheet
							key="sheet"
							stack={sheet}
							ground={{ title: demoCase.text.title, lang: "de" }}
							onPop={popCover}
						>
							{top.kind === "form" ? (
								<SurfaceCard
									demoCase={demoCase}
									look={{
										...look,
										layout: "list",
										explained: true,
									}}
									open={null}
									onOpen={() => {}}
									onLemma={() => pushCover("lemma")}
								/>
							) : (
								<ReadingCard demoCase={demoCase} />
							)}
						</Sheet>
					) : null}
				</AnimatePresence>
			</div>
		</div>
	);
}

/** Where the inspector keeps clear of: the Sheet, or the popover's side. */
function avoidSide(
	sheetOpen: boolean,
	popoverOpen: boolean,
	placement: Placement | null,
	measured: Measured | null,
): InspectorAvoid | null {
	if (sheetOpen) return "inline-end";
	if (!popoverOpen || !placement || !measured) return null;
	const { column } = measured;
	if (placement.box.start >= column.start + column.width) return "inline-end";
	if (placement.box.start + placement.box.width <= column.start)
		return "inline-start";
	return null;
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
				scroller.querySelector("[data-dc-column]") ?? scroller
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
