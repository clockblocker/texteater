import {
	ArrowLeftIcon,
	ChevronFirstIcon,
	ChevronLastIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	PauseIcon,
	PlayIcon,
	RotateCcwIcon,
} from "lucide-react";
import { type ReactNode, useMemo, useRef, useState } from "react";

import { type DummyNote, deckFor } from "../deck-models/dummy";
import { OPEN_SCALE } from "../deck-models/motion-spec";
import type { Entry } from "./catalog";
import { SPEEDS, useClock, useFit, useRemPx, useShortcuts } from "./clock";
import {
	Chip,
	IconButton,
	KeyframeTable,
	Knob,
	LABEL,
	Row,
	Scrubber,
	TextButton,
	Toggle,
	VALUE,
} from "./controls";
import { deriveKeyframes, type Keyframes } from "./keyframes";
import { DEFAULT_PARAMS, layoutFor, type Params } from "./motion";
import { Panel, Section } from "./panel";
import { Pile } from "./pile";
import type { AnyScene } from "./scene";
import { deckFrame } from "./swap";

/**
 * THE STAGE — one animation, alone, as large as the room allows.
 *
 * Everything you can turn lives in the floating panel, which starts hidden,
 * so the first thing the page shows is the motion itself. The clock owns
 * `t`; the specimen is a pure function of it, drawn with inline styles and
 * no CSS transitions, so a scrubbed instant is exactly what playback shows.
 */

const WORD = "noch";

/**
 * How far a specimen may be enlarged to fill the stage. Scenes are drawn
 * at the size they ship at, so past about a half again they stop looking
 * like the thing being measured.
 */
const MAX_FIT = 1.75;

type Nav = {
	readonly onBack: () => void;
	readonly onGo: (step: number) => void;
	readonly panelOpen: boolean;
	readonly onPanelOpenChange: (next: boolean) => void;
};

/* --------------------------------------------------------------- frame */

function Where({ where }: { where: Entry["where"] }) {
	return (
		<span
			data-where={where}
			className={`${LABEL} ${where === "main app" ? "text-link" : ""}`}
		>
			{where}
		</span>
	);
}

/**
 * The stage furniture: who this animation is and where it ships, the box
 * the specimen is fitted into, and the panel. Nothing else.
 */
function StageFrame({
	entry,
	nav,
	width,
	caveat,
	panel,
	children,
}: {
	entry: Entry;
	nav: Nav;
	/** The specimen's natural width in rem, before it is fitted. */
	width: number;
	caveat: string | null;
	panel: ReactNode;
	children: ReactNode;
}) {
	const box = useRef<HTMLDivElement>(null);
	const specimen = useRef<HTMLDivElement>(null);
	const scale = useFit(box, specimen, MAX_FIT);

	return (
		<div
			data-stage={entry.key}
			className="relative h-full min-h-0 overflow-hidden bg-canvas"
		>
			<header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-6 px-6 py-4">
				<div className="pointer-events-auto flex min-w-0 flex-col gap-1">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={nav.onBack}
							title="All animations · Esc"
							className="flex items-center gap-1.5 rounded-[0.3rem] font-mono text-[0.62rem] tracking-[0.06em] text-ink-muted uppercase hover:text-ink focus-visible:ring-2 focus-visible:ring-link focus-visible:outline-none"
						>
							<ArrowLeftIcon size={12} strokeWidth={1.75} />
							Animations
						</button>
						<span className="h-3 w-px bg-line" />
						<h1 className="truncate font-mono text-[0.72rem] font-bold tracking-[0.14em] text-ink uppercase">
							{entry.title}
						</h1>
						<IconButton
							icon={ChevronLeftIcon}
							label="Previous animation · ["
							onClick={() => nav.onGo(-1)}
						/>
						<IconButton
							icon={ChevronRightIcon}
							label="Next animation · ]"
							onClick={() => nav.onGo(1)}
						/>
					</div>
					<p className="truncate font-mono text-[0.62rem] text-ink-faint">
						{entry.source}
					</p>
					{caveat ? (
						<p
							data-caveat
							className="max-w-[28rem] font-mono text-[0.62rem] leading-snug text-destructive"
						>
							{caveat}
						</p>
					) : null}
				</div>
				<Where where={entry.where} />
			</header>

			{/* The panel keeps its own room: the specimen is fitted to what is
			    left of the stage, never covered by it. */}
			<div
				ref={box}
				className={`absolute start-6 top-[5.5rem] bottom-[5.5rem] grid place-items-center transition-[inset-inline-end] duration-200 ease-out ${nav.panelOpen ? "end-6 xl:end-[26.5rem]" : "end-6"}`}
			>
				<div style={{ transform: `scale(${scale.toFixed(3)})` }}>
					<div ref={specimen} style={{ width: `${width}rem` }}>
						{children}
					</div>
				</div>
			</div>

			<Panel
				open={nav.panelOpen}
				onOpenChange={nav.onPanelOpenChange}
				title="Controls"
			>
				{panel}
			</Panel>
		</div>
	);
}

