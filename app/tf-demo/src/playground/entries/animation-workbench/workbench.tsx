import { useEffect, useRef, useState } from "react";

import { type DummyNote, deckFor } from "../deck-models/dummy";
import {
	DEFAULT_PARAMS,
	type Easing,
	type Frame,
	type Layout,
	layoutFor,
	type Move,
	moveLength,
	type Params,
	rest,
} from "./motion";
import { Pile } from "./pile";
import { VARIANTS, type VariantSpec, variantFrame } from "./variants";

/**
 * ANIMATION WORKBENCH — one deck rearrangement, every way we might draw it,
 * frozen at any instant.
 *
 * The clock owns `t` and nothing else. Every tile evaluates its variant at
 * that `t` with the shared parameters, so scrub, step, pause and play show
 * the same frame for the same timestamp, and a parameter change redraws
 * the frozen frame at once.
 */

const WORD = "noch";
const FRAME_MS = 1000 / 60;

const SPEEDS: readonly { readonly label: string; readonly value: number }[] = [
	{ label: "1×", value: 1 },
	{ label: "½×", value: 0.5 },
	{ label: "¼×", value: 0.25 },
	{ label: "⅛×", value: 0.125 },
];

const EASINGS: readonly Easing[] = ["spring", "easeOut", "easeInOut", "linear"];

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
	layout,
	tap,
}: {
	spec: VariantSpec;
	cards: readonly DummyNote[];
	frame: Frame;
	layout: Layout;
	tap: (index: number) => void;
}) {
	return (
		<section
			data-variant={spec.key}
			className="flex flex-col gap-4 rounded-[0.7rem] border border-line p-4"
		>
			<div className="min-h-[4.5rem]">
				<h3 className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
					{spec.title}
				</h3>
				<p className="mt-1 text-[0.8rem] leading-snug text-ink-soft">
					{spec.blurb}
				</p>
			</div>
			<Pile cards={cards} frame={frame} layout={layout} tap={tap} />
		</section>
	);
}

/* ------------------------------------------------------------ workbench */

type Seeds = Readonly<Record<string, Frame>>;

export function AnimationWorkbench() {
	const px = useRemPx();
	const [cards] = useState(() => [...deckFor(WORD)].reverse());
	const layout = layoutFor(cards.length, px);
	const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
	const [move, setMove] = useState<Move>(() => rest(cards.length - 1));
	const [seeds, setSeeds] = useState<Seeds>({});
	const length = moveLength(move, params, cards.length);
	const clock = useClock(length);

	const moveFor = (spec: VariantSpec): Move => {
		const seed = seeds[spec.key];
		return seed ? { ...move, seed } : move;
	};
	const frames = new Map(
		VARIANTS.map((spec) => [
			spec.key,
			variantFrame(spec, moveFor(spec), clock.t, params, layout),
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
						Tap a folded header in any pile. Every pile plays the
						same move on the same clock.
					</p>
				</div>
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
						<Button
							onClick={reverse}
							disabled={move.from === move.to}
							title="Play the move the other way"
						>
							Reverse
						</Button>
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
				<span className="font-mono text-[0.72rem] text-ink-muted">
					{cards[move.from]?.kind ?? "?"} →{" "}
					{cards[move.to]?.kind ?? "?"}
					{Object.keys(seeds).length > 0 ? " · retargeted" : ""}
				</span>
			</div>

			<div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-line px-6 py-2">
				<Slider
					label="Duration"
					value={params.duration}
					min={80}
					max={1600}
					step={10}
					unit=" ms"
					onChange={(duration) => patch({ duration })}
				/>
				<fieldset className="flex items-center gap-1">
					<legend className="sr-only">Easing</legend>
					<span className="me-1 text-[0.8rem] text-ink-muted">
						Easing
					</span>
					{EASINGS.map((easing) => (
						<Chip
							key={easing}
							pressed={params.easing === easing}
							onClick={() => patch({ easing })}
						>
							{easing}
						</Chip>
					))}
				</fieldset>
				<Slider
					label="Bounce"
					value={params.bounce}
					min={0}
					max={0.9}
					step={0.05}
					onChange={(bounce) => patch({ bounce })}
				/>
				<Slider
					label="Stagger"
					value={params.stagger}
					min={0}
					max={160}
					step={5}
					unit=" ms"
					onChange={(stagger) => patch({ stagger })}
				/>
				<Slider
					label="Accent"
					value={params.accent}
					min={0}
					max={1}
					step={0.05}
					onChange={(accent) => patch({ accent })}
				/>
				<Button onClick={() => setParams(DEFAULT_PARAMS)}>Reset</Button>
			</div>

			<div className="min-h-0 flex-1 overflow-auto p-6">
				<div className="grid grid-cols-[repeat(auto-fill,minmax(21rem,1fr))] gap-6">
					{VARIANTS.map((spec) => {
						const frame = frames.get(spec.key);
						if (!frame) return null;
						return (
							<Tile
								key={spec.key}
								spec={spec}
								cards={cards}
								frame={frame}
								layout={layout}
								tap={tap}
							/>
						);
					})}
				</div>
			</div>
		</div>
	);
}
