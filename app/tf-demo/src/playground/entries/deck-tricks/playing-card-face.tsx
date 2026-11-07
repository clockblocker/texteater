import { type MotionValue, motion, useTransform } from "motion/react";
import type { CardSkin } from "../deck-interactions/card-view";
import {
	backTransform,
	frontOpacity,
	type TurnFeel,
	turnTransform,
} from "./card-turn";
import backUrl from "./faces/back.png";
import { isRed, type PlayingCard, rankLabel } from "./playing-cards";

/** deck-of-cards' face art, by file name: `<suit>_<rank>`. */
const FACES: Readonly<Record<string, string>> = Object.fromEntries(
	Object.entries(
		import.meta.glob<string>("./faces/*.svg", {
			eager: true,
			query: "?url",
			import: "default",
		}),
	).map(([path, url]) => [
		path.slice(path.lastIndexOf("/") + 1, -".svg".length),
		url,
	]),
);

/**
 * deck-of-cards' Card box: a move cursor and its own compositor layer, as
 * `will-change` gives it there. The box itself is bare: its white, its
 * 4 px corners and its 1 px shadow are on each side, which turn with it.
 */
export const PLAYING_CARD_SKIN: CardSkin = {
	box: "will-change-transform",
	grab: "cursor-move",
	shadow: () => "none",
};

/* one side of the Card, as deck-of-cards' Card box draws it */
const SIDE =
	"absolute inset-0 rounded-[4px] bg-white bg-size-[100%_100%] bg-center bg-no-repeat shadow-[0_1px_1px_rgb(0_0_0/0.15)] backface-hidden";

/* `css/card.styl`'s corner indices, at its rem sizes */
const CORNER =
	"absolute w-[0.55rem] text-center font-['Ubuntu_Condensed',sans-serif] text-[0.7rem] leading-[0.7rem] tracking-[-0.1rem] whitespace-pre-line";

/**
 * A playing Card's two sides, as deck-of-cards draws them: the face's art
 * stretched over the Card with its rank in two corners, and the back. Both
 * are drawn, back to back, on one element that `turn` turns about the
 * Card's axis; each hides when it faces away. Under reduced motion the
 * Card stays flat and the front fades over the back instead.
 */
export function PlayingCardFace({
	card,
	turn,
	feel,
}: {
	readonly card: PlayingCard;
	/** The Card's angle, 0 face up, 180 face down (`card-turn`). */
	readonly turn: MotionValue<number>;
	readonly feel: MotionValue<{
		readonly turn: TurnFeel;
		readonly reduce: boolean;
	}>;
}) {
	const transform = useTransform(() =>
		turnTransform(turn.get(), feel.get().turn, feel.get().reduce),
	);
	const back = useTransform(() =>
		backTransform(feel.get().turn, feel.get().reduce),
	);
	const opacity = useTransform(() =>
		frontOpacity(turn.get(), feel.get().reduce),
	);
	const rank = rankLabel(card);
	return (
		<motion.div
			data-card-turn=""
			className="absolute inset-0 transform-3d will-change-transform"
			style={{ transform }}
		>
			<motion.div
				data-side="back"
				className={SIDE}
				style={{
					transform: back,
					backgroundImage: `url("${backUrl}")`,
				}}
			/>
			<motion.div
				data-side="front"
				className={`${SIDE} ${isRed(card) ? "text-[#d40000]" : "text-black"}`}
				style={{
					opacity,
					backgroundImage: `url("${FACES[card.id] ?? ""}")`,
				}}
			>
				<span
					aria-hidden="true"
					className={`${CORNER} top-[0.15rem] left-0`}
				>
					{rank}
				</span>
				<span
					aria-hidden="true"
					className={`${CORNER} right-0 bottom-[0.1rem] rotate-180`}
				>
					{rank}
				</span>
			</motion.div>
		</motion.div>
	);
}
