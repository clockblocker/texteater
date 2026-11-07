import { DECK_OF_CARDS_EASE, EASE_OUT_QUINT, type Ease } from "./ease";

/** A spring in Motion's terms, mass 1. */
export type SpringSpec = {
	readonly stiffness: number;
	readonly damping: number;
};

/** A tween: its length in ms and its curve. */
export type TweenSpec = {
	readonly ms: number;
	readonly ease: Ease;
};

/**
 * The one set of springs. Copied from the playground's `motion-kit.ts` and
 * the workspace's `motion-spec.ts`, which keep their own until they move
 * onto the Table (#1318–#1320).
 */
export const SPRINGS = {
	/** Pick-up, put-back and a release that lands: response 0.25, ζ 1. */
	settle: { stiffness: 632, damping: 50 },
	/** A Deck reflowing around a Card that came or went: response 0.3, ζ 0.8. */
	reflow: { stiffness: 438, damping: 34 },
	/** A throw past an edge, the workspace's FLY_TRAVEL. */
	fly: { stiffness: 360, damping: 38 },
	/** A Card into its Cover and back, the workspace's MORPH. */
	morph: { stiffness: 380, damping: 38 },
	/**
	 * A tilt toward the pointer: response 0.36 s, ζ 0.98, so it follows
	 * without a wobble. The playground's lean keeps its springier 300/22.
	 */
	tilt: { stiffness: 300, damping: 34 },
	/** A pick-up that lands with a little give: response 0.25, ζ 0.65. */
	pop: { stiffness: 632, damping: 33 },
} as const satisfies Record<string, SpringSpec>;

/**
 * pakastin's deck-of-cards' motion: every app move a tween of fixed length
 * on that library's cubicInOut, unless it names another curve.
 */
export const DECK_OF_CARDS = {
	ease: DECK_OF_CARDS_EASE.cubicInOut,
	linear: DECK_OF_CARDS_EASE.linear,
	/** A move the app starts that names no length of its own. */
	move: { ms: 300, ease: DECK_OF_CARDS_EASE.cubicInOut },
} as const;

/** A turn over: deck-of-cards' curve over #1313's length. */
export const TURN_TWEEN: TweenSpec = { ms: 300, ease: DECK_OF_CARDS.ease };

/** Content only one form has, arriving after the move (the workspace's). */
export const ARRIVAL = {
	/** The fade itself, CLIP_FADE. */
	fade: { ms: 200, ease: EASE_OUT_QUINT },
	/** The beat between one arriving part and the next, CONTEXT_STAGGER. */
	staggerMs: 50,
	/** No part waits longer than this for its turn, CONTEXT_STAGGER_MAX. */
	staggerMaxMs: 200,
	/** How far through the box's move the first part starts. */
	cue: 0.7,
} as const;

/** A Card leaving for good: its fade ends the flight (FLY_FADE). */
export const FLIGHT = {
	travel: SPRINGS.fly,
	fade: { ms: 220, ease: DECK_OF_CARDS.linear },
	/** It turns this many degrees, the way it was thrown, on the way out. */
	turn: 12,
} as const;