/* ------------------------------------------------------------ transport */

type Clock = ReturnType<typeof useClock>;

function Transport({
	clock,
	length,
	keys,
}: {
	clock: Clock;
	length: number;
	keys: Keyframes["keys"];
}) {
	const previous = [...keys].reverse().find((key) => key.at < clock.t - 1e-6);
	const following = keys.find((key) => key.at > clock.t + 1e-6);
	return (
		<Section title="Transport">
			<div className="flex items-center gap-1.5">
				<IconButton
					icon={ChevronFirstIcon}
					label="Previous key"
					disabled={!previous}
					onClick={() => previous && clock.seek(previous.at)}
				/>
				<IconButton
					icon={ChevronLeftIcon}
					label="Back one frame · ←"
					disabled={clock.t <= 0}
					onClick={() => clock.step(-1)}
				/>
				<IconButton
					icon={clock.playing ? PauseIcon : PlayIcon}
					label={clock.playing ? "Pause · Space" : "Play · Space"}
					disabled={length === 0}
					onClick={() =>
						clock.playing ? clock.pause() : clock.play()
					}
				/>
				<IconButton
					icon={ChevronRightIcon}
					label="Forward one frame · →"
					disabled={clock.atEnd}
					onClick={() => clock.step(1)}
				/>
				<IconButton
					icon={ChevronLastIcon}
					label="Next key"
					disabled={!following}
					onClick={() => following && clock.seek(following.at)}
				/>
				<IconButton
					icon={RotateCcwIcon}
					label="Replay from the start"
					disabled={length === 0}
					onClick={clock.restart}
				/>
				<span data-timestamp={clock.t} className={`ms-auto ${VALUE}`}>
					{Math.round(clock.t).toString()} /{" "}
					{Math.round(length).toString()} ms
				</span>
			</div>
			<Scrubber
				t={clock.t}
				length={length}
				keys={keys}
				range={clock.range}
				onSeek={clock.seek}
			/>
			<Row label="Speed">
				{SPEEDS.map((option) => (
					<Chip
						key={option.label}
						pressed={clock.speed === option.value}
						onClick={() => clock.setSpeed(option.value)}
					>
						{option.label}
					</Chip>
				))}
				<span className="ms-auto">
					<Toggle
						label="repeat"
						checked={clock.loop}
						onChange={clock.setLoop}
					/>
				</span>
			</Row>
			<Row label="Loop">
				<TextButton
					title="Loop from here"
					disabled={length === 0}
					onClick={() =>
						clock.setRange({
							from: clock.t,
							to: clock.range?.to ?? length,
						})
					}
				>
					In
				</TextButton>
				<TextButton
					title="Loop up to here"
					disabled={length === 0}
					onClick={() =>
						clock.setRange({
							from: clock.range?.from ?? 0,
							to: clock.t,
						})
					}
				>
					Out
				</TextButton>
				{clock.range ? (
					<>
						<span className={VALUE}>
							{Math.round(clock.range.from).toString()}–
							{Math.round(clock.range.to).toString()}
						</span>
						<TextButton
							title="Loop the whole timeline again"
							onClick={() => clock.setRange(null)}
						>
							Clear
						</TextButton>
					</>
				) : (
					<span className="font-mono text-[0.62rem] text-ink-faint">
						whole timeline
					</span>
				)}
			</Row>
		</Section>
	);
}

function KeyframeSection({
	keyframes,
	t,
	onSeek,
}: {
	keyframes: Keyframes | null;
	t: number;
	onSeek: (t: number) => void;
}) {
	if (!keyframes) return null;
	return (
		<Section title="Keyframes">
			<KeyframeTable keyframes={keyframes} t={t} onSeek={onSeek} />
		</Section>
	);
}

/* ---------------------------------------------------------- scene stage */

