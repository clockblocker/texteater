import { Button } from "lego";
import { RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	cardKinds,
	type FakeCardLink,
	germanText,
	hebrewText,
	type WordClick,
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
	useFrameSize,
	useInspectorAvoid,
} from "@/shell";
import { HeightTrace, useShifts } from "./shift-meter";
import {
	AllSkeletons,
	DealAsReady,
	SingleGrowing,
	type Strategy,
} from "./strategies";
import { failingKind, useStagedLookup } from "./use-staged-lookup";

const allWords = [...wordsOf(germanText), ...wordsOf(hebrewText)];
const firstGing = allWords.find((word) => word.text === "ging");

const strategies: readonly {
	readonly id: Strategy;
	readonly label: string;
	readonly hint: string;
}[] = [
	{
		id: "skeletons",
		label: "a · Skeletons up front",
		hint: "Every slot appears at the click and fills in place; an empty one folds away.",
	},
	{
		id: "deal",
		label: "b · Deal as ready",
		hint: "A Card is dealt once its heading is known, with skeleton blocks until its body lands (tf-demo today).",
	},
	{
		id: "grow",
		label: "c · One Card grows",
		hint: "One Card per click; each stage adds a section below the last.",
	},
];

/** Delay multipliers. ×1 settles a lookup in about 2.6 s. */
const speeds: readonly number[] = [0.25, 0.5, 1, 1.5, 2, 3];
const speedName = (speed: number) =>
	speed < 1 ? "fast" : speed === 1 ? "realistic" : "slow";

const isStrategy = (value: string | null): value is Strategy =>
	strategies.some((each) => each.id === value);

/**
 * Progressive results: a lookup's stages land one by one, and the Deck
 * can show that three ways. A meter in the pane counts how often the
 * front Card's top edge moves and the stack's height changes.
 */
