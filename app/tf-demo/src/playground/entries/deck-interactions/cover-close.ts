import { type CardMove, legsOf, poseOf } from "./card-move";
import { drawn, type Slot } from "./geometry";
import { TAP_LIFT } from "./tap-shuffle";

/**
 * The Cover's close as deck-of-cards' shuffle moves a Card (`modules/
 * shuffle` of github.com/deck-of-cards/deck-of-cards): two legs on
 * cubicInOut, with the restack hidden between them. In the first, the
 * Card shrinks from the Cover to its slot's size and scale and travels,
 * lifted above the whole Deck, to beside its slot: out along the inline
 * axis toward inline-end until it is clear of every Card. As the second
 * starts it takes its place in the stacking, which shows nowhere, since
 * it overlaps no Card, and it slides in under the Cards in front of it,
 * set down as it lands. The front Card has none in front of it: it goes
 * straight into its slot in one leg. The other Cards don't move. Its
 * legs are longer than deck-of-cards' 200 ms, made for 62 px Cards: the
 * first shrinks a Cover. Reduced, the Deck's player dissolves it. Pure:
 * the Deck's player plays it, from where the Card shows.
 */

/** The close's knobs: each leg's length and how clear of the Deck the first leg ends. */
export const CLOSE_DEFAULTS = {
	closeOutMs: 300,
	closeInMs: 260,
	closeGap: 16,
};
export type CloseKnobs = typeof CLOSE_DEFAULTS;

/** The close's inspector controls, to spread into a variant's knobs. */
export const CLOSE_KNOBS = [
	knob("closeOutMs", "Close leg out", 100, 800, 10, "ms"),
	knob("closeInMs", "Close leg in", 100, 800, 10, "ms"),
	knob("closeGap", "Close clear gap", 0, 64, 1, "px"),
] as const;

function knob<K extends keyof CloseKnobs>(
	key: K,
	label: string,
	min: number,
	max: number,
	step: number,
	unit: string,
) {
	return { kind: "number" as const, key, label, min, max, step, unit };
}

/** How high the Card rides on its way out: as high as a tapped Card does. */
export const CLOSE_LIFT = TAP_LIFT;

/**
 * Slot `index` of `slots`, moved toward inline-end until its drawn box is
 * `gap` px clear of every other slot's: where the close's first leg ends.
 */
export function besideOf(
	slots: readonly Slot[],
	index: number,
	gap: number,
): Slot | null {
	const slot = slots[index];
	if (!slot) return null;
	const others = slots.filter((_, at) => at !== index).map(drawn);
	if (others.length === 0) return slot;
	const edge = Math.max(...others.map((box) => box.u + box.w));
	const own = drawn(slot);
	return { ...slot, u: slot.u + edge + gap - own.u };
}

/**
 * The close that takes `id` from wherever it shows back into its place in
 * `order` (back to front) over a pile resting at `slots`: one move, or
 * null when `id` is not in the Deck.
 */
export function coverClose({
	order,
	id,
	slots,
	knobs,
}: {
	readonly order: readonly string[];
	readonly id: string;
	readonly slots: readonly Slot[];
	readonly knobs: CloseKnobs;
}): CardMove | null {
	const index = order.indexOf(id);
	const slot = slots[index];
	if (index < 0 || !slot) return null;
	const rest = poseOf(slot);
	const beside = besideOf(slots, index, knobs.closeGap);
	if (index === order.length - 1 || !beside)
		return {
			id,
			index,
			startMs: 0,
			reducedStartMs: 0,
			ms: knobs.closeOutMs,
			zAtMs: knobs.closeOutMs,
			lifted: true,
			legs: legsOf([{ at: 0, ms: knobs.closeOutMs, to: rest }]),
		};
	return {
		id,
		index,
		startMs: 0,
		reducedStartMs: 0,
		ms: knobs.closeOutMs + knobs.closeInMs,
		zAtMs: knobs.closeOutMs,
		lifted: true,
		legs: legsOf([
			{
				at: 0,
				ms: knobs.closeOutMs,
				to: { ...poseOf(beside), lift: CLOSE_LIFT },
			},
			{ at: knobs.closeOutMs, ms: knobs.closeInMs, to: rest },
		]),
	};
}
