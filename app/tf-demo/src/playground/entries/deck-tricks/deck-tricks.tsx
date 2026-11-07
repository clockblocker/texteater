import { MotionConfig, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { CardView } from "../deck-interactions/card-view";
import type { MotionContext } from "../deck-interactions/motion-kit";
import {
	type ReducedMotion,
	TIME_SCALES,
	type TimeScale,
} from "../deck-interactions/settings-atoms";
import { Inspector, InspectorChoice, InspectorSection } from "../inspector";
import { PLAYING_CARD_SKIN, PlayingCardFace } from "./playing-card-face";
import { cardName, PLAYING_DECK } from "./playing-cards";
import { cardSize, useTrickDeck } from "./use-trick-deck";

const TITLE = "Deck tricks";

const button =
	"cursor-pointer rounded-md border border-line px-2 py-1 text-xs text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

type Actions = ReturnType<typeof useTrickDeck>["actions"];

/** The deck-of-cards entry's buttons, composed as it composes them. */
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

/* mounted bottom first, as the library mounts them, so that Cards of the
   same z-index stack as its do */
const MOUNT_ORDER = [...PLAYING_DECK].reverse();

/**
 * deck-of-cards' tricks, played by tf-demo's own Deck model: `useDeck`'s
 * Card values, `CardView` with the library's faces, and motion-kit's
 * deck-of-cards profile, on the library's felt. The surface shows only the
 * felt and the Cards; the tricks and the motion knobs are in the inspector
 * (playground ADR 0001).
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
	const { valuesOf, sideOf, actions, drag } = useTrickDeck(motion);
	const [size] = useState(cardSize);

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
										side={sideOf(card.id)}
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
						before it.
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
			</Inspector>
		</MotionConfig>
	);
}
