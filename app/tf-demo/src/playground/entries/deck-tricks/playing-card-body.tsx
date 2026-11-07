import { memo, type PointerEvent, useMemo } from "react";
import type { Place } from "tabletop/core";
import { Body, Shell } from "tabletop/react";
import backUrl from "./faces/back.png";
import { cardName, isRed, type PlayingCard, rankLabel } from "./playing-cards";

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

/* each side as deck-of-cards' Card box draws it: white, 4 px corners, a 1 px
   shadow; the Shell turns both and hides the one facing away */
const SIDE = "rounded-[4px] bg-white shadow-[0_1px_1px_rgb(0_0_0/0.15)]";
const ART = "absolute inset-0 bg-size-[100%_100%] bg-center bg-no-repeat";

/* `css/card.styl`'s corner indices, at its rem sizes */
const CORNER =
	"absolute w-[0.55rem] text-center font-['Ubuntu_Condensed',sans-serif] text-[0.7rem] leading-[0.7rem] tracking-[-0.1rem] whitespace-pre-line";

function Front({ card }: { readonly card: PlayingCard }) {
	const rank = rankLabel(card);
	return (
		<div
			className={`${ART} ${isRed(card) ? "text-[#d40000]" : "text-black"}`}
			style={{ backgroundImage: `url("${FACES[card.id] ?? ""}")` }}
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
		</div>
	);
}

function Back() {
	return (
		<div className={ART} style={{ backgroundImage: `url("${backUrl}")` }} />
	);
}

function samePlace(a: Place, b: Place): boolean {
	return (
		a.slot === b.slot &&
		a.rotate === b.rotate &&
		a.z === b.z &&
		a.side === b.side &&
		a.scale === b.scale &&
		a.form === b.form
	);
}

/**
 * One playing Card as a Body on the felt, with the library's two sides in
 * the battery's Shell and its move cursor. It renders again only when its
 * own Place changes, and its sides never.
 */
export const PlayingCardBody = memo(
	function PlayingCardBody({
		card,
		place,
		onPress,
	}: {
		readonly card: PlayingCard;
		readonly place: Place;
		readonly onPress: (
			id: string,
			event: PointerEvent<HTMLElement>,
		) => void;
	}) {
		const sides = useMemo(
			() => ({ front: <Front card={card} />, back: <Back /> }),
			[card],
		);
		return (
			<Body
				id={card.id}
				place={place}
				data-slot={place.slot}
				role="img"
				aria-label={cardName(card)}
				className="cursor-move rounded-[4px] will-change-transform"
				onPointerDown={(event) => onPress(card.id, event)}
			>
				<Shell
					faceClassName={SIDE}
					front={sides.front}
					back={sides.back}
				/>
			</Body>
		);
	},
	(before, after) =>
		before.card === after.card &&
		before.onPress === after.onPress &&
		samePlace(before.place, after.place),
);
