import { memo } from "react";
import type { TurnFeel } from "tabletop/core";
import { Inspector, InspectorChoice, InspectorSection } from "../inspector";
import type { DeckActions } from "./use-deck-tricks";

const TITLE = "Deck tricks";

const button =
	"cursor-pointer rounded-md border border-line px-2 py-1 text-xs text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export type ReducedChoice = "system" | "on" | "off";
const TIME_SCALES = [0.25, 0.5, 1] as const;
export type TimeScale = (typeof TIME_SCALES)[number];

/** The buttons of deck-of-cards' `example/example.js`, composed as it composes them. */
const ACTIONS: readonly (readonly [string, (deck: DeckActions) => void])[] = [
	["Intro", (deck) => deck.intro()],
	["Flip", (deck) => deck.flip()],
	[
		"Shuffle",
		(deck) => {
			deck.shuffle();
			deck.shuffle();
		},
	],
	[
		"By suit",
		(deck) => {
			deck.sort(true);
			deck.bysuit();
		},
	],
	["Fan", (deck) => deck.fan()],
	[
		"Poker",
		(deck) => {
			deck.turnDown();
			deck.shuffle();
			deck.shuffle();
			deck.poker();
		},
	],
	["Sort", (deck) => deck.sort()],
];

/** The turn's knobs: its length (0 is the instant switch), perspective, lift and axis. */
const TURN_KNOBS = {
	ms: [0, 250, 300, 400],
	perspective: [300, 600, 1200],
	lift: [0, 0.06, 0.12],
} as const;

/**
 * The inspector: the tricks, the motion knobs and the turn's. It renders
 * again only when a knob changes, never for a move on the felt.
 */
export const DeckTricksInspector = memo(function DeckTricksInspector({
	actions,
	reducedMotion,
	onReducedMotion,
	timeScale,
	onTimeScale,
	turn,
	onTurn,
}: {
	readonly actions: DeckActions;
	readonly reducedMotion: ReducedChoice;
	readonly onReducedMotion: (value: ReducedChoice) => void;
	readonly timeScale: TimeScale;
	readonly onTimeScale: (value: TimeScale) => void;
	readonly turn: TurnFeel;
	readonly onTurn: (feel: TurnFeel) => void;
}) {
	return (
		<Inspector title={TITLE}>
			<InspectorSection>
				<p className="text-ink-soft">
					deck-of-cards' tricks on the tabletop battery, with the
					library's timings and ease curves: every Card rests in a CSS
					Slot on the felt and moves by offsets that decay to nothing.
					Each trick waits for the one before it. Drag a card to move
					it; tap it to turn it over. A turn is in 3D; under reduced
					motion the front fades instead.
				</p>
			</InspectorSection>
			<InspectorSection title="Deck">
				<div className="flex flex-wrap gap-1">
					{ACTIONS.map(([label, play]) => (
						<button
							key={label}
							type="button"
							className={button}
							onClick={() => play(actions)}
						>
							{label}
						</button>
					))}
				</div>
			</InspectorSection>
			<InspectorSection title="Motion">
				<InspectorChoice<ReducedChoice>
					label="Reduced motion"
					value={reducedMotion}
					options={[
						{ value: "system", label: "system" },
						{ value: "on", label: "on" },
						{ value: "off", label: "off" },
					]}
					onChange={onReducedMotion}
				/>
				<InspectorChoice<`${TimeScale}`>
					label="Slow-mo"
					value={`${timeScale}`}
					options={TIME_SCALES.map((scale) => ({
						value: `${scale}`,
						label: `${scale.toString()}×`,
					}))}
					onChange={(scale) =>
						onTimeScale(Number(scale) as TimeScale)
					}
				/>
			</InspectorSection>
			<InspectorSection title="Turn">
				<TurnKnobs feel={turn} onChange={onTurn} />
			</InspectorSection>
		</Inspector>
	);
});

/**
 * The turn's knobs. deck-of-cards switches a face at once, so the turn is
 * new: a tween on the library's curve, in its own perspective, swelling
 * toward edge on, about the Card's own axis so a fanned Card turns along
 * itself. "instant" is the library's switch, to compare against.
 */
function TurnKnobs({
	feel,
	onChange,
}: {
	readonly feel: TurnFeel;
	readonly onChange: (feel: TurnFeel) => void;
}) {
	return (
		<>
			<InspectorChoice
				label="Length"
				value={`${feel.ms}`}
				options={TURN_KNOBS.ms.map((ms) => ({
					value: `${ms}`,
					label: ms === 0 ? "instant" : `${ms} ms`,
				}))}
				onChange={(ms) => onChange({ ...feel, ms: Number(ms) })}
			/>
			<InspectorChoice
				label="Perspective"
				value={`${feel.perspective}`}
				options={TURN_KNOBS.perspective.map((px) => ({
					value: `${px}`,
					label: `${px} px`,
				}))}
				onChange={(px) =>
					onChange({ ...feel, perspective: Number(px) })
				}
			/>
			<InspectorChoice
				label="Lift at edge on"
				value={`${feel.lift}`}
				options={TURN_KNOBS.lift.map((lift) => ({
					value: `${lift}`,
					label: lift === 0 ? "none" : `${Math.round(lift * 100)}%`,
				}))}
				onChange={(lift) => onChange({ ...feel, lift: Number(lift) })}
			/>
			<InspectorChoice<TurnFeel["axis"]>
				label="Axis"
				value={feel.axis}
				options={[
					{ value: "y", label: "long (Y)" },
					{ value: "x", label: "short (X)" },
				]}
				onChange={(axis) => onChange({ ...feel, axis })}
			/>
		</>
	);
}
