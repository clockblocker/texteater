import {
	DECK_OF_CARDS,
	type SpringSpec,
	type TweenSpec,
} from "../deck-interactions/motion-kit";

/** What the box and the parts ride: a spring, or a deck-of-cards tween. */
export type MoveFeel =
	| {
			readonly kind: "spring";
			readonly stiffness: number;
			readonly damping: number;
	  }
	| { readonly kind: "tween"; readonly ms: number };

/**
 * The whole open: the move, when the parts start it, the stagger after
 * it, and how the parts are moved and drawn.
 */
export type MorphFeel = {
	readonly move: MoveFeel;
	/** The face's parts start with the box, or once it has landed. */
	readonly parts: "with" | "after";
	/** ms between one Cover-only part and the next. */
	readonly stagger: number;
	/**
	 * What times the parts' move: the box's own progress (one clock, a FLIP
	 * measured in the box's own frame), or Motion's layout projection on
	 * its own animation beside the box's (two clocks, the first
	 * prototype's).
	 */
	readonly clock: "box" | "layout";
	/**
	 * When the box clock starts: on the frame after the one that paints the
	 * change of form, one frame in, or at the tap.
	 */
	readonly start: "painted" | "tap";
	/** Whether the box's values and the parts' offsets land on whole device pixels. */
	readonly snap: boolean;
	/** Where the lines and the Source contexts cross: the lines slide over, or the texts overlap. */
	readonly crossing: "over" | "through";
};

/** A move has landed once it stays within this share of its way. */
const LANDED = 0.05;
/** How long a Cover-only part takes to fade and rise in. */
export const REVEAL_MS = 220;
/** How far below its place a Cover-only part starts, in px. */
export const RISE_PX = 8;
/** The reduced open and close: a fade out, then one in, this long each. */
export const REDUCED_FADE_MS = 100;
/** Content one form has fades out this fast when the other form takes over. */
export const LEAVE_MS = 100;

/**
 * A move from 0 to 1 is done once it is this close and this slow (per
 * second): far finer than Motion's defaults for so small a range, which
 * would end a 550 px move up to 3 px short.
 */
export const PROGRESS_REST = { restDelta: 1e-4, restSpeed: 1e-3 } as const;

/** The move in motion-kit's terms; a tween runs on deck-of-cards' cubicInOut. */
export function moveSpec(move: MoveFeel): SpringSpec | TweenSpec {
	return move.kind === "spring"
		? { stiffness: move.stiffness, damping: move.damping }
		: { ms: move.ms, ease: DECK_OF_CARDS.ease };
}

/**
 * When `move` lands, in real-time ms: the moment after which it stays
 * within 5% of its way for good. A spring (mass 1, from rest) is stepped
 * 1 ms at a time; a tween's curve is read along its length.
 */
export function landingMs(move: MoveFeel, within = LANDED): number {
	if (move.kind === "tween") {
		const steps = 1000;
		let last = 0;
		for (let step = 0; step <= steps; step++) {
			const t = step / steps;
			if (Math.abs(1 - DECK_OF_CARDS.ease(t)) > within) last = t;
		}
		return Math.round(last * move.ms);
	}
	let x = 0;
	let velocity = 0;
	let last = 0;
	for (let ms = 1; ms <= 10_000; ms++) {
		const force = -move.stiffness * (x - 1) - move.damping * velocity;
		velocity += force / 1000;
		x += velocity / 1000;
		if (Math.abs(1 - x) > within) last = ms;
	}
	return last;
}

/**
 * When `move` has settled, in real-time ms: within 0.1% of its way for
 * good, past the slow tail a spring creeps along after it has landed.
 */
export function settledMs(move: MoveFeel): number {
	return landingMs(move, 0.001);
}

/**
 * When each part of an open starts, in real-time ms after the tap: the
 * parts with the box or once it has landed, and the Cover-only parts one
 * after another once the parts have landed in turn.
 */
export function openTimeline(
	feel: MorphFeel,
	coverOnly: number,
): { readonly partsAt: number; readonly revealAt: readonly number[] } {
	const landing = landingMs(feel.move);
	const partsAt = feel.parts === "with" ? 0 : landing;
	return {
		partsAt,
		revealAt: Array.from(
			{ length: coverOnly },
			(_, index) => partsAt + landing + index * feel.stagger,
		),
	};
}
