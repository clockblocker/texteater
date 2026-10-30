import { AnimatePresence } from "motion/react";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { WordText, wordsOf } from "@/fixtures";
import { useDemoParam, useInspectorAvoid, usePlaygroundEnv } from "@/shell";
import { LemmaCard, OpenAsSheet, StepList, SurfaceCard } from "./cards";
import { cases, lemmaText, type MorphCase } from "./cases";
import { cardWidth, FloatingCard, type Measured, measure } from "./floating";
import { initialKnobs, type Knobs, MorphInspector } from "./inspector";
import { type Placement, placeBeside } from "./placement";
import { type Cover, type CoverStack, Sheet } from "./sheet";
import { MorphStage, type StageLook } from "./stage";
import { usePlayback } from "./use-playback";

/**
 * Morph steps: a click on any word of a unit opens its Surface Card
 * beside the sentence, and the Card shows the clicked words turning into
 * the lemma, one visible step at a time, after Keynote's Magic Move and
 * Duolingo's tips. ⤢ opens the Card as a Sheet, where every step's
 * caption is listed too; the lemma link opens the Lemma. The case and the
 * clicked word live in the URL.
 */
export default function MorphStepsDemo() {
	const env = usePlaygroundEnv();
	const [caseParam, setCaseParam] = useDemoParam("case");
	const [wordId, setWordId] = useDemoParam("word");
	const morph: MorphCase =
		cases.find((candidate) => candidate.id === caseParam) ?? hardCase();
	const word =
		wordsOf(morph.text).find(
			(candidate) =>
				candidate.id === wordId && candidate.unitId === morph.unitId,
		) ?? null;

	const [knobs, setKnobs] = useState<Knobs>(initialKnobs);
	const [sheet, setSheet] = useState<CoverStack | null>(null);
	const [opened, setOpened] = useState(0);
	const nextKey = useRef(0);
	const playback = usePlayback({
		frames: morph.frames,
		speed: knobs.speed,
		loop: knobs.ending === "loop",
		captions: knobs.captions,
	});
	const autoplay = knobs.start === "play" && !env.reducedMotion;
	const look: StageLook = {
		match: knobs.match,
		captions: knobs.captions,
		tags: knobs.tags,
		context: knobs.context,
		moveS: env.reducedMotion ? 0 : 0.6 / knobs.speed,
	};

	const openWord = (id: string) => {
		setWordId(id, { push: true });
		setSheet(null);
		setOpened((count) => count + 1);
		playback.restart(autoplay);
	};
	const close = () => {
		setWordId(null, { push: true });
		setSheet(null);
	};

	const cover = (kind: Cover["kind"]): Cover => {
		nextKey.current += 1;
		return {
			key: `c${nextKey.current}`,
			kind,
			label: kind === "lemma" ? lemmaText(morph) : morph.surface.title,
			lang: "de",
		};
	};
	const openSheet = (kind: Cover["kind"]) =>
		setSheet({ covers: [cover(kind)], move: "push" });
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

	// When neither side of the sentence fits the Card, the text scrolls the
	// sentence up; it asks on a new click, never on the reader's own scroll.
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
	}, [area, word, opened, naturalHeight > 0, env.dir, env.reducedMotion]);

	// Escape is Back while a Sheet is open, then closes the Card; a click
	// on the text that misses every word closes the Card.
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

	useInspectorAvoid(
		sheet
			? "inline-end"
			: word && placement?.where.endsWith("start side")
				? "inline-start"
				: word && placement?.where.endsWith("end side")
					? "inline-end"
					: null,
	);

	const top = sheet?.covers.at(-1);

	return (
		<div className="flex h-full flex-col bg-canvas text-ink">
			<MorphInspector
				morph={morph}
				knobs={knobs}
				onKnobs={(next) => {
					setKnobs(next);
					if (next.start !== knobs.start)
						playback.restart(
							next.start === "play" && !env.reducedMotion,
						);
				}}
				onCase={(id) => {
					setCaseParam(id === "hard" ? null : id);
					setWordId(null);
					setSheet(null);
					playback.restart(false);
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
						<FloatingCard
							placement={placement}
							openKey={`${morph.id}:${opened}`}
							contentRef={setContent}
							reducedMotion={env.reducedMotion}
							onClose={close}
						>
							<SurfaceCard
								morph={morph}
								action={
									<OpenAsSheet
										onClick={() => openSheet("surface")}
									/>
								}
								onLemma={() => openSheet("lemma")}
								stage={
									<MorphStage
										frames={morph.frames}
										playback={playback}
										look={look}
										size="card"
									/>
								}
							/>
						</FloatingCard>
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
							{top.kind === "lemma" ? (
								<LemmaCard morph={morph} />
							) : (
								<>
									<SurfaceCard
										morph={morph}
										large
										onLemma={() => pushCover("lemma")}
										stage={
											<MorphStage
												frames={morph.frames}
												playback={playback}
												look={look}
												size="sheet"
											/>
										}
									/>
									<StepList
										morph={morph}
										playback={playback}
									/>
								</>
							)}
						</Sheet>
					) : null}
				</AnimatePresence>
			</div>
		</div>
	);
}

function hardCase(): MorphCase {
	const first = cases[0];
	if (!first) throw new Error("morph-steps: no cases");
	return first;
}
