import { DECK_OF_CARDS } from "tabletop/core";
import type { TableHandle } from "tabletop/react";
import type { DeckState, Role } from "./deck-plan";
import type { Feel } from "./knobs";

/**
 * How each Card moves when Proposed's Deck changes: a move the app starts
 * is a fixed tween on deck-of-cards' timing (#1309 Q2). Pure but for the
 * Slot it reads to deal a Card from the clicked word.
 */

type Moves = NonNullable<Parameters<TableHandle["transact"]>[1]>;
export type MoveStyle = NonNullable<
	ReturnType<Extract<Moves, (id: string) => unknown>>
>;

const MOVE = DECK_OF_CARDS.move;
/** A resting Card takes its new box on the tween. */
const TWEEN: MoveStyle = { source: "app", tween: MOVE };

/** How far above its rest a Card is dealt from, in px (#1316). */
const DEAL_RISE_PX = 96;
/**
 * How long after the Card behind it each Card of one deal starts: long
 * enough to read as one after another, short enough that four Cards have
 * landed inside half a second.
 */
const DEAL_STAGGER_MS = 60;

type Box = {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
};

/**
 * A deal: the Card comes in from above its rest, or grows out of the
 * clicked word, fading in, `nth` staggers after the first Card dealt.
 */
function dealStyle(nth: number, word: Box | null, slot: Box | null): MoveStyle {
	const from: Record<string, number> =
		word && slot
			? {
					x: word.x - slot.x,
					y: word.y - slot.y,
					width: word.width - slot.width,
					height: word.height - slot.height,
					opacity: -1,
				}
			: { y: -DEAL_RISE_PX, opacity: -1 };
	const at = nth * DEAL_STAGGER_MS;
	/* it is opaque by half-way, so no Card is seen through the one in front for long */
	const legOf = (channel: string) => [
		{ at, ms: channel === "opacity" ? MOVE.ms / 2 : MOVE.ms, to: 0 },
	];
	return {
		source: "app",
		tween: MOVE,
		from,
		path: Object.fromEntries(
			Object.keys(from).map((channel) => [channel, legOf(channel)]),
		),
	};
}

/** When the last Card of a deal of `count` lands, in ms after it starts. */
export function dealLandsAt(count: number): number {
	return Math.max(0, count - 1) * DEAL_STAGGER_MS + MOVE.ms;
}

/**
 * The style each Card of the Deck moves in as it goes from `before` to
 * `after`.
 *
 * - The first deal brings every Card in, back to front on the stagger.
 * - A Card that joins late is dealt in behind the pile the same way, or is
 *   simply where it rests, uncovered as the pile slides down off it. Under
 *   reduced motion the pile dissolves to its new place, so the Card that
 *   joins dissolves in with it.
 * - A front Card turning face up grows to its Note with the turn, or once
 *   the turn has landed.
 * - Every other Card takes its new box on the tween.
 */
export function deckMoves({
	before,
	after,
	feel,
	turnMs,
	word,
	reduced,
	slotOf,
}: {
	readonly before: DeckState | null;
	readonly after: DeckState;
	readonly feel: Pick<Feel, "dealFrom" | "lateJoin" | "becoming">;
	readonly turnMs: number;
	/** The clicked word's box, client px. */
	readonly word: Box | null;
	/** Reduced motion: every move is a dissolve. */
	readonly reduced: boolean;
	/** A Card's Slot, client px, read once the change is committed. */
	readonly slotOf: (role: Role) => Box | null;
}): (role: Role) => MoveStyle | undefined {
	const joining = after.cards.filter((role) => !before?.cards.includes(role));
	const turning = before !== null && after.faceUp && !before.faceUp;
	return (role) => {
		const nth = joining.indexOf(role);
		if (nth !== -1) {
			if (before !== null && feel.lateJoin === "uncovered" && !reduced)
				return undefined;
			const fromWord = feel.dealFrom === "word";
			return dealStyle(
				nth,
				fromWord ? word : null,
				fromWord ? slotOf(role) : null,
			);
		}
		if (turning && feel.becoming === "turn-then-grow")
			return {
				...TWEEN,
				path: { height: [{ at: turnMs, ms: MOVE.ms, to: 0 }] },
			};
		return TWEEN;
	};
}
