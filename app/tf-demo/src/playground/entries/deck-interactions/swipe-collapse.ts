import { type Axis, type CollapseCurve, collapseOf } from "./swipe-gesture";
import type { Deck } from "./use-deck";

/** The rest of the Deck gathering into a swiped Card. */
export type Collapse = {
	readonly lead: string;
	readonly axis: Axis;
	/** Unhooks the Cards where they are. */
	readonly stop: () => void;
	/** Unhooks them and sends each to its slot on a spring that keeps its speed. */
	readonly scatter: () => void;
};

/**
 * Hooks the Cards behind `lead` to its position. All of them move from
 * their slots toward wherever the swiped Card is now, by one shared
 * fraction, so they fold in together and sit under it once the pull
 * reaches the detent. Driven by the
 * Card's own values, the hand scrubs it both ways, and a Card springing
 * back takes them home with it. Cards in front of `lead` stay put: they
 * could pass under it only by jumping in z.
 */
export function gatherInto(
	deck: Deck,
	lead: string,
	axis: Axis,
	rules: {
		readonly detent: number;
		readonly curve: CollapseCurve;
	},
): Collapse {
	const index = deck.order.indexOf(lead);
	const home = deck.slotOf(lead);
	const card = deck.valuesOf(lead);
	const followers = deck.order
		.slice(0, Math.max(0, index))
		.flatMap((id, i) => {
			const slot = deck.slots[i];
			return slot ? [{ id, slot, values: deck.valuesOf(id) }] : [];
		});
	const update = () => {
		if (!home) return;
		const u = card.u.get();
		const v = card.v.get();
		const pull = axis === "inline" ? u - home.u : v - home.v;
		const collapse = collapseOf(axis, pull, rules.detent, rules.curve);
		for (const follower of followers) {
			const share = collapse;
			follower.values.u.set(
				follower.slot.u + (u - follower.slot.u) * share,
			);
			follower.values.v.set(
				follower.slot.v + (v - follower.slot.v) * share,
			);
		}
	};
	const stops = [card.u.on("change", update), card.v.on("change", update)];
	const stop = () => {
		for (const unhook of stops) unhook();
	};
	return {
		lead,
		axis,
		stop,
		scatter: () => {
			stop();
			for (const follower of followers)
				void deck.place(follower.id, follower.slot);
		},
	};
}
