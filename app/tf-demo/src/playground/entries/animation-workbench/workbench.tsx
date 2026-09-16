import { useEffect, useRef, useState } from "react";
import type { EntryRoute } from "../../playground-router";
import { type DummyNote, deckFor } from "../deck-models/dummy";
import {
	DEFAULT_PARAMS,
	type Frame,
	layoutFor,
	type Move,
	moveLength,
	type Params,
	rest,
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
import { VARIANTS, type VariantSpec } from "./variants";

/**
 * ANIMATION WORKBENCH — every animation in tf-demo, frozen at any instant.
 *
 * The clock owns `t` and nothing else. Every tile evaluates its variant or
 * scene at that `t` with the shared parameters, so scrub, step, pause and
 * play show the same frame for the same timestamp, and a parameter change
 * redraws the frozen frame at once.
 *
 * Only animations in use are here, each labelled with where: the main app
 * or the playground prototypes. The first tab, Tap, is the deck tap; a tap
 * on a folded header in the pile is the move. The other tabs are the scenes
 * in `scenes/`: each is one shipped motion replayed from `t = 0`.
 */

const TAP_GROUP = "tap";
const TAP_KNOBS: readonly Knob[] = ["duration", "accent"];

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

type Clock = {
	readonly t: number;
	readonly playing: boolean;
	readonly speed: number;
	readonly loop: boolean;
};

/**
 * Advances `t` by real elapsed time × speed while playing, and stops (or
 * wraps) at `length`. Time is the only thing it touches.
 */
function useClock(length: number) {
	const [clock, setClock] = useState<Clock>({
		t: 0,
		playing: false,
		speed: 1,
		loop: false,
	});
	const lengthRef = useRef(length);
	lengthRef.current = length;

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
				const max = lengthRef.current;
				const next = current.t + dt;
				if (next < max) return { ...current, t: next };
				if (current.loop) return { ...current, t: next - max };
				return { ...current, t: max, playing: false };
			});
			handle = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(handle);
	}, [clock.playing, clock.speed]);

	const t = Math.min(clock.t, length);
	return {
		t,
		playing: clock.playing,
		speed: clock.speed,
		loop: clock.loop,
		atEnd: t >= length,
		seek: (next: number) =>
			setClock((c) => ({
				...c,
				t: Math.max(0, Math.min(lengthRef.current, next)),
				playing: false,
			})),
		play: () => setClock((c) => ({ ...c, playing: true })),
		pause: () => setClock((c) => ({ ...c, playing: false })),
		restart: () => setClock((c) => ({ ...c, t: 0, playing: true })),
		step: (frames: number) =>
			setClock((c) => ({
				...c,
				t: Math.max(
					0,
					Math.min(lengthRef.current, c.t + frames * FRAME_MS),
				),
				playing: false,
			})),
		setSpeed: (speed: number) => setClock((c) => ({ ...c, speed })),
		setLoop: (loop: boolean) => setClock((c) => ({ ...c, loop })),
	} as const;
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

function Slider({
	label,
	value,
	min,
	max,
	step,
	unit = "",
	onChange,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	unit?: string;
	onChange: (next: number) => void;
}) {
	return (
		<label className="flex items-center gap-3 text-[0.8rem] text-ink-soft">
			<span className="w-16 shrink-0">{label}</span>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(event) => onChange(Number(event.target.value))}
				className="w-32 accent-link"
			/>
			<span className="w-14 shrink-0 font-mono text-[0.72rem] text-ink-muted tabular-nums">
				{Number.isInteger(step) ? value.toString() : value.toFixed(2)}
				{unit}
			</span>
		</label>
	);
}

/* ----------------------------------------------------------------- tile */

function Tile({
	spec,
	cards,
	frame,
	tap,
}: {
	spec: VariantSpec;
	cards: readonly DummyNote[];
	frame: Frame;
	tap: (index: number) => void;
}) {
	return (
		<section
			data-variant={spec.key}
			className="flex flex-col gap-4 rounded-[0.7rem] border border-line p-4"
		>
			<div className="min-h-[5.5rem]">
				<div className="flex items-baseline justify-between gap-3">
					<h3 className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
						{spec.title}
					</h3>
					<WhereBadge where={spec.where} />
				</div>
				<p className="mt-1 text-[0.8rem] leading-snug text-ink-soft">
					{spec.blurb}
				</p>
				<p className="mt-1 truncate font-mono text-[0.62rem] text-ink-faint">
					{spec.source}
				</p>
			</div>
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
			<div className="min-h-[5.5rem]">
				<div className="flex items-baseline justify-between gap-3">
					<h3 className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
						{scene.title}
					</h3>
					<span className="flex shrink-0 items-baseline gap-2">
						<span className="font-mono text-[0.62rem] text-ink-faint tabular-nums">
							{Math.round(local).toString()} /{" "}
							{Math.round(length).toString()} ms
						</span>
						<WhereBadge where={scene.where} />
					</span>
				</div>
				<p className="mt-1 text-[0.8rem] leading-snug text-ink-soft">
					{scene.blurb}
				</p>
				<p className="mt-1 truncate font-mono text-[0.62rem] text-ink-faint">
					{scene.source}
				</p>
			</div>
			<scene.Render frame={frame} />
		</section>
	);
}

/* ------------------------------------------------------------ workbench */

type Seeds = Readonly<Record<string, Frame>>;

