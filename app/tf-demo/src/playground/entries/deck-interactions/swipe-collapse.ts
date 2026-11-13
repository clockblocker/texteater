import {
	cancelFrame,
	frame,
	type MotionValue,
	motionValue,
} from "motion/react";
import { type Axis, type CollapseCurve, collapseOf } from "./swipe-gesture";
import type { Deck } from "./use-deck";

/** Where a pull of 0 puts the swiped Card: it moves on its way home. */
export type Anchor = {
	readonly u: MotionValue<number>;
	readonly v: MotionValue<number>;
};

/** A swiped Card and the Deck around it, driven from one value. */
export type Binding = {
	readonly lead: string;
	readonly axis: Axis;
	/** `pull` is measured from here: where the Card was when the hand took it, carried on to its slot. */
	readonly anchor: Anchor;
	/** Unhooks the Cards where they show. */
	readonly stop: () => void;
	/** Unhooks them and sends each to its slot, and the Deck to opaque, on a spring that keeps its speed. */
	readonly scatter: () => void;
};

/** Carries a base on to `to` from `velocity` (px/s), as the Deck's own settle would. */
export type Settle = (
	value: MotionValue<number>,
	to: number,
	velocity: number,
) => void;

const KEYS = ["u", "v", "s"] as const;

/** What a binding reads of the Deck and moves in it. */
type Pile = Pick<
	Deck,
	"order" | "slots" | "slotOf" | "valuesOf" | "release" | "place" | "opacity"
>;

/**
 * Drives `lead` and every other Card from `pull`, the one source of
 * truth for a swipe. Every Card keeps a base: its slot, or where it was
 * on its way there, handed on with its speed by `settle`. The Card sits
 * `pull` px along `axis` from its base, the anchor, so a Card the hand
 * took on its way home still gets there, and a pull of 0 puts it there. Toward Close
 * deck it is drawn from that base onto the Card by one shared share of
 * the collapse, so the Cards fold in together, never stop short to do
 * it, and are whole exactly at the threshold, where a release commits:
 * the ones behind come down onto it, the ones in front up. They aim at
 * the Card's drawn top edge, and none ends bigger than the Card. The
 * Deck's opacity, one layer for every Card, goes by the same share from
 * its own base, opaque or on its way there, to `opacity` at the
 * threshold.
 *
 * No Card's z-index moves: the ones behind go under the Card and the ones
 * in front over it, so the folded stack shows the front Card it showed
 * before. A spring on `pull` takes them all home; a hand on it scrubs
 * them.
 */
export function bindDeck(
	deck: Pile,
	lead: string,
	axis: Axis,
	pull: MotionValue<number>,
	rules: {
		readonly threshold: number;
		readonly curve: CollapseCurve;
		/** The Deck's opacity once it is whole. */
		readonly opacity: number;
		readonly settle: Settle;
	},
): Binding {
	const home = deck.slotOf(lead);
	const card = deck.valuesOf(lead);
	/* a value already at rest where it is going needs no spring to get
	   there: it stays a plain value at its place */
	const carry: Settle = (value, to, velocity) => {
		if (value.get() === to && Math.abs(velocity) < 0.01) return;
		rules.settle(value, to, velocity);
	};
	const lift = home ? (home.h * home.s - home.h) / 2 : 0;
	const anchor = {
		u: motionValue(card.u.get()),
		v: motionValue(card.v.get()),
	};
	if (home)
		for (const key of ["u", "v"] as const)
			carry(anchor[key], home[key], card[key].getVelocity());
	const followers = deck.order.flatMap((id, i) => {
		const slot = deck.slots[i];
		if (!slot || id === lead) return [];
		const values = deck.valuesOf(id);
		const base = {
			u: motionValue(values.u.get()),
			v: motionValue(values.v.get()),
			s: motionValue(values.s.get()),
		};
		for (const key of KEYS)
			carry(base[key], slot[key], values[key].getVelocity());
		/* where it ends, against the Card: never bigger, top edges level */
		const s = Math.min(slot.s, home?.s ?? 1);
		const dv = (slot.h * s - slot.h) / 2 - lift;
		return [{ id, slot, values, base, s, dv }];
	});
	const faded = motionValue(deck.opacity.get());
	carry(faded, 1, deck.opacity.getVelocity());
	/* The fold takes the other Cards from whatever moved them in its first
	   frame: a spring stopped there has drawn that frame and stops as it
	   is, while one stopped from the pointer event would draw once more,
	   there, a sliver before the frame. */
	let taken = false;
	const at = () => ({
		u: anchor.u.get() + (axis === "inline" ? pull.get() : 0),
		v: anchor.v.get() + (axis === "block" ? pull.get() : 0),
	});
	/* Draws the Card and the fold on Motion's frame loop, once a frame and
	   after the springs tick: a move of the hand in the frame it shows in,
	   a spring on the pull or on a base in its own. Motion measures a
	   value's speed between its last two writes, each timed by its frame,
	   or by the clock outside one. Drawn from the pointer event, a sliver
	   of a frame before the frame drew the bases settling, the fold's
	   speed was measured over that sliver: several times too high or
	   turned round, and the spring that takes the Deck on at a release
	   started from it. On the loop each write is a frame from the last, so
	   a value rewritten where it was reads as at rest, which it is. */
	/* The share last drawn, and whether a base or the fade has moved since:
	   a fold at 0 drawn again over bases standing still would only write
	   every other Card where it already is, every frame of a pull toward
	   Open or short of the fold. */
	let drawnShare = Number.NaN;
	let rebased = true;
	const draw = () => {
		if (!taken) {
			taken = true;
			for (const { values } of followers)
				for (const key of KEYS) values[key].stop();
			deck.opacity.stop();
		}
		const { u, v } = at();
		card.u.set(u);
		card.v.set(v);
		const share = collapseOf(
			axis,
			pull.get(),
			rules.threshold,
			rules.curve,
		);
		if (share === 0 && drawnShare === 0 && !rebased) return;
		drawnShare = share;
		rebased = false;
		for (const { values, base, s, dv } of followers) {
			const from = { u: base.u.get(), v: base.v.get(), s: base.s.get() };
			values.u.set(from.u + (u - from.u) * share);
			values.v.set(from.v + (v + dv - from.v) * share);
			values.s.set(from.s + (s - from.s) * share);
		}
		const from = faded.get();
		deck.opacity.set(from + (rules.opacity - from) * share);
	};
	const redraw = () => {
		frame.preRender(draw);
	};
	const rebase = () => {
		rebased = true;
		redraw();
	};
	const stops = [
		pull.on("change", redraw),
		anchor.u.on("change", redraw),
		anchor.v.on("change", redraw),
		faded.on("change", rebase),
		...followers.flatMap(({ base }) =>
			KEYS.map((key) => base[key].on("change", rebase)),
		),
	];
	const stop = () => {
		/* a move not drawn yet stays undrawn: what takes the Cards on next
		   starts from where they show */
		cancelFrame(draw);
		for (const unhook of stops) unhook();
		for (const { base } of followers)
			for (const key of KEYS) base[key].stop();
		anchor.u.stop();
		anchor.v.stop();
		faded.stop();
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
			rules.settle(deck.opacity, 1, deck.opacity.getVelocity());
		},
	};
}
