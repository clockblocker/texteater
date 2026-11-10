import { CARD_WIDTH_REM, DECK_TOP_REM, HEADER_REM } from "compass";
import { type Place, place, type SlotSpec } from "tabletop/core";
import { ROLES, type Role } from "./deck-plan";

/**
 * Proposed's scene, pure: where each Card of a click's Deck rests in the
 * Pane, as Slots and Places. The Deck stands where the app's does: one
 * column, each Card a Heading row below the one behind it, the front Card
 * last and on top. Unlike the app's, the front Card is as tall as its
 * Note, and a Card behind is no taller than its Heading row and the edge
 * the next Card covers, so nothing but the front Card ever resizes.
 */

/** The one Region: the Pane the text is read in. */
export const PANE = "pane";

/** A face-down Card's height: room for the clicked words. */
const BACK_REM = 9;
/** The air the Deck keeps under its foot, inside its Pane. */
const FOOT_REM = 1;
/** How far a Card behind reaches under the Card in front of it. */
const TUCK_REM = 1;

export type DeckLayout = {
	/** Names the Deck: a click's own. */
	readonly id: string;
	/** Its Cards, back to front. */
	readonly cards: readonly Role[];
	/** Whether the front Card shows its face. */
	readonly faceUp: boolean;
	/** The front Card's Note, as tall as it lays out, in px. */
	readonly noteHeight: number | null;
};

export function bodyId(deck: string, role: Role): string {
	return `${deck}:${role}`;
}

function slotId(deck: string, role: Role): string {
	return `${PANE}:${bodyId(deck, role)}`;
}

const WIDTH = `min(${CARD_WIDTH_REM}rem, 100% - 2rem)`;

/**
 * Every Slot of the Deck. The front Card is its Note's height face up and
 * a small back face down, and never passes the Pane's foot; each Card
 * behind is its Heading row, tucked under the next Card.
 */
export function deckSlots({
	id,
	cards,
	faceUp,
	noteHeight,
}: DeckLayout): SlotSpec[] {
	const last = cards.length - 1;
	const front =
		faceUp && noteHeight !== null ? `${noteHeight}px` : `${BACK_REM}rem`;
	return cards.map((role, index) => {
		const top = DECK_TOP_REM + index * HEADER_REM;
		return {
			id: slotId(id, role),
			region: PANE,
			style: {
				insetInlineStart: `calc((100% - ${WIDTH}) / 2)`,
				top: `${top}rem`,
				width: WIDTH,
				height:
					index === last
						? `max(${HEADER_REM}rem, min(${front}, 100% - ${top + FOOT_REM}rem))`
						: `${HEADER_REM + TUCK_REM}rem`,
			},
		};
	});
}

/**
 * Where each Card rests: stacked back to front, the front Card face down
 * until it turns. A Card's stacking order is its role's rank, whichever
 * Cards the Deck holds, so one that joins late is behind the Cards in
 * front of it from its first frame and no Card ever changes order.
 */
export function deckPlaces({
	id,
	cards,
	faceUp,
}: DeckLayout): Map<string, Place> {
	return new Map(
		cards.map((role) => [
			bodyId(id, role),
			place(slotId(id, role), {
				z: ROLES.indexOf(role) + 1,
				side: role === "Reading" && !faceUp ? "back" : "front",
			}),
		]),
	);
}
