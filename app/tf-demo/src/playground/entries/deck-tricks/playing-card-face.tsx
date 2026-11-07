import { type MotionValue, motion, useTransform } from "motion/react";
import type { CardSkin } from "../deck-interactions/card-view";
import backUrl from "./faces/back.png";
import { isRed, type PlayingCard, rankLabel, type Side } from "./playing-cards";

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
 * deck-of-cards' Card box: white, 4 px corners, a 1 px shadow, a move
 * cursor, and its own compositor layer, as `will-change` gives it there.
 */
export const PLAYING_CARD_SKIN: CardSkin = {
	box: "rounded-[4px] bg-white will-change-transform",
	grab: "cursor-move",
	shadow: () => "0 1px 1px rgb(0 0 0 / 0.15)",
};

/* `css/card.styl`'s corner indices, at its rem sizes */
const CORNER =
	"absolute w-[0.55rem] text-center font-['Ubuntu_Condensed',sans-serif] text-[0.7rem] leading-[0.7rem] tracking-[-0.1rem] whitespace-pre-line";

/**
 * A playing Card's two sides, as deck-of-cards draws them: the face's art
 * stretched over the Card with its rank in two corners, or the back.
 * `side` shows one and hides the other without a render.
 */
export function PlayingCardFace({
	card,
	side,
}: {
	readonly card: PlayingCard;
	readonly side: MotionValue<Side>;
}) {
	const front = useTransform(side, (s) => (s === "front" ? "block" : "none"));
	const back = useTransform(side, (s) => (s === "back" ? "block" : "none"));
	const rank = rankLabel(card);
	return (
		<>
			<motion.div
				data-side="front"
				className={`h-full bg-size-[100%_100%] bg-center bg-no-repeat ${isRed(card) ? "text-[#d40000]" : "text-black"}`}
				style={{
					display: front,
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
			<motion.div
				data-side="back"
				className="absolute inset-0 bg-size-[100%_100%] bg-center bg-no-repeat"
				style={{ display: back, backgroundImage: `url("${backUrl}")` }}
			/>
		</>
	);
}
