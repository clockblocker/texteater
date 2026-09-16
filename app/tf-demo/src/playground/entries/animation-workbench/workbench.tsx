import { useEffect, useRef, useState } from "react";
import type { EntryRoute } from "../../playground-router";
import { type DummyNote, deckFor } from "../deck-models/dummy";
import {
	describeSwap,
	SWAP,
	SWAP_EASES,
	type SwapEase,
	type SwapSpec,
	swapEquals,
} from "../deck-models/swap-pulse";
import {
	DEFAULT_PARAMS,
	type Frame,
	layoutFor,
	type Move,
	moveLength,
	type Params,
	rest,
	tapMove,
} from "./motion";
import { Pile } from "./pile";
import {
	type AnyScene,
	groupKnobs,
	groupLength,
	type Knob,
	type SceneGroup,
	type Where,
} from "./scene";
import { SCENE_GROUPS } from "./scenes";
import { peakMs, SWAP_SOURCE, swap } from "./swap";

/**
 * ANIMATION WORKBENCH — every animation in tf-demo, frozen at any instant.
 *
 * The clock owns `t` and nothing else. Every tile evaluates its variant or
 * scene at that `t`, so scrub, step, pause and play show the same frame
 * for the same timestamp, and a parameter change redraws the frozen frame
 * at once.
 *
 * The first tab, Tap, is the deck's Swap: the accepted pulse, with its
 * real knobs, next to an optional locked baseline. The spec it edits is
 * the one the live deck reads (`deck-models/swap-pulse.ts`), so a tuned
 * pulse is carried over by changing that file's `SWAP`. The other tabs are
 * the scenes in `scenes/`, each one shipped motion replayed from `t = 0`;
 * they are reference, with only the knobs they already had.
 */

const TAP_GROUP = "tap";

const WORD = "noch";
const FRAME_MS = 1000 / 60;

const SPEEDS: readonly { readonly label: string; readonly value: number }[] = [
	{ label: "1×", value: 1 },
	{ label: "½×", value: 0.5 },
	{ label: "¼×", value: 0.25 },
	{ label: "⅛×", value: 0.125 },
];

function useRemPx(): number {
	const [px] = useState(() =>
		Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
	);
	return px;
}

/* ---------------------------------------------------------------- clock */

/** A loop interval, in ms. */
type Range = { readonly from: number; readonly to: number };

type Clock = {
	readonly t: number;
	readonly playing: boolean;
	readonly speed: number;
	readonly loop: boolean;
	readonly range: Range | null;
};

/**
 * Advances `t` by real elapsed time × speed while playing, and stops (or
 * wraps) at the end of the loop interval, or of the whole timeline. Time
 * is the only thing it touches.
 */
