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
	InspectorCheck,
	InspectorChoice,
	InspectorSection,
	InspectorTry,
	useDemoParam,
	useInspectorAvoid,
	usePlaygroundEnv,
} from "@/shell";
import { type LemmaId, lemmas, proseCases } from "./cases";
import { LemmaNote, OpenAsSheet, SurfaceNote } from "./notes";
import { type Box, type Placement, placeBeside, type Scene } from "./placement";
import { defaultProseOptions, type ProseOptions } from "./prose";
import { type Cover, type CoverStack, Sheet } from "./sheet";

/** The popover's preferred width, as tf-demo's Deck roughly has it. */
const popoverWidth = 360;

type Measured = Omit<Scene, "stack">;

/** The unit a click opens: the clicked word's, or the word alone. */
const unitOf = (words: readonly FixtureWord[], word: FixtureWord) =>
	word.unitId ? words.filter((each) => each.unitId === word.unitId) : [word];

/**
 * Dictionary prose: a click opens the clicked words' Surface popover, and
 * under its route to the lemma, one dictionary sentence per word says how
 * that word becomes the lemma, as en.wiktionary's form-of lines and DWDS's
 * notes say it. ⤢ opens the same Note as a Sheet; a lemma in a line opens
 * that lemma as a Cover.
 */
