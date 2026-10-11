import { Button, cn } from "lego";
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
import { useDemoParam } from "@/shell";
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
	/** For a narrow frame. */
	readonly short: string;
	readonly hint: string;
}[] = [
	{
		id: "skeletons",
		label: "a · Skeletons up front",
		short: "a · Skeletons",
		hint: "Every slot appears at the click and fills in place; an empty one folds away.",
	},
	{
		id: "deal",
		label: "b · Deal as ready",
		short: "b · Deal",
		hint: "A Card is dealt once its heading is known, with skeleton blocks until its body lands (tf-demo today).",
	},
	{
		id: "grow",
		label: "c · One Card grows",
		short: "c · Grow",
		hint: "One Card per click; each stage adds a section below the last.",
	},
];

/** Delay multipliers. ×1 settles a lookup in about 2.6 s. */
const speeds: readonly number[] = [0.25, 0.5, 1, 1.5, 2, 3];
const speedName = (speed: number) =>
	speed < 1 ? "fast" : speed === 1 ? "realistic" : "slow";

const tryThis = (
	<>
		switch strategy and watch the meter; click <em>Bahnhof</em> (no Surface,
		so a slot comes up empty); turn on “{failingKind} fails”; set the speed
		to ×3; set the width to 390.
	</>
);

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
			<header className="grid gap-1 border-line border-b px-4 py-2.5 text-sm">
				<p className="text-pretty">
					<strong className="font-semibold">
						Progressive results.
					</strong>{" "}
					<span className="text-ink-soft">
						A lookup's stages land one by one, about 2.6&nbsp;s in
						all. Readest shows a skeleton per dictionary and fills
						each as it settles, hiding empty ones.
					</span>
				</p>
				<p className="hidden text-pretty text-ink-muted @min-[640px]/frame:block">
					Try: {tryThis}
				</p>
				<details className="text-ink-muted @min-[640px]/frame:hidden">
					<summary className="cursor-pointer">What to try</summary>
					<p className="text-pretty">{tryThis}</p>
				</details>
			</header>

			<div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-line border-b px-4 py-2 text-sm">
				<fieldset className="flex flex-wrap gap-1">
					<legend className="sr-only">Strategy</legend>
					{strategies.map((each) => (
						<button
							key={each.id}
							type="button"
							aria-pressed={each.id === strategy}
							title={each.hint}
							onClick={() => setStrategy(each.id)}
							className={cn(
								"cursor-pointer rounded-md border px-2.5 py-1",
								each.id === strategy
									? "border-link bg-paper text-ink"
									: "border-line text-ink-soft hover:text-ink",
							)}
						>
							<span className="@min-[640px]/frame:hidden">
								{each.short}
							</span>
							<span className="hidden @min-[640px]/frame:inline">
								{each.label}
							</span>
						</button>
					))}
				</fieldset>
				<label className="flex items-center gap-2">
					<span className="text-ink-soft">Speed</span>
					<input
						type="range"
						min={0}
						max={speeds.length - 1}
						step={1}
						value={speeds.indexOf(speed)}
						onChange={(event) =>
							setSpeed(
								String(speeds[Number(event.target.value)] ?? 1),
							)
						}
						className="w-20 accent-[var(--link)] @min-[640px]/frame:w-24"
					/>
					<output className="w-24 text-ink-muted tabular-nums">
						<bdi>
							×{speed} {speedName(speed)}
						</bdi>
					</output>
				</label>
				<label className="flex cursor-pointer items-center gap-2">
					<input
						type="checkbox"
						checked={fail}
						onChange={(event) =>
							setFail(event.target.checked ? "1" : null)
						}
						className="accent-[var(--link)]"
					/>
					<span className="text-ink-soft">{failingKind} fails</span>
				</label>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setReplay((count) => count + 1)}
				>
					<RotateCw aria-hidden="true" />
					Replay
				</Button>
			</div>

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
					<div className="grid gap-1 border-line border-b px-4 py-2 text-xs">
						<div className="flex items-baseline justify-between gap-3">
							<span className="truncate text-ink-soft">
								{lookup.resolution ? (
									<>
										<span className="text-ink">
											{link ?? lookup.resolution.word}
										</span>
										{link ? " · via lemma link" : ""}
									</>
								) : (
									"Click a word."
								)}
							</span>
							<span
								className="shrink-0 text-ink-muted tabular-nums"
								aria-live="polite"
							>
								<bdi>
									{settled}/4 settled ·{" "}
									<Elapsed
										startedAt={lookup.startedAt}
										settledAfter={lookup.settledAfter}
									/>
								</bdi>
							</span>
						</div>
						<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-ink-muted tabular-nums">
							<bdi>
								front Card moved{" "}
								<strong className="font-semibold text-ink">
									{shifts.frontMoves}×
								</strong>{" "}
								· height changed{" "}
								<strong className="font-semibold text-ink">
									{shifts.heightChanges}×
								</strong>
							</bdi>
							<HeightTrace
								trace={shifts.trace}
								until={2600 * speed + 400}
							/>
						</div>
					</div>
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