export default function ProgressiveResultsDemo() {
	const [strategyParam, setStrategy] = useDemoParam("strategy");
	const [speedParam, setSpeed] = useDemoParam("speed");
	const [failParam, setFail] = useDemoParam("fail");
	const [wordId, setWordId] = useDemoParam("word");
	const [link, setLink] = useState<string | null>(null);
	const [replay, setReplay] = useState(0);
	// The lookup sits at the inline end from 760px, below the text under it.
	const { inlineSize } = useFrameSize();
	useInspectorAvoid(inlineSize >= 760 ? "inline-end" : "block-end");

	const strategy: Strategy = isStrategy(strategyParam)
		? strategyParam
		: "deal";
	const speed = speeds.includes(Number(speedParam)) ? Number(speedParam) : 1;
	const fail = failParam === "1";
	const word =
		allWords.find((candidate) => candidate.id === wordId) ??
		(wordId === null ? firstGing : undefined) ??
		null;

	const lookup = useStagedLookup(link ?? word, {
		speed,
		fail,
		replay: `${strategy}#${replay}`,
	});
	const body = useRef<HTMLDivElement>(null);
	const shifts = useShifts(body, lookup.run, lookup.startedAt);

	const onWordClick = ({ word: clicked }: WordClick) => {
		setLink(null);
		if (clicked.id === word?.id) setReplay((count) => count + 1);
		else setWordId(clicked.id, { push: true });
	};
	const onLinkClick = ({ word: lemma }: FakeCardLink) => setLink(lemma);

	const strategyProps = lookup.resolution
		? {
				resolution: lookup.resolution,
				stages: lookup.stages,
				retry: lookup.retry,
				onLinkClick,
			}
		: null;
	const settled = cardKinds.filter((kind) => {
		const status = lookup.stages[kind].status;
		return status !== "waiting" && status !== "partial";
	}).length;

	return (
		<div className="flex h-full flex-col bg-canvas text-ink">
			<DemoInspector>
				<InspectorSection>
					<InspectorTry>
						<p>
							A lookup's stages land one by one, about 2.6&nbsp;s
							in all. Readest shows a skeleton per dictionary and
							fills each as it settles, hiding empty ones.
						</p>
					</InspectorTry>
				</InspectorSection>
				<InspectorSection title="Try">
					<InspectorTry>
						<p>
							Switch strategy and watch the meter; click{" "}
							<em>Bahnhof</em> (no Surface, so a slot comes up
							empty); turn on “{failingKind} fails”; set the speed
							to ×3; set the width to 390.
						</p>
					</InspectorTry>
				</InspectorSection>
				<InspectorSection title="Knobs">
					<InspectorChoice
						label="Strategy"
						options={strategies.map((each) => ({
							value: each.id,
							label: each.label,
							hint: each.hint,
						}))}
						value={strategy}
						onChange={setStrategy}
					/>
					<InspectorRange
						label="Speed"
						min={0}
						max={speeds.length - 1}
						step={1}
						value={speeds.indexOf(speed)}
						onChange={(index) =>
							setSpeed(String(speeds[index] ?? 1))
						}
						format={() => `×${speed} ${speedName(speed)}`}
					/>
					<InspectorCheck
						checked={fail}
						onChange={(on) => setFail(on ? "1" : null)}
					>
						{failingKind} fails
					</InspectorCheck>
					<Button
						variant="outline"
						size="sm"
						className="w-fit"
						onClick={() => setReplay((count) => count + 1)}
					>
						<RotateCw aria-hidden="true" />
						Replay
					</Button>
				</InspectorSection>
				<InspectorSection title="Meter">
					<div className="grid gap-1 text-xs text-ink-muted tabular-nums">
						<p className="flex items-baseline justify-between gap-3">
							<span className="truncate">
								{lookup.resolution ? (
									<>
										<bdi className="text-ink">
											{link ?? lookup.resolution.word}
										</bdi>
										{link ? " · via lemma link" : ""}
									</>
								) : (
									"Click a word."
								)}
							</span>
							<span className="shrink-0" aria-live="polite">
								{settled}/4 settled ·{" "}
								<Elapsed
									startedAt={lookup.startedAt}
									settledAfter={lookup.settledAfter}
								/>
							</span>
						</p>
						<p>
							front Card moved{" "}
							<strong className="font-semibold text-ink">
								{shifts.frontMoves}×
							</strong>{" "}
							· height changed{" "}
							<strong className="font-semibold text-ink">
								{shifts.heightChanges}×
							</strong>
						</p>
						<HeightTrace
							trace={shifts.trace}
							until={2600 * speed + 400}
						/>
					</div>
				</InspectorSection>
			</DemoInspector>

			<div
				ref={body}
				className="flex min-h-0 flex-1 flex-col @min-[760px]/frame:grid @min-[760px]/frame:grid-cols-[1fr_minmax(20rem,26rem)]"
			>
				<main className="min-h-0 flex-1 overflow-auto px-5 py-5 @min-[760px]/frame:px-8">
					<div className="mx-auto grid max-w-[38rem] gap-6">
						<WordText
							text={germanText}
							selectedWordId={link ? null : (word?.id ?? null)}
							onWordClick={onWordClick}
						/>
						<WordText
							text={hebrewText}
							selectedWordId={link ? null : (word?.id ?? null)}
							onWordClick={onWordClick}
						/>
					</div>
				</main>

				<aside
					aria-label="Lookup"
					className="flex max-h-[58%] shrink-0 flex-col border-line border-t bg-canvas @min-[760px]/frame:max-h-none @min-[760px]/frame:border-t-0 @min-[760px]/frame:border-s"
				>
					<div className="min-h-0 flex-1 overflow-auto p-4">
						<div data-deck key={lookup.run}>
							{strategyProps === null ? null : strategy ===
								"skeletons" ? (
								<AllSkeletons {...strategyProps} />
							) : strategy === "deal" ? (
								<DealAsReady {...strategyProps} />
							) : (
								<SingleGrowing {...strategyProps} />
							)}
						</div>
					</div>
				</aside>
			</div>
		</div>
	);
}

/** Seconds since the run began, frozen once every stage has settled. */
function Elapsed({
	startedAt,
	settledAfter,
}: {
	readonly startedAt: number;
	readonly settledAfter: number | null;
}) {
	const [now, setNow] = useState(() => performance.now());
	useEffect(() => {
		if (settledAfter !== null) return;
		const timer = setInterval(() => setNow(performance.now()), 100);
		return () => clearInterval(timer);
	}, [settledAfter]);
	const ms = settledAfter ?? Math.max(0, now - startedAt);
	return <>{(ms / 1000).toFixed(1)} s</>;
}
