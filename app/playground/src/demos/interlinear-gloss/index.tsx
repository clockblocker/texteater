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
import { LemmaPage, SurfaceCard, SurfacePage } from "./cards";
import { type GlossCase, unitOf } from "./cases";
import { columnKey } from "./focus";
import { InspectorPanel } from "./inspector";
import { type Box, type Placement, placeBeside, type Scene } from "./placement";
import { type Cover, type CoverStack, Sheet } from "./sheet";
import { useKnobs } from "./use-knobs";

/** Wide enough for five glossed words in a row. */
const popoverWidth = 408;

type Measured = Omit<Scene, "stack">;

/**
 * Interlinear gloss: the clicked words' Surface popover explains how they
 * become the lemma as a Leipzig-style interlinear gloss, each word over
 * its morphemes and glosses, with a line from each piece to where it lands
 * in the lemma's header. ⤢ opens it as a Sheet with the whole clause
 * glossed and every word's note. The case, the clicked word and the knobs
 * live in the URL.
 */
export default function InterlinearGlossDemo() {
	const env = usePlaygroundEnv();
	const { glossCase, setCase, wordId, setWordId, knobs, note, setKnob } =
		useKnobs();
	const words = wordsOf(glossCase.text);
	const word = words.find((each) => each.id === wordId && each.unitId);

	const [picked, setPicked] = useState<string | null>(null);
	const [hover, setHover] = useState<string | null>(null);
	const focus = hover ?? picked ?? clickedKey(glossCase, word);
	const [sheet, setSheet] = useState<CoverStack | null>(null);
	const nextKey = useRef(0);

	const cover = (kind: Cover["kind"]): Cover => {
		nextKey.current += 1;
		return {
			key: `c${nextKey.current}`,
			kind,
			label:
				kind === "lemma"
					? glossCase.lemma.title
					: unitOf(glossCase)
							.map((column) => column.word)
							.join(" "),
			lang: "de",
		};
	};
	const pushCover = (kind: Cover["kind"]) =>
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

	const openWord = (clicked: FixtureWord) => {
		if (!clicked.unitId) {
			closePopover();
			return;
		}
		setWordId(clicked.id, { push: true });
		setPicked(null);
		setHover(null);
		setSheet(null);
	};
	const closePopover = () => {
		setWordId(null, { push: true });
		setPicked(null);
		setHover(null);
	};
	const switchCase = (next: GlossCase) => {
		setCase(next);
		setPicked(null);
		setHover(null);
		setSheet(null);
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

	const shared = {
		glossCase,
		knobs,
		focus,
		onFocus: setPicked,
		onHover: setHover,
	};
	const top = sheet?.covers.at(-1);

	return (
		<div className="flex h-full flex-col bg-canvas text-ink">
			<DemoInspector>
				<InspectorPanel
					glossCase={glossCase}
					onCase={switchCase}
					knobs={knobs}
					note={note}
					setKnob={setKnob}
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
					{word ? (
						<Popover
							placement={placement}
							openKey={`${glossCase.id}:${word.id}`}
							contentRef={setContent}
							onClose={closePopover}
						>
							<SurfaceCard
								{...shared}
								note={note}
								onOpenSheet={() =>
									setSheet({
										covers: [cover("surface")],
										move: "push",
									})
								}
								onFollow={() =>
									setSheet({
										covers: [cover("lemma")],
										move: "push",
									})
								}
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
							{top.kind === "surface" ? (
								<SurfacePage
									{...shared}
									onFollow={() => pushCover("lemma")}
								/>
							) : (
								<LemmaPage glossCase={glossCase} />
							)}
						</Sheet>
					) : null}
				</AnimatePresence>
			</div>
		</div>
	);
}

/** The column the reader clicked, which has the focus until another does. */
function clickedKey(
	glossCase: GlossCase,
	word: FixtureWord | undefined,
): string | null {
	if (!word) return null;
	const column = unitOf(glossCase).find(
		(each) => each.word.toLowerCase() === word.text.toLowerCase(),
	);
	return column ? columnKey(column.id) : null;
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