function SceneStage({
	entry,
	scene,
	nav,
}: {
	entry: Entry;
	scene: AnyScene;
	nav: Nav;
}) {
	const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
	const length = scene.length(params);
	const clock = useClock(length);
	const frame = scene.frame(Math.min(clock.t, length), params);

	const keyframes = useMemo(
		() =>
			nav.panelOpen
				? deriveKeyframes((t) => scene.frame(t, params), length)
				: null,
		[nav.panelOpen, scene, params, length],
	);

	useShortcuts({
		toggle: () => (clock.playing ? clock.pause() : clock.play()),
		step: clock.step,
		go: nav.onGo,
		back: nav.onBack,
	});

	const patch = (part: Partial<Params>) =>
		setParams((current) => ({ ...current, ...part }));
	const tuned =
		params.duration !== DEFAULT_PARAMS.duration ||
		params.stiffness !== DEFAULT_PARAMS.stiffness ||
		params.damping !== DEFAULT_PARAMS.damping;

	return (
		<StageFrame
			entry={entry}
			nav={nav}
			width={26}
			caveat={scene.caveat?.(params) ?? null}
			panel={
				<>
					<Transport
						clock={clock}
						length={length}
						keys={keyframes?.keys ?? []}
					/>
					{entry.knobs.length > 0 ? (
						<Section title="Spring">
							{entry.knobs.includes("duration") ? (
								<Knob
									label="Duration"
									value={params.duration}
									baseline={DEFAULT_PARAMS.duration}
									min={80}
									max={1600}
									step={10}
									unit="ms"
									onChange={(duration) => patch({ duration })}
								/>
							) : null}
							{entry.knobs.includes("stiffness") ? (
								<Knob
									label="Stiffness"
									value={params.stiffness}
									baseline={DEFAULT_PARAMS.stiffness}
									min={50}
									max={1500}
									step={10}
									onChange={(stiffness) =>
										patch({ stiffness })
									}
								/>
							) : null}
							{entry.knobs.includes("damping") ? (
								<Knob
									label="Damping"
									value={params.damping}
									baseline={DEFAULT_PARAMS.damping}
									min={1}
									max={120}
									step={1}
									onChange={(damping) => patch({ damping })}
								/>
							) : null}
							<Row label="">
								<TextButton
									disabled={!tuned}
									title="Back to the shipped spring"
									onClick={() => setParams(DEFAULT_PARAMS)}
								>
									Reset all
								</TextButton>
							</Row>
						</Section>
					) : (
						<Section title="Knobs">
							<p className="font-mono text-[0.62rem] leading-snug text-ink-faint">
								Fixed timings. The clock is the only knob.
							</p>
						</Section>
					)}
					<KeyframeSection
						keyframes={keyframes}
						t={clock.t}
						onSeek={clock.seek}
					/>
				</>
			}
		>
			<scene.Render frame={frame} />
		</StageFrame>
	);
}

/* ----------------------------------------------------------- swap stage */

/**
 * The one entry with no clock. Swap does not animate: the deck rearranges
 * at once and the open Card simply rests larger, so there is no `t` to
 * scrub and no keyframe to list. What the stage is good for is the look of
 * it — tap a Card and see the arrangement it lands in.
 */
function SwapStage({ entry, nav }: { entry: Entry; nav: Nav }) {
	const px = useRemPx();
	const [cards] = useState<readonly DummyNote[]>(() =>
		[...deckFor(WORD)].reverse(),
	);
	const layout = useMemo(
		() => layoutFor(cards.length, px),
		[cards.length, px],
	);
	const bottom = cards.length - 1;
	const [open, setOpen] = useState(bottom);
	const frame = deckFrame(open, layout);

	useShortcuts({
		toggle: () => {},
		step: () => {},
		go: nav.onGo,
		back: nav.onBack,
	});

	return (
		<StageFrame
			entry={entry}
			nav={nav}
			width={27}
			caveat={null}
			panel={
				<>
					<Section title="Swap">
						<p className="font-mono text-[0.62rem] leading-snug text-ink-faint">
							Nothing here moves. The open Card rests{" "}
							{Math.round((OPEN_SCALE - 1) * 100).toString()} %
							larger than the rest, and a tap hands that over at
							once: no pulse, and no Heading sliding to its new
							edge.
						</p>
					</Section>
					<Section title="Deck">
						<Row label="Open">
							<span className={VALUE}>
								{cards[open]?.kind ?? "?"}
							</span>
						</Row>
						<Row label="">
							<TextButton
								disabled={open === bottom}
								title="Put the deck back to its starting arrangement"
								onClick={() => setOpen(bottom)}
							>
								Reset deck
							</TextButton>
						</Row>
					</Section>
				</>
			}
		>
			<div data-swap="candidate" data-swap-open={open}>
				<Pile cards={cards} frame={frame} tap={setOpen} />
			</div>
		</StageFrame>
	);
}

export function Stage({ entry, nav }: { entry: Entry; nav: Nav }) {
	return entry.scene ? (
		<SceneStage
			key={entry.key}
			entry={entry}
			scene={entry.scene}
			nav={nav}
		/>
	) : (
		<SwapStage key={entry.key} entry={entry} nav={nav} />
	);
}
