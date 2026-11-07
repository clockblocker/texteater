import { MotionConfig, motionValue, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { CardView } from "../deck-interactions/card-view";
import type { MotionContext } from "../deck-interactions/motion-kit";
import {
	type ReducedMotion,
	TIME_SCALES,
	type TimeScale,
} from "../deck-interactions/settings-atoms";
import { Inspector, InspectorChoice, InspectorSection } from "../inspector";
import { DEFAULT_TURN, type TurnFeel } from "./card-turn";
import { PLAYING_CARD_SKIN, PlayingCardFace } from "./playing-card-face";
import { cardName, PLAYING_DECK } from "./playing-cards";
import { cardSize, useTrickDeck } from "./use-trick-deck";

const TITLE = "Deck tricks";

const button =
	"cursor-pointer rounded-md border border-line px-2 py-1 text-xs text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

type Actions = ReturnType<typeof useTrickDeck>["actions"];

/** The buttons of deck-of-cards' `example/example.js`, composed as it composes them. */
const ACTIONS: readonly (readonly [string, (deck: Actions) => void])[] = [
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
	axis: ["y", "x"],
} as const satisfies { readonly [K in keyof TurnFeel]: readonly TurnFeel[K][] };

/* mounted bottom first, as the library mounts them, so that Cards of the
   same z-index stack as its do */
const MOUNT_ORDER = [...PLAYING_DECK].reverse();

/**
 * deck-of-cards' tricks, played by tf-demo's own Deck model: `useDeck`'s
 * Card values, `CardView` with the library's faces, and motion-kit's
 * deck-of-cards profile, on the library's felt. The surface shows only the
 * felt and the Cards; the tricks and the motion knobs are in the inspector
 * (playground ADR 0001).
 *
 * The tricks, faces and felt are pakastin's deck-of-cards
 * (github.com/deck-of-cards/deck-of-cards at 54f2c4787ea5). Its code is MIT;
 * the art in `faces/` is Chris Aguilar's Vector Playing Cards, LGPL-3.0
 * (`LICENSE`).
 */
export function DeckTricks() {
	const [reducedMotion, setReducedMotion] = useState<ReducedMotion>("off");
	const [timeScale, setTimeScale] = useState<TimeScale>(1);
	const system = useReducedMotion() ?? false;
	const reduce = reducedMotion === "system" ? system : reducedMotion === "on";
	const motion = useMemo<MotionContext>(
		() => ({ reduce, timeScale }),
		[reduce, timeScale],
	);
	const [turn, setTurn] = useState<TurnFeel>(DEFAULT_TURN);
	const { valuesOf, turnOf, actions, drag } = useTrickDeck(motion, turn);
	const [size] = useState(cardSize);
	/* what every Card's faces read their turn's look from, without a render */
	const [feel] = useState(() => motionValue({ turn, reduce }));
	useEffect(() => feel.set({ turn, reduce }), [feel, turn, reduce]);

	return (
		<MotionConfig reducedMotion="never">
			<div className="flex h-full min-h-0 p-6 lg:pe-[23rem]">
				<div
					data-deck-tricks=""
					data-reduced={reduce || undefined}
					className="relative min-h-[36rem] flex-1 touch-none overflow-hidden rounded-[0.7rem] border border-line bg-[hsl(150_40%_45%)] text-[#333] select-none"
				>
					<div className="absolute start-1/2 top-1/2">
						<div
							className="absolute"
							style={{ left: -size.w / 2, top: -size.h / 2 }}
						>
							{MOUNT_ORDER.map((card) => (
								<CardView
									key={card.id}
									id={card.id}
									label={cardName(card)}
									skin={PLAYING_CARD_SKIN}
									values={valuesOf(card.id)}
									rtl={false}
									held={false}
									expanded={false}
									mark={null}
									onPointerDown={(event) =>
										drag(card.id, event)
									}
								>
									<PlayingCardFace
										card={card}
										turn={turnOf(card.id)}
										feel={feel}
									/>
								</CardView>
							))}
						</div>
					</div>
				</div>
			</div>
			<Inspector title={TITLE}>
				<InspectorSection>
					<p className="text-ink-soft">
						deck-of-cards' tricks on tf-demo's own Deck model, with
						the library's timings and ease curves. Drag a card to
						move it; tap it to flip it. Each trick waits for the one
						before it. A flip turns the Card over; under reduced
						motion its front fades instead.
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
					<InspectorChoice<ReducedMotion>
						label="Reduced motion"
						value={reducedMotion}
						options={[
							{ value: "system", label: "system" },
							{ value: "on", label: "on" },
							{ value: "off", label: "off" },
						]}
						onChange={setReducedMotion}
					/>
					<InspectorChoice<`${TimeScale}`>
						label="Slow-mo"
						value={`${timeScale}`}
						options={TIME_SCALES.map((scale) => ({
							value: `${scale}`,
							label: `${scale.toString()}×`,
						}))}
						onChange={(scale) =>
							setTimeScale(Number(scale) as TimeScale)
						}
					/>
				</InspectorSection>
				<InspectorSection title="Turn">
					<TurnKnobs feel={turn} onChange={setTurn} />
				</InspectorSection>
			</Inspector>
		</MotionConfig>
	);
}

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