export function AnimationWorkbench({ route }: { route: EntryRoute }) {
	const px = useRemPx();
	const [cards] = useState(() => [...deckFor(WORD)].reverse());
	const layout = layoutFor(cards.length, px);
	const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
	const [move, setMove] = useState<Move>(() => rest(cards.length - 1));
	const [seeds, setSeeds] = useState<Seeds>({});

	// The tab is the URL: `/playground/animation-workbench/<group>`.
	const groupKey = route.segments[0] ?? TAP_GROUP;
	const group: SceneGroup | null =
		SCENE_GROUPS.find((g) => g.key === groupKey) ?? null;
	const isTap = group === null;
	const length = isTap
		? moveLength(move, params)
		: groupLength(group, params);
	const clock = useClock(length);
	const knobs: readonly Knob[] = isTap ? TAP_KNOBS : groupKnobs(group);

	function show(key: string) {
		if (key === groupKey) return;
		route.setSegments(key === TAP_GROUP ? [] : [key]);
		clock.restart();
	}

	const moveFor = (spec: VariantSpec): Move => {
		const seed = seeds[spec.key];
		return seed ? { ...move, seed } : move;
	};
	const frames = new Map(
		VARIANTS.map((spec) => [
			spec.key,
			spec.variant(moveFor(spec), clock.t, params, layout),
		]),
	);

	function begin(next: Move, inFlight: boolean) {
		if (inFlight) {
			const captured: Record<string, Frame> = {};
			for (const spec of VARIANTS) {
				const frame = frames.get(spec.key);
				if (frame) captured[spec.key] = frame;
			}
			setSeeds(captured);
		} else {
			setSeeds({});
		}
		setMove(next);
		clock.restart();
	}

	function tap(index: number) {
		const inFlight = !clock.atEnd;
		if (index === move.to && !inFlight) return;
		begin({ from: move.to, to: index }, inFlight);
	}

	function reverse() {
		begin({ from: move.to, to: move.from }, !clock.atEnd);
	}

	const patch = (part: Partial<Params>) =>
		setParams((current) => ({ ...current, ...part }));

	return (
		<div className="flex h-full min-h-0 flex-col">
			<header className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-line px-6 py-3">
				<div className="min-w-[14rem]">
					<h2 className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
						Animation workbench
					</h2>
					<p className="text-[0.8rem] text-ink-soft">
						{isTap
							? "The deck tap as it ships in Compass. Tap a folded header in the pile to play the move."
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
							onClick={clock.playing ? clock.pause : clock.play}
							disabled={
								length === 0 || (!clock.playing && clock.atEnd)
							}
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
							<Button
								onClick={reverse}
								disabled={move.from === move.to}
								title="Play the move the other way"
							>
								Reverse
							</Button>
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

			<div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-6 py-2">
				<Button
					onClick={() => clock.step(-1)}
					disabled={clock.t <= 0}
					title="Back one frame (1/60 s)"
				>
					‹
				</Button>
				<Button
					onClick={() => clock.step(1)}
					disabled={clock.atEnd}
					title="Forward one frame (1/60 s)"
				>
					›
				</Button>
				<input
					type="range"
					aria-label="Timeline"
					min={0}
					max={Math.max(1, length)}
					step="any"
					value={clock.t}
					disabled={length === 0}
					onChange={(event) => clock.seek(Number(event.target.value))}
					className="min-w-[16rem] flex-1 accent-link"
				/>
				<span
					data-timestamp={clock.t}
					className="w-[10rem] shrink-0 font-mono text-[0.72rem] text-ink-muted tabular-nums"
				>
					t = {Math.round(clock.t).toString().padStart(4, " ")} /{" "}
					{Math.round(length).toString()} ms
				</span>
				{isTap ? (
					<span className="font-mono text-[0.72rem] text-ink-muted">
						{cards[move.from]?.kind ?? "?"} →{" "}
						{cards[move.to]?.kind ?? "?"}
						{Object.keys(seeds).length > 0 ? " · retargeted" : ""}
					</span>
				) : null}
			</div>

			<div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-line px-6 py-2">
				{knobs.includes("duration") ? (
					<Slider
						label="Duration"
						value={params.duration}
						min={80}
						max={1600}
						step={10}
						unit=" ms"
						onChange={(duration) => patch({ duration })}
					/>
				) : null}
				{knobs.includes("accent") ? (
					<Slider
						label="Accent"
						value={params.accent}
						min={0}
						max={1}
						step={0.05}
						onChange={(accent) => patch({ accent })}
					/>
				) : null}
				{knobs.includes("stiffness") ? (
					<Slider
						label="Stiffness"
						value={params.stiffness}
						min={50}
						max={1500}
						step={10}
						onChange={(stiffness) => patch({ stiffness })}
					/>
				) : null}
				{knobs.includes("damping") ? (
					<Slider
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

			<div className="min-h-0 flex-1 overflow-auto p-6">
				<div className="grid grid-cols-[repeat(auto-fill,minmax(21rem,1fr))] gap-6">
					{isTap
						? VARIANTS.map((spec) => {
								const frame = frames.get(spec.key);
								if (!frame) return null;
								return (
									<Tile
										key={spec.key}
										spec={spec}
										cards={cards}
										frame={frame}
										tap={tap}
									/>
								);
							})
						: group.scenes.map((scene) => (
								<SceneTile
									key={scene.key}
									scene={scene}
									t={clock.t}
									params={params}
								/>
							))}
				</div>
			</div>
		</div>
	);
}
