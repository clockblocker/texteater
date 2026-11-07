/** Which side of a Card shows. */
export type Side = "front" | "back";

/**
 * One of the 52, numbered as deck-of-cards numbers its Cards: `i` is
 * suit × 13 + rank − 1, suit 0 spades, 1 hearts, 2 clubs, 3 diamonds, and
 * the id names its face, `faces/<suit>_<rank>.svg`.
 */
export type PlayingCard = {
	readonly id: string;
	readonly i: number;
	readonly rank: number;
	readonly suit: number;
};

export const PLAYING_DECK: readonly PlayingCard[] = Array.from(
	{ length: 52 },
	(_, i) => {
		const rank = (i % 13) + 1;
		const suit = Math.floor(i / 13);
		return { id: `${suit}_${rank}`, i, rank, suit };
	},
);

const SUITS = ["spades", "hearts", "clubs", "diamonds"] as const;
const RANKS = [
	"",
	"A",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	"10",
	"J",
	"Q",
	"K",
] as const;

/** The corner index: A, 2–10, J, Q or K. */
export function rankLabel(card: PlayingCard): string {
	return RANKS[card.rank] ?? "";
}

/** Whether the suit is printed red, as hearts and diamonds are. */
export function isRed(card: PlayingCard): boolean {
	return card.suit === 1 || card.suit === 3;
}

export function cardName(card: PlayingCard): string {
	return `${rankLabel(card)} of ${SUITS[card.suit] ?? ""}`;
}