export default function DictionaryProseDemo() {
	const env = usePlaygroundEnv();
	const [caseParam, setCaseParam] = useDemoParam("case");
	const [wordId, setWordId] = useDemoParam("word");
	const [termsParam, setTermsParam] = useDemoParam("terms");
	const [layoutParam, setLayoutParam] = useDemoParam("layout");
	const [unchangedParam, setUnchangedParam] = useDemoParam("unchanged");
	const [hintsParam, setHintsParam] = useDemoParam("hints");
	const [briefParam, setBriefParam] = useDemoParam("brief");
	const prose =
		proseCases.find((each) => each.id === caseParam) ?? proseCases[0];
	if (!prose) throw new Error("dictionary-prose: no cases");
	const options: ProseOptions = {
		terms: termsParam === "de" ? "de" : defaultProseOptions.terms,
		layout:
			layoutParam === "paragraph"
				? "paragraph"
				: defaultProseOptions.layout,
		unchanged: unchangedParam !== "off",
		hints: hintsParam !== "off",
		brief: briefParam === "on",
	};

	const words = wordsOf(prose.text);
	const clicked = words.find((each) => each.id === wordId) ?? null;
	const open = clicked !== null;

	const [sheet, setSheet] = useState<CoverStack | null>(null);
	const nextKey = useRef(0);
	const cover = (show: Cover["show"]): Cover => {
		nextKey.current += 1;
		return {
			key: `c${nextKey.current}`,
			show,
			label:
				show.kind === "lemma"
					? lemmas[show.id].title
					: prose.surface.title,
			lang: "de",
		};
	};
	const openSheet = () =>
		setSheet({ covers: [cover({ kind: "surface" })], move: "push" });
	/** From the popover a fresh stack; inside a Sheet one more Cover. */
	const openLemma = (id: LemmaId, inSheet: boolean) => {
		const next = cover({ kind: "lemma", id });
		setSheet((shown) =>
			inSheet && shown
				? { covers: [...shown.covers, next], move: "push" }
				: { covers: [next], move: "push" },
		);
	};
	const popCover = (index: number) =>
		setSheet((shown) => {
			if (!shown || index >= shown.covers.length - 1) return shown;
			if (index < 0) return null;
			return { covers: shown.covers.slice(0, index + 1), move: "back" };
		});

	const openWord = (word: FixtureWord) => {
		const unit = unitOf(words, word);
		// The click lands on the unit; only its own words open it.
		if (!unit.some((each) => each.text === prose.clicked))
			return closePopover();
		setWordId(word.id, { push: true });
		setSheet(null);
	};
	const closePopover = () => setWordId(null, { push: true });

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
	useLayoutEffect(remeasure, [remeasure, naturalHeight, prose.id]);
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

	// Where neither side of the sentence fits the popover, the text scrolls.
	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!area || !scroller || !wordId || naturalHeight === 0) return;
		const fresh = measure(area, scroller, wordId, env.dir);
		if (!fresh) return;
		const { scrollBy } = placeBeside({
			...fresh,
			stack: { width: popoverWidth, height: naturalHeight },
		});
		if (Math.abs(scrollBy) > 2)
			scroller.scrollTo({
				top: scroller.scrollTop + scrollBy,
				behavior: env.reducedMotion ? "auto" : "smooth",
			});
	}, [area, wordId, naturalHeight, env.dir, env.reducedMotion]);

	// Escape is Back in a Sheet, then closes the popover; a click on the
	// text that misses every word closes it too.
	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!scroller) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.defaultPrevented) return;
			if (sheet) popCover(sheet.covers.length - 2);
			else if (wordId) closePopover();
		};
		const onClick = (event: MouseEvent) => {
			if (!(event.target as Element).closest("[data-word-id]"))
				closePopover();
		};
		document.addEventListener("keydown", onKey);
		if (wordId) scroller.addEventListener("click", onClick);
		return () => {
			document.removeEventListener("keydown", onKey);
			scroller.removeEventListener("click", onClick);
		};
	});

	useInspectorAvoid(avoidSide(sheet !== null, open, placement));

	const top = sheet?.covers.at(-1);
	/** A checkbox's param, stored only when it differs from the default. */
	const setFlag = (
		set: (value: string | null) => void,
		on: boolean,
		stored: "off" | "on",
	) => set(on === (stored === "on") ? stored : null);

	return (
		<div className="flex h-full flex-col bg-canvas text-ink">
			<DemoInspector>
				<InspectorSection>
					<InspectorTry>
						<p>
							The Surface popover explains, one dictionary
							sentence per clicked word, how the words become the
							lemma. Lines copy en.wiktionary's form-of lines (
							<i>third-person singular preterite of haben</i>,{" "}
							<i>pronominal adverb of mit</i>,{" "}
							<i>dative plural of Kind</i>); terms use its
							glossary and DWDS's names.
						</p>
					</InspectorTry>
				</InspectorSection>
				<InspectorSection title="Case">
					<InspectorChoice
						label="The sentence"
						options={proseCases.map((each) => ({
							value: each.id,
							label:
								each.id === "hard"
									? `Hard · ${each.label}`
									: `Simple · ${each.label}`,
						}))}
						value={prose.id}
						onChange={(id) => {
							setCaseParam(id === proseCases[0]?.id ? null : id);
							setWordId(null);
							setSheet(null);
						}}
					/>
				</InspectorSection>
				<InspectorSection title="Open choices">
					<InspectorChoice
						label="Grammar terms"
						options={[
							{
								value: "en",
								label: "English · preterite",
								hint: "en.wiktionary",
							},
							{
								value: "de",
								label: "German · Präteritum",
								hint: "DWDS",
							},
						]}
						value={options.terms}
						onChange={(value) =>
							setTermsParam(value === "en" ? null : value)
						}
					/>
					<InspectorChoice
						label="Shape"
						options={[
							{ value: "lines", label: "A line per word" },
							{ value: "paragraph", label: "One paragraph" },
						]}
						value={options.layout}
						onChange={(value) =>
							setLayoutParam(value === "lines" ? null : value)
						}
					/>
					<InspectorCheck
						checked={options.unchanged}
						onChange={(on) => setFlag(setUnchangedParam, on, "off")}
					>
						<span>
							Give unchanged words a line (<i>zu tun</i>)
						</span>
					</InspectorCheck>
					<InspectorCheck
						checked={options.hints}
						onChange={(on) => setFlag(setHintsParam, on, "off")}
					>
						Tap a term for its definition
					</InspectorCheck>
					<InspectorCheck
						checked={options.brief}
						onChange={(on) => setFlag(setBriefParam, on, "on")}
					>
						Popover keeps only the form-of lines; the Sheet has the
						rest
					</InspectorCheck>
				</InspectorSection>
				<InspectorSection title="Try">
					<InspectorTry>
						<p>
							Click <i>damit</i> (hard) or <i>Kindern</i>{" "}
							(simple). Read the lines as a learner who knows no
							grammar notation.
						</p>
						<p>
							Tap a dotted term, such as <i>preterite</i>, for its
							definition. A lemma in a line, such as <i>haben</i>,
							opens it as a Sheet.
						</p>
						<p>
							⤢ opens the popover as a Sheet; Back or Esc returns.
							Compare at 390 and 1440, with German terms and one
							paragraph.
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
						<WordText
							key={prose.id}
							text={prose.text}
							selectedWordId={wordId}
							onWordClick={({ word }) => openWord(word)}
						/>
					</div>
				</div>

				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					{open ? (
						<Popover
							placement={placement}
							openKey={`${prose.id}:${wordId}`}
							contentRef={setContent}
							onClose={closePopover}
						>
							<SurfaceNote
								prose={prose}
								presentation="card"
								options={options}
								action={<OpenAsSheet onClick={openSheet} />}
								onLemma={(id) => openLemma(id, false)}
							/>
						</Popover>
					) : null}
				</div>

				<AnimatePresence>
					{sheet && top ? (
						<Sheet
							key="sheet"
							stack={sheet}
							ground={{ title: prose.text.title, lang: "de" }}
							onPop={popCover}
						>
							{top.show.kind === "surface" ? (
								<SurfaceNote
									prose={prose}
									presentation="sheet"
									options={options}
									onLemma={(id) => openLemma(id, true)}
								/>
							) : (
								<LemmaNote entry={lemmas[top.show.id]} />
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
): InspectorAvoid | null {
	if (sheetOpen) return "inline-end";
	if (!popoverOpen || !placement) return null;
	if (placement.where.endsWith("end side")) return "inline-end";
	if (placement.where.endsWith("start side")) return "inline-start";
	return null;
}

/** The popover's floating box beside the sentence, with its close button. */
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