function useClock(length: number) {
	const [clock, setClock] = useState<Clock>({
		t: 0,
		playing: false,
		speed: 1,
		loop: false,
		range: null,
	});
	const lengthRef = useRef(length);
	lengthRef.current = length;

	const clampT = (next: number) =>
		Math.max(0, Math.min(lengthRef.current, next));

	useEffect(() => {
		if (!clock.playing) return;
		// The first frame's timestamp can predate `performance.now()` read
		// here, so the first tick only sets the baseline.
		let last: number | null = null;
		let handle = requestAnimationFrame(function tick(now) {
			const dt =
				last === null ? 0 : Math.max(0, now - last) * clock.speed;
			last = now;
			setClock((current) => {
				if (!current.playing) return current;
				const max = Math.min(
					lengthRef.current,
					current.range?.to ?? lengthRef.current,
				);
				const min = Math.min(current.range?.from ?? 0, max);
				const next = current.t + dt;
				if (next < max) return { ...current, t: next };
				if (current.loop && max > min) {
					return {
						...current,
						t: min + ((next - min) % (max - min)),
					};
				}
				return { ...current, t: max, playing: false };
			});
			handle = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(handle);
	}, [clock.playing, clock.speed]);

	const t = Math.min(clock.t, length);
	const range = clock.range
		? {
				from: Math.min(clock.range.from, length),
				to: Math.min(clock.range.to, length),
			}
		: null;
	const end = range?.to ?? length;
	return {
		t,
		playing: clock.playing,
		speed: clock.speed,
		loop: clock.loop,
		range,
		atEnd: t >= length,
		seek: (next: number) =>
			setClock((c) => ({ ...c, t: clampT(next), playing: false })),
		play: () =>
			setClock((c) => ({
				...c,
				// Play from the start of the interval when it is already
				// spent, so Play after a stop is never a no-op.
				t: c.t >= end ? (range?.from ?? 0) : c.t,
				playing: true,
			})),
		pause: () => setClock((c) => ({ ...c, playing: false })),
		restart: () =>
			setClock((c) => ({ ...c, t: range?.from ?? 0, playing: true })),
		step: (frames: number) =>
			setClock((c) => ({
				...c,
				t: clampT(c.t + frames * FRAME_MS),
				playing: false,
			})),
		setSpeed: (speed: number) => setClock((c) => ({ ...c, speed })),
		setLoop: (loop: boolean) => setClock((c) => ({ ...c, loop })),
		setRange: (next: Range | null) =>
			setClock((c) => ({
				...c,
				range:
					next && next.to > next.from
						? { from: clampT(next.from), to: clampT(next.to) }
						: null,
			})),
	} as const;
}

/** Space plays and pauses; the arrow keys step a frame. Not while typing. */
function useShortcuts(handlers: {
	readonly toggle: () => void;
	readonly step: (frames: number) => void;
}) {
	const ref = useRef(handlers);
	ref.current = handlers;
	useEffect(() => {
		function onKey(event: KeyboardEvent) {
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			const target = event.target;
			if (
				target instanceof HTMLElement &&
				target.closest(
					'input, select, textarea, button, [role="button"], [contenteditable="true"]',
				)
			) {
				return;
			}
			if (event.key === " ") {
				event.preventDefault();
				ref.current.toggle();
			} else if (event.key === "ArrowRight") {
				event.preventDefault();
				ref.current.step(event.shiftKey ? 10 : 1);
			} else if (event.key === "ArrowLeft") {
				event.preventDefault();
				ref.current.step(event.shiftKey ? -10 : -1);
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
}

/* ------------------------------------------------------------- controls */

function Chip({
	pressed,
	onClick,
	children,
}: {
	pressed: boolean;
	onClick: () => void;
	children: string;
}) {
	return (
		<button
			type="button"
			aria-pressed={pressed}
			onClick={onClick}
			className="rounded-[0.4rem] px-2 py-1 text-[0.8rem] text-ink-soft hover:text-ink aria-pressed:bg-paper aria-pressed:text-ink"
		>
			{children}
		</button>
	);
}

function WhereBadge({ where }: { where: Where }) {
	return (
		<span
			data-where={where}
			className={`shrink-0 rounded-[0.3rem] border px-1.5 py-px font-mono text-[0.58rem] tracking-[0.08em] uppercase ${where === "main app" ? "border-link/50 text-link" : "border-line-strong text-ink-muted"}`}
		>
			{where}
		</span>
	);
}

function Button({
	onClick,
	disabled,
	title,
	children,
}: {
	onClick: () => void;
	disabled?: boolean;
	title?: string;
	children: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={title}
			className="rounded-[0.5rem] border border-line-strong bg-paper px-3 py-1.5 text-[0.8rem] text-ink hover:border-link disabled:cursor-default disabled:opacity-50"
		>
			{children}
		</button>
	);
}

function Switch({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (next: boolean) => void;
}) {
	return (
		<label className="flex cursor-pointer items-center gap-2 text-[0.8rem] text-ink-soft">
			<input
				type="checkbox"
				checked={checked}
				onChange={(event) => onChange(event.target.checked)}
				className="accent-link"
			/>
			<span>{label}</span>
		</label>
	);
}

function ResetButton({
	onClick,
	disabled,
	what,
}: {
	onClick: () => void;
	disabled: boolean;
	what: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={`Reset ${what} to the accepted value`}
			aria-label={`Reset ${what}`}
			className="rounded-[0.3rem] px-1 font-mono text-[0.72rem] text-ink-muted hover:text-ink disabled:invisible"
		>
			↺
		</button>
	);
}

/**
 * One numeric knob: a slider for feel, a number field for exactness, and a
 * reset to the accepted value. `value` is in the unit shown; the caller
 * maps it to and from the spec.
 */
function Control({
	label,
	value,
	baseline,
	min,
	max,
	step,
	unit = "",
	onChange,
}: {
	label: string;
	value: number;
	baseline?: number;
	min: number;
	max: number;
	step: number;
	unit?: string;
	onChange: (next: number) => void;
}) {
	const digits = Number.isInteger(step) ? 0 : 1;
	return (
		<div className="flex items-center gap-2 text-[0.8rem] text-ink-soft">
			<label className="flex items-center gap-3">
				<span className="w-[7.5rem] shrink-0">{label}</span>
				<input
					type="range"
					min={min}
					max={max}
					step={step}
					value={value}
					onChange={(event) => onChange(Number(event.target.value))}
					className="w-32 accent-link"
				/>
			</label>
			<label className="flex items-center gap-1 font-mono text-[0.72rem] text-ink-muted tabular-nums">
				<span className="sr-only">{label}, exact</span>
				<input
					type="number"
					min={min}
					max={max}
					step={step}
					value={value.toFixed(digits)}
					onChange={(event) => {
						const next = Number(event.target.value);
						if (Number.isFinite(next)) {
							onChange(Math.max(min, Math.min(max, next)));
						}
					}}
					className="w-[4.5rem] rounded-[0.3rem] border border-line bg-paper px-1.5 py-0.5 text-end text-ink"
				/>
				<span className="w-6">{unit}</span>
			</label>
			{baseline === undefined ? null : (
				<ResetButton
					what={label}
					disabled={value === baseline}
					onClick={() => onChange(baseline)}
				/>
			)}
		</div>
	);
}

function EaseControl({
	label,
	value,
	baseline,
	onChange,
}: {
	label: string;
	value: SwapEase;
	baseline: SwapEase;
	onChange: (next: SwapEase) => void;
}) {
	return (
		<div className="flex items-center gap-2 text-[0.8rem] text-ink-soft">
			<label className="flex items-center gap-3">
				<span className="w-[7.5rem] shrink-0">{label}</span>
				<select
					value={value}
					onChange={(event) =>
						onChange(event.target.value as SwapEase)
					}
					className="rounded-[0.3rem] border border-line bg-paper px-1.5 py-0.5 font-mono text-[0.72rem] text-ink"
				>
					{SWAP_EASES.map((ease) => (
						<option key={ease} value={ease}>
							{ease}
						</option>
					))}
				</select>
			</label>
			<ResetButton
				what={label}
				disabled={value === baseline}
				onClick={() => onChange(baseline)}
			/>
		</div>
	);
}

/* ----------------------------------------------------------------- tile */

function TileHeader({
	title,
	blurb,
	source,
	where,
	t,
	length,
	note,
}: {
	title: string;
	blurb: string;
	source: string;
	where: Where;
	t: number;
	length: number;
	note?: string | null;
}) {
	return (
		<div className="min-h-[5.5rem]">
			<div className="flex items-baseline justify-between gap-3">
				<h3 className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
					{title}
				</h3>
				<span className="flex shrink-0 items-baseline gap-2">
					<span className="font-mono text-[0.62rem] text-ink-faint tabular-nums">
						{Math.round(t).toString()} /{" "}
						{Math.round(length).toString()} ms
					</span>
					<WhereBadge where={where} />
				</span>
			</div>
			<p className="mt-1 text-[0.8rem] leading-snug text-ink-soft">
				{blurb}
			</p>
			<p className="mt-1 truncate font-mono text-[0.62rem] text-ink-faint">
				{source}
			</p>
			{note ? (
				<p
					data-caveat
					className="mt-1 text-[0.72rem] leading-snug text-destructive"
				>
					{note}
				</p>
			) : null}
		</div>
	);
}

/** One Swap preview: a spec, a move, and the deck at `t`. */
function SwapTile({
	kind,
	spec,
	cards,
	move,
	t,
	frame,
	tap,
}: {
	kind: "candidate" | "baseline";
	spec: SwapSpec;
	cards: readonly DummyNote[];
	move: Move;
	t: number;
	frame: Frame;
	tap: (index: number) => void;
}) {
	const length = moveLength(move, spec);
	return (
		<section
			data-swap={kind}
			data-swap-t={Math.min(t, length)}
			className="flex flex-col gap-4 rounded-[0.7rem] border border-line p-4"
		>
			<TileHeader
				title={kind === "baseline" ? "Swap · baseline" : "Swap"}
				blurb={
					kind === "baseline"
						? `The accepted pulse, locked: ${describeSwap(spec)}.`
						: `The tapped Card comes to the front at once; nothing travels. The new front Card pulses: ${describeSwap(spec)}.${move.seed ? " Retargeted mid-flight from the frame on screen." : ""}`
				}
				source={SWAP_SOURCE}
				where="playground"
				t={Math.min(t, length)}
				length={length}
			/>
			<Pile cards={cards} frame={frame} tap={tap} />
		</section>
	);
}

function SceneTile({
	scene,
	t,
	params,
}: {
	scene: AnyScene;
	t: number;
	params: Params;
}) {
	const length = scene.length(params);
	const local = Math.min(t, length);
	const frame = scene.frame(local, params);
	return (
		<section
			data-scene={scene.key}
			data-scene-t={local}
			className="flex flex-col gap-4 rounded-[0.7rem] border border-line p-4"
		>
			<TileHeader
				title={scene.title}
				blurb={scene.blurb}
				source={scene.source}
				where={scene.where}
				t={local}
				length={length}
				note={scene.caveat?.(params)}
			/>
			<scene.Render frame={frame} />
		</section>
	);
}

/* ------------------------------------------------------------- timeline */

type Marker = {
	readonly at: number;
	readonly label: string;
	readonly tone: "strong" | "soft";
};

/** Ticks under the timeline slider: start, peaks, end and the loop interval. */
function Markers({
	markers,
	length,
}: {
	markers: readonly Marker[];
	length: number;
}) {
	if (length <= 0) return null;
	return (
		<div aria-hidden="true" className="relative h-3 min-w-[16rem] flex-1">
			{markers.map((marker) => (
				<span
					key={`${marker.label}-${marker.at.toString()}`}
					title={`${marker.label} · ${Math.round(marker.at).toString()} ms`}
					className={`absolute top-0 h-2 w-px -translate-x-1/2 ${marker.tone === "strong" ? "bg-ink" : "bg-ink-faint"}`}
					style={{
						insetInlineStart: `${((marker.at / length) * 100).toFixed(3)}%`,
					}}
				/>
			))}
		</div>
	);
}

/* ------------------------------------------------------------ workbench */

type Seeds = { readonly candidate?: Frame; readonly baseline?: Frame };

export function AnimationWorkbench({ route }: { route: EntryRoute }) {
	const px = useRemPx();
	const [cards] = useState(() => [...deckFor(WORD)].reverse());
	const layout = layoutFor(cards.length, px);
	const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
	const [spec, setSpec] = useState<SwapSpec>(SWAP);
	const [compare, setCompare] = useState(false);
	const [move, setMove] = useState<Move>(() => rest(cards.length - 1));
	const [seeds, setSeeds] = useState<Seeds>({});

	// The tab is the URL: `/playground/animation-workbench/<group>`.
	const groupKey = route.segments[0] ?? TAP_GROUP;
	const group: SceneGroup | null =
		SCENE_GROUPS.find((g) => g.key === groupKey) ?? null;
	const isTap = group === null;

	const candidateMove: Move = seeds.candidate
		? { ...move, seed: seeds.candidate }
		: move;
	const baselineMove: Move = seeds.baseline
		? { ...move, seed: seeds.baseline }
		: move;
	const candidateLength = moveLength(candidateMove, spec);
	const baselineLength = moveLength(baselineMove, SWAP);
	const length = isTap
		? compare
			? Math.max(candidateLength, baselineLength)
			: candidateLength
		: groupLength(group, params);
	const clock = useClock(length);
	const knobs: readonly Knob[] = isTap ? [] : groupKnobs(group);

	// Each preview stops at its own end, whatever the shared clock says.
	const candidateFrame = swap(
		candidateMove,
		Math.min(clock.t, candidateLength),
		spec,
		layout,
	);
	const baselineFrame = swap(
		baselineMove,
		Math.min(clock.t, baselineLength),
		SWAP,
		layout,
	);

	function show(key: string) {
		if (key === groupKey) return;
		route.setSegments(key === TAP_GROUP ? [] : [key]);
		clock.restart();
	}

	/** A tap on Card `index`, as a user would: playing or paused, same rule. */
	function tap(index: number) {
		const inFlight = length > 0 && !clock.atEnd;
		const next = tapMove(move, index, inFlight, candidateFrame);
		if (!next) return;
		setMove({ from: next.from, to: next.to });
		setSeeds(
			inFlight
				? { candidate: candidateFrame, baseline: baselineFrame }
				: {},
		);
		clock.restart();
	}

	function resetDeck() {
		setMove(rest(cards.length - 1));
		setSeeds({});
		clock.seek(0);
	}

	function togglePlay() {
		if (length === 0) return;
		if (clock.playing) clock.pause();
		else clock.play();
	}

	useShortcuts({ toggle: togglePlay, step: clock.step });

	const patch = (part: Partial<Params>) =>
		setParams((current) => ({ ...current, ...part }));
	const tune = (part: Partial<SwapSpec>) =>
		setSpec((current) => ({ ...current, ...part }));
	const tuned = !swapEquals(spec, SWAP);

	const mark = (at: number, label: string, tone: Marker["tone"]): Marker => ({
		at,
		label,
		tone,
	});
	const markers: Marker[] = isTap
		? [
				mark(0, "Start", "strong"),
				mark(peakMs(spec), "Peak", "strong"),
				mark(candidateLength, "End", "strong"),
				...(compare
					? [
							mark(peakMs(SWAP), "Baseline peak", "soft"),
							mark(baselineLength, "Baseline end", "soft"),
						]
					: []),
			].filter((marker) => marker.at <= length)
		: [mark(0, "Start", "strong"), mark(length, "End", "strong")];
	if (clock.range) {
		markers.push(
			{ at: clock.range.from, label: "Loop in", tone: "soft" },
			{ at: clock.range.to, label: "Loop out", tone: "soft" },
		);
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			<header className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-line px-6 py-3">
				<div className="min-w-[14rem]">
					<h2 className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
						Animation workbench
					</h2>
					<p className="text-[0.8rem] text-ink-soft">
						{isTap
							? "The deck's Swap, as accepted. Tap a folded header to play the move; tune the pulse, and compare it with the baseline."
							: group.blurb}
					</p>
				</div>
				<nav
					aria-label="Animation groups"
					className="flex items-center gap-1"
				>
					<Chip pressed={isTap} onClick={() => show(TAP_GROUP)}>
						Tap
					</Chip>
					{SCENE_GROUPS.map((g) => (
						<Chip
							key={g.key}
							pressed={g.key === groupKey}
							onClick={() => show(g.key)}
						>
							{g.title}
						</Chip>
					))}
				</nav>
				<div className="ms-auto flex flex-wrap items-center gap-x-6 gap-y-2">
					<div className="flex items-center gap-2">
						<Button
							onClick={togglePlay}
							disabled={length === 0}
							title="Space"
						>
							{clock.playing ? "Pause" : "Play"}
						</Button>
						<Button
							onClick={clock.restart}
							disabled={length === 0}
							title="Play this move again from the start"
						>
							Replay
						</Button>
						{isTap ? (
							<>
								<Button
									onClick={() => tap(move.from)}
									disabled={move.from === move.to}
									title="Tap the previous Card, as a user would. This is a new move, not the last one played backward."
								>
									Tap back
								</Button>
								<Button
									onClick={resetDeck}
									disabled={
										move.from === move.to && clock.t === 0
									}
									title="Put the deck back to its starting arrangement"
								>
									Reset deck
								</Button>
							</>
						) : null}
					</div>
					<fieldset className="flex items-center gap-1">
						<legend className="sr-only">Speed</legend>
						<span className="me-1 text-[0.8rem] text-ink-muted">
							Clock
						</span>
						{SPEEDS.map((option) => (
							<Chip
								key={option.label}
								pressed={clock.speed === option.value}
								onClick={() => clock.setSpeed(option.value)}
							>
								{option.label}
							</Chip>
						))}
					</fieldset>
					<Switch
						label="Loop"
						checked={clock.loop}
						onChange={clock.setLoop}
					/>
				</div>
			</header>

			<div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-6 py-2">
				<Button
					onClick={() => clock.step(-1)}
					disabled={clock.t <= 0}
					title="Back one frame (1/60 s) · ←"
				>
					‹
				</Button>
				<Button
					onClick={() => clock.step(1)}
					disabled={clock.atEnd}
					title="Forward one frame (1/60 s) · →"
				>
					›
				</Button>
				<div className="flex min-w-[16rem] flex-1 flex-col">
					<input
						type="range"
						aria-label="Timeline"
						min={0}
						max={Math.max(1, length)}
						step="any"
						value={clock.t}
						disabled={length === 0}
						onChange={(event) =>
							clock.seek(Number(event.target.value))
						}
						className="w-full accent-link"
					/>
					<Markers markers={markers} length={length} />
				</div>
				<label className="flex items-center gap-1 font-mono text-[0.72rem] text-ink-muted tabular-nums">
					<span>t =</span>
					<input
						type="number"
						aria-label="Timestamp, ms"
						min={0}
						max={Math.round(length)}
						step={1}
						value={Math.round(clock.t)}
						disabled={length === 0}
						onChange={(event) => {
							const next = Number(event.target.value);
							if (Number.isFinite(next)) clock.seek(next);
						}}
						className="w-[4.5rem] rounded-[0.3rem] border border-line bg-paper px-1.5 py-0.5 text-end text-ink"
					/>
					<span data-timestamp={clock.t}>
						/ {Math.round(length).toString()} ms
					</span>
				</label>
				<div className="flex items-center gap-1">
					<span className="me-1 text-[0.8rem] text-ink-muted">
						Loop between
					</span>
					<Button
						onClick={() =>
							clock.setRange({
								from: clock.t,
								to: clock.range?.to ?? length,
							})
						}
						disabled={length === 0}
						title="Loop from here"
					>
						In
					</Button>
					<Button
						onClick={() =>
							clock.setRange({
								from: clock.range?.from ?? 0,
								to: clock.t,
							})
						}
						disabled={length === 0}
						title="Loop up to here"
					>
						Out
					</Button>
					{clock.range ? (
						<>
							<span className="font-mono text-[0.72rem] text-ink-muted tabular-nums">
								{Math.round(clock.range.from).toString()}–
								{Math.round(clock.range.to).toString()} ms
							</span>
							<Button
								onClick={() => clock.setRange(null)}
								title="Loop the whole timeline again"
							>
								Clear
							</Button>
						</>
					) : null}
				</div>
				{isTap ? (
					<span className="font-mono text-[0.72rem] text-ink-muted">
						{cards[move.from]?.kind ?? "?"} →{" "}
						{cards[move.to]?.kind ?? "?"}
						{seeds.candidate ? " · retargeted" : ""}
					</span>
				) : null}
			</div>

			{isTap ? (
				<div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-line px-6 py-2">
					<Control
						label="Duration"
						value={spec.duration}
						baseline={SWAP.duration}
						min={80}
						max={1600}
						step={10}
						unit="ms"
						onChange={(duration) => tune({ duration })}
					/>
					<Control
						label="Peak enlargement"
						value={spec.peak * 100}
						baseline={SWAP.peak * 100}
						min={0}
						max={20}
						step={0.5}
						unit="%"
						onChange={(peak) => tune({ peak: peak / 100 })}
					/>
					<Control
						label="Peak timing"
						value={spec.peakAt * 100}
						baseline={SWAP.peakAt * 100}
						min={5}
						max={95}
						step={1}
						unit="%"
						onChange={(peakAt) => tune({ peakAt: peakAt / 100 })}
					/>
					<EaseControl
						label="Grow easing"
						value={spec.grow}
						baseline={SWAP.grow}
						onChange={(grow) => tune({ grow })}
					/>
					<EaseControl
						label="Settle easing"
						value={spec.settle}
						baseline={SWAP.settle}
						onChange={(settle) => tune({ settle })}
					/>
					<Button
						onClick={() => setSpec(SWAP)}
						disabled={!tuned}
						title="Back to the accepted Swap"
					>
						Reset all
					</Button>
					<Switch
						label="Compare with baseline"
						checked={compare}
						onChange={setCompare}
					/>
				</div>
			) : (
				<div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-line px-6 py-2">
					{knobs.includes("duration") ? (
						<Control
							label="Duration"
							value={params.duration}
							min={80}
							max={1600}
							step={10}
							unit="ms"
							onChange={(duration) => patch({ duration })}
						/>
					) : null}
					{knobs.includes("stiffness") ? (
						<Control
							label="Stiffness"
							value={params.stiffness}
							min={50}
							max={1500}
							step={10}
							onChange={(stiffness) => patch({ stiffness })}
						/>
					) : null}
					{knobs.includes("damping") ? (
						<Control
							label="Damping"
							value={params.damping}
							min={1}
							max={120}
							step={1}
							onChange={(damping) => patch({ damping })}
						/>
					) : null}
					{knobs.length === 0 ? (
						<span className="text-[0.8rem] text-ink-muted">
							These ship with fixed timings; the clock is the only
							knob.
						</span>
					) : (
						<Button onClick={() => setParams(DEFAULT_PARAMS)}>
							Reset
						</Button>
					)}
				</div>
			)}

			<div className="min-h-0 flex-1 overflow-auto p-6">
				{isTap ? (
					<div
						className={`grid gap-6 ${compare ? "grid-cols-[repeat(auto-fill,minmax(21rem,1fr))]" : "mx-auto max-w-[28rem]"}`}
					>
						<SwapTile
							kind="candidate"
							spec={spec}
							cards={cards}
							move={candidateMove}
							t={clock.t}
							frame={candidateFrame}
							tap={tap}
						/>
						{compare ? (
							<SwapTile
								kind="baseline"
								spec={SWAP}
								cards={cards}
								move={baselineMove}
								t={clock.t}
								frame={baselineFrame}
								tap={tap}
							/>
						) : null}
					</div>
				) : (
					<div className="grid grid-cols-[repeat(auto-fill,minmax(21rem,1fr))] gap-6">
						{group.scenes.map((scene) => (
							<SceneTile
								key={scene.key}
								scene={scene}
								t={clock.t}
								params={params}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
