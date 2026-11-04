import type { MotionValue } from "motion/react";
import { type Axis, type CollapseCurve, collapseOf } from "./swipe-gesture";
import type { Deck } from "./use-deck";

/** A swiped Card and the Deck behind it, driven from one value. */
export type Binding = {
	readonly lead: string;
	readonly axis: Axis;
	/** Unhooks the Cards where they are. */
	readonly stop: () => void;
	/** Unhooks them and sends each to its slot on a spring that keeps its speed. */
	readonly scatter: () => void;
};

/**
 * Drives `lead` and the Cards behind it from `pull`, the one source of
 * truth for a swipe. The Card sits `pull` px along `axis` from its slot;
 * the Cards behind move from their slots toward it by one shared share of
 * the collapse, so they fold in together and are whole exactly at the
 * threshold, where a release commits. They aim at the Card's drawn top
 * edge, so their last sliver goes under it at that moment and not before.
 * A spring on `pull` takes them all home; a hand on it scrubs them. Cards
 * in front of `lead` stay put: they could pass under it only by jumping in z.
 */
export function bindDeck(
	deck: Deck,
	lead: string,
	axis: Axis,
	pull: MotionValue<number>,
	rules: { readonly threshold: number; readonly curve: CollapseCurve },
): Binding {
	const index = deck.order.indexOf(lead);
	const home = deck.slotOf(lead);
	const card = deck.valuesOf(lead);
	const lift = home ? (home.h * home.s - home.h) / 2 : 0;
	const followers = deck.order
		.slice(0, Math.max(0, index))
		.flatMap((id, i) => {
			const slot = deck.slots[i];
			return slot ? [{ id, slot, values: deck.valuesOf(id) }] : [];
		});
	const update = (value: number) => {
		if (!home) return;
		const u = axis === "inline" ? home.u + value : home.u;
		const v = axis === "block" ? home.v + value : home.v;
		if (axis === "inline") card.u.set(u);
		else card.v.set(v);
		const share = collapseOf(axis, value, rules.threshold, rules.curve);
		for (const follower of followers) {
			const { slot, values } = follower;
			values.u.set(slot.u + (u - slot.u) * share);
			values.v.set(slot.v + (v - lift - slot.v) * share);
		}
	};
	const stop = pull.on("change", update);
	return {
		lead,
		axis,
		stop,
		scatter: () => {
			stop();
			if (home) void deck.place(lead, home);
			for (const follower of followers)
				void deck.place(follower.id, follower.slot);
		},
	};
}
