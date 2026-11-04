import { type MotionValue, motionValue } from "motion/react";
import { type Axis, type CollapseCurve, collapseOf } from "./swipe-gesture";
import type { Deck } from "./use-deck";

/** A swiped Card and the Deck behind it, driven from one value. */
export type Binding = {
	readonly lead: string;
	readonly axis: Axis;
	/** Where the Card was when the hand took it, hover lift and all: `pull` is measured from here. */
	readonly anchor: { readonly u: number; readonly v: number };
	/** Unhooks the Cards where they are. */
	readonly stop: () => void;
	/** Unhooks them and sends each to its slot on a spring that keeps its speed. */
	readonly scatter: () => void;
};

/** Carries a base on to `to` from `velocity` (px/s), as the hover's settle would. */
export type Settle = (
	value: MotionValue<number>,
	to: number,
	velocity: number,
) => void;

const KEYS = ["u", "v", "r"] as const;

/**
 * Drives `lead` and the Cards behind it from `pull`, the one source of
 * truth for a swipe. The Card sits `pull` px along `axis` from where the
 * hand took it. Each Card behind keeps a base: where it was, still
 * settling back from a hover the press turned off, handed on with its
 * speed by `settle`. It is drawn from that base toward the Card by one
 * shared share of the collapse, its lean unwinding as it goes, so the
 * Cards fold in together, never stop short to do it, and are whole
 * exactly at the threshold, where a release commits. They aim at the
 * Card's drawn top edge, so their last sliver goes under it at that
 * moment and not before. A spring on `pull` takes them all home; a hand
 * on it scrubs them. Cards in front of `lead` stay put: they could pass
 * under it only by jumping in z.
 */
export function bindDeck(
	deck: Deck,
	lead: string,
	axis: Axis,
	pull: MotionValue<number>,
	rules: {
		readonly threshold: number;
		readonly curve: CollapseCurve;
		readonly settle: Settle;
	},
): Binding {
	const index = deck.order.indexOf(lead);
	const home = deck.slotOf(lead);
	const card = deck.valuesOf(lead);
	const lift = home ? (home.h * home.s - home.h) / 2 : 0;
	const anchor = { u: card.u.get(), v: card.v.get() };
	const followers = deck.order
		.slice(0, Math.max(0, index))
		.flatMap((id, i) => {
			const slot = deck.slots[i];
			if (!slot) return [];
			const values = deck.valuesOf(id);
			const base = {
				u: motionValue(values.u.get()),
				v: motionValue(values.v.get()),
				r: motionValue(values.r.get()),
			};
			for (const key of KEYS) {
				const velocity = values[key].getVelocity();
				values[key].stop();
				rules.settle(base[key], slot[key], velocity);
			}
			return [{ id, slot, values, base }];
		});
	const at = () => ({
		u: axis === "inline" ? anchor.u + pull.get() : anchor.u,
		v: axis === "block" ? anchor.v + pull.get() : anchor.v,
	});
	const fold = () => {
		const { u, v } = at();
		const share = collapseOf(
			axis,
			pull.get(),
			rules.threshold,
			rules.curve,
		);
		for (const { values, base } of followers) {
			const from = { u: base.u.get(), v: base.v.get(), r: base.r.get() };
			values.u.set(from.u + (u - from.u) * share);
			values.v.set(from.v + (v - lift - from.v) * share);
			values.r.set(from.r * (1 - share));
		}
	};
	const stops = [
		pull.on("change", () => {
			const { u, v } = at();
			if (axis === "inline") card.u.set(u);
			else card.v.set(v);
			fold();
		}),
		...followers.flatMap(({ base }) =>
			KEYS.map((key) => base[key].on("change", fold)),
		),
	];
	const stop = () => {
		for (const unhook of stops) unhook();
		for (const { base } of followers)
			for (const key of KEYS) base[key].stop();
	};
	return {
		lead,
		axis,
		anchor,
		stop,
		scatter: () => {
			stop();
			deck.release(lead);
			if (home) void deck.place(lead, home);
			for (const follower of followers)
				void deck.place(follower.id, follower.slot);
		},
	};
}
