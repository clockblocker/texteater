import {
	cancelFrame,
	frame,
	type MotionValue,
	motionValue,
} from "motion/react";
import { type Point, type Rect, union } from "./geometry";
import {
	type Axis,
	type CollapseCurve,
	collapseOf,
	forwardOf,
} from "./swipe-gesture";
import type { CardValues, Deck } from "./use-deck";

/** A swiped Card and the Deck around it, driven from one value. */
export type Binding = {
	readonly lead: string;
	readonly axis: Axis;
	/** Where the Card was when the hand took it: `pull` is measured from here. */
	readonly anchor: Point;
	/** Unhooks the Cards where they show. */
	readonly stop: () => void;
	/** Unhooks them and sends each to its slot on a spring that keeps its speed. */
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
	"order" | "slots" | "slotOf" | "valuesOf" | "release" | "place"
>;

/** A Card's box as drawn: scaled about its centre. */
function drawnBox(card: CardValues): Rect {
	const w = card.w.get();
	const h = card.h.get();
	const s = card.s.get();
	return {
		u: card.u.get() - (w * s - w) / 2,
		v: card.v.get() - (h * s - h) / 2,
		w: w * s,
		h: h * s,
	};
}

const px = (n: number) => `${n.toFixed(2)}px`;

/**
 * The mask of a Card coming forward: whole outside `cover`, the box the
 * Cards in front of it fill, and `shown` of itself inside it, so there
 * it dissolves in over them. Both boxes are as drawn, in the frame; the
 * mask is in the Card's own px, from its inline-start and top.
 */
export function veilOf(
	card: Rect,
	scale: number,
	cover: Rect,
	shown: number,
	rtl: boolean,
): string {
	if (shown <= 0 || shown >= 1) return "none";
	const top = (cover.v - card.v) / scale;
	const bottom = (cover.v + cover.h - card.v) / scale;
	const start = (cover.u - card.u) / scale;
	const end = (cover.u + cover.w - card.u) / scale;
	const ink = `rgb(0 0 0 / ${shown.toFixed(3)})`;
	return [
		`linear-gradient(to bottom, #000 ${px(top)}, transparent ${px(top)}, transparent ${px(bottom)}, #000 ${px(bottom)})`,
		`linear-gradient(${rtl ? "to left" : "to right"}, #000 ${px(start)}, transparent ${px(start)}, transparent ${px(end)}, #000 ${px(end)})`,
		`linear-gradient(${ink}, ${ink})`,
	].join(", ");
}

/**
 * Drives `lead` and every other Card from `pull`, the one source of
 * truth for a swipe. The Card sits `pull` px along `axis` from where the
 * hand took it. Each other Card keeps a base: its slot, or where it was
 * on its way there, handed on with its speed by `settle`. Toward Close
 * deck it is drawn from that base onto the Card by one shared share of
 * the collapse, so the Cards fold in together, never stop short to do
 * it, and are whole exactly at the threshold, where a release commits:
 * the ones behind come down onto it, the ones in front up. They aim at
 * the Card's drawn top edge, and none ends bigger than the Card, so
 * their last sliver goes under it at that moment and not before.
 *
 * The Cards in front lie over a Card from inside the Deck. Toward Close
 * deck it comes forward over them in `forward` px of pull: on top of
 * them at once, but where they lay over it, it dissolves in, so it never
 * pops through them, and toward Open, or home, it is under them again.
 * `shown` carries how far it has come, 1 for the front Card. A spring on
 * `pull` takes them all home; a hand on it scrubs them.
 */
export function bindDeck(
	deck: Pile,
	lead: string,
	axis: Axis,
	drive: {
		readonly pull: MotionValue<number>;
		readonly shown: MotionValue<number>;
	},
	rules: {
		readonly threshold: number;
		readonly curve: CollapseCurve;
		/** The pull, in px, over which a Card from inside the Deck comes forward. */
		readonly forward: number;
		readonly rtl: boolean;
		readonly settle: Settle;
	},
): Binding {
	const { pull, shown } = drive;
	const index = deck.order.indexOf(lead);
	const home = deck.slotOf(lead);
	const card = deck.valuesOf(lead);
	const lift = home ? (home.h * home.s - home.h) / 2 : 0;
	const anchor = { u: card.u.get(), v: card.v.get() };
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
			rules.settle(base[key], slot[key], values[key].getVelocity());
		/* where it ends, against the Card: never bigger, top edges level */
		const s = Math.min(slot.s, home?.s ?? 1);
		const dv = (slot.h * s - slot.h) / 2 - lift;
		return [{ id, slot, values, base, s, dv, ahead: i > index }];
	});
	const ahead = followers.filter((follower) => follower.ahead);
	const below = card.z.get();
	const above = Math.max(
		below,
		...followers.map(({ values }) => values.z.get() + 1),
	);
	const over = Math.min(rules.forward, rules.threshold);
	shown.jump(ahead.length > 0 ? 0 : 1);
	/* The fold takes the other Cards from whatever moved them in its first
	   frame: a spring stopped there has drawn that frame and stops as it
	   is, while one stopped from the pointer event would draw once more,
	   there, a sliver before the frame. */
	let taken = false;
	const at = () => ({
		u: axis === "inline" ? anchor.u + pull.get() : anchor.u,
		v: axis === "block" ? anchor.v + pull.get() : anchor.v,
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
	const draw = () => {
		if (!taken) {
			taken = true;
			for (const { values } of followers)
				for (const key of KEYS) values[key].stop();
		}
		const { u, v } = at();
		if (axis === "inline") card.u.set(u);
		else card.v.set(v);
		const share = collapseOf(
			axis,
			pull.get(),
			rules.threshold,
			rules.curve,
		);
		for (const { values, base, s, dv } of followers) {
			const from = { u: base.u.get(), v: base.v.get(), s: base.s.get() };
			values.u.set(from.u + (u - from.u) * share);
			values.v.set(from.v + (v + dv - from.v) * share);
			values.s.set(from.s + (s - from.s) * share);
		}
		if (ahead.length === 0) return;
		const forward = forwardOf(axis, pull.get(), over);
		shown.set(forward);
		card.z.set(forward > 0 ? above : below);
		const cover = union(ahead.map(({ values }) => drawnBox(values)));
		card.veil.set(
			cover
				? veilOf(
						drawnBox(card),
						card.s.get(),
						cover,
						forward,
						rules.rtl,
					)
				: "none",
		);
	};
	const redraw = () => {
		frame.preRender(draw);
	};
	const stops = [
		pull.on("change", redraw),
		...followers.flatMap(({ base }) =>
			KEYS.map((key) => base[key].on("change", redraw)),
		),
	];
	const stop = () => {
		/* a move not drawn yet stays undrawn: what takes the Cards on next
		   starts from where they show */
		cancelFrame(draw);
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
			card.z.set(below);
			card.veil.set("none");
			deck.release(lead);
			if (home) void deck.place(lead, home);
			for (const follower of followers)
				void deck.place(follower.id, follower.slot);
		},
	};
}
