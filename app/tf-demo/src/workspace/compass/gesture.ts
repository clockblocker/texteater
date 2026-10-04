import type { MotionValue } from "motion/react";
import type {
	Box,
	Edge,
	HeldHome,
	Presentation,
	WritingDirection,
} from "react-resizable-panels/workspace";

/**
 * A gesture on a Note, and the arithmetic of a throw. Pure: no DOM, no
 * React; the hooks feed it pointer samples and read its answers.
 */

/** A Note's own motion values: its box, and the drag transforms on top. */
export type NoteHandle = {
	readonly left: MotionValue<number>;
	readonly top: MotionValue<number>;
	readonly width: MotionValue<number>;
	readonly height: MotionValue<number>;
	readonly x: MotionValue<number>;
	readonly y: MotionValue<number>;
	readonly rotate: MotionValue<number>;
	readonly opacity: MotionValue<number>;
};

/** Where letting go of the Held Card now would send it. */
export type Destination =
	/** The band over the Deck it rests in: back in its slot. */
	| { readonly kind: "return" }
	/** The Pane it was lifted out of: a drop here is a release in place. */
	| { readonly kind: "home"; readonly paneId: string }
	/** Anywhere else in a Pane: it opens there as a Cover. */
	| { readonly kind: "sheet"; readonly paneId: string }
	/** A Pane's side edge: a Floating Pane opens there, `size` px wide. */
	| {
			readonly kind: "pane";
			readonly paneId: string;
			readonly edge: Edge;
			readonly size: number;
	  };

export function sameDestination(
	a: Destination | null,
	b: Destination | null,
): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Where a gesture on a Note is. `pressed`: down, not yet past the slop,
 * so letting go is a tap. `swiping`: it started toward inline-start on a
 * Card on a Deck and moves the whole Deck until the finger lifts or pulls
 * the Card loose. `held`: the Card is in hand and goes where the pointer
 * says. Nothing changes phase on a timer.
 */
type Phase = "pressed" | "swiping" | "held";

/**
 * What letting go now does to the Card in hand, shown on the Card before
 * it is done: it opens somewhere, it goes back to rest, or it leaves.
 */
export type Fate = "open" | "rest" | "leave";

type Sample = { x: number; y: number; t: number };

export type Drag<S> = {
	readonly card: Presentation<S>;
	readonly h: NoteHandle;
	readonly pointerId: number;
	readonly start: Sample;
	/** The box the Note holds while in hand; its drag offset is on top. */
	readonly origin: Box;
	/** The Pane the gesture started in. */
	readonly paneId: string;
	/** The Deck the Note rests in, if it rests in one: its slot, and what a swipe sweeps. */
	readonly deckSheet: string | null;
	/** Where a release with nothing under it sends the Note; see `HeldHome`. */
	readonly home: HeldHome;
	phase: Phase;
	/** Lifted out of a Sheet or from nowhere, rather than picked off a Deck. */
	readonly lifted: boolean;
	/** Lifted from the keyboard: the arrow keys choose its destination. */
	readonly keyboard: boolean;
	v: { vx: number; vy: number };
	last: Sample;
	/** Where the hand was when `v` last took a reading. */
	sampled: Sample;
	/**
	 * A Card torn off a swipe sits this far from the finger, where the
	 * rubber band held it, and the gap closes on its own spring. `stop`
	 * ends the catch-up.
	 */
	gap: {
		readonly x: MotionValue<number>;
		readonly y: MotionValue<number>;
		readonly stop: () => void;
	} | null;
};

/** A press that has started a Lift: the pointer, and where it went down. */
export type Lift = {
	readonly pointerId: number;
	readonly x: number;
	readonly y: number;
};

/** The pointer id a keyboard Lift holds the Card by: no pointer has it. */
export const KEYBOARD_POINTER = -1;

/** A gesture that starts at a point and has not moved: velocity zero. */
export function freshDrag<S>(
	fields: Omit<Drag<S>, "start" | "v" | "last" | "sampled" | "gap"> & {
		readonly at: Sample;
	},
): Drag<S> {
	const { at, ...rest } = fields;
	return {
		...rest,
		start: at,
		v: { vx: 0, vy: 0 },
		last: { ...at },
		sampled: { ...at },
		gap: null,
	};
}

/* ---------------------------------------------------------------- throw */

export type ThrowTuning = {
	/** How long a sample window is before the speed takes a reading. */
	readonly sampleMs: number;
	/** A hand still this long has stopped: its speed is stale. */
	readonly staleMs: number;
	/** How far ahead a throw is carried on at the hand's speed. */
	readonly projectionMs: number;
	/** The speed along the main axis, in px/ms, past which a move is a flick. */
	readonly flickSpeed: number;
};

/**
 * Takes the pointer at (`x`, `y`) at `t` into the gesture: its speed, once
 * a sample window has passed, and where it last was. A hand that had
 * stopped starts its speed afresh: what it had before the pause is not
 * carried into the next move.
 */
export function sample<S>(
	d: Drag<S>,
	x: number,
	y: number,
	t: number,
	tuning: ThrowTuning,
): void {
	const span = t - d.sampled.t;
	if (span >= tuning.sampleMs) {
		const vx = (x - d.sampled.x) / span;
		const vy = (y - d.sampled.y) / span;
		const keep = t - d.last.t > tuning.staleMs ? 0 : 0.6;
		d.v = {
			vx: d.v.vx * keep + vx * (1 - keep),
			vy: d.v.vy * keep + vy * (1 - keep),
		};
		d.sampled = { x, y, t };
	}
	d.last = { x, y, t };
}

/**
 * Where the hand is headed: its travel so far, carried on at the speed
 * it is moving for `projectionMs`. A flick reads as the move it is the
 * start of, and a hand that has stopped carries nothing on.
 */
export function projected<S>(
	d: Drag<S>,
	now: number,
	tuning: ThrowTuning,
): { dx: number; dy: number } {
	const fresh = now - d.last.t <= tuning.staleMs;
	const { vx, vy } = fresh ? d.v : { vx: 0, vy: 0 };
	return {
		dx: d.last.x - d.start.x + vx * tuning.projectionMs,
		dy: d.last.y - d.start.y + vy * tuning.projectionMs,
	};
}

/** +1 where inline-start is to the left, -1 where it is to the right. */
export function inlineSign(direction: WritingDirection): 1 | -1 {
	return direction === "rtl" ? -1 : 1;
}

/**
 * Which way the hand is throwing along the line of text, if it is: its
 * speed along its main axis, while that speed is still fresh, past
 * `flickSpeed`. Toward inline-start is a Sweep's way.
 */
export function flickOf<S>(
	d: Drag<S>,
	now: number,
	tuning: ThrowTuning,
	direction: WritingDirection,
): "start" | "end" | null {
	if (now - d.last.t > tuning.staleMs) return null;
	const { vx, vy } = d.v;
	if (Math.abs(vx) < tuning.flickSpeed || Math.abs(vx) < Math.abs(vy))
		return null;
	return vx * inlineSign(direction) < 0 ? "start" : "end";
}

/* ----------------------------------------------------------------- fate */

/** What letting go of `drag` over `destination` does to its Card. */
export function fateOf<S>(
	drag: Drag<S>,
	destination: Destination | null,
): Fate {
	if (destination?.kind === "sheet" || destination?.kind === "pane")
		return "open";
	/* anywhere else it goes home, and for a Card from nowhere, or a Cover
	   on no live Deck, home is away */
	return drag.home === "close" || drag.home === "vanish" ? "leave" : "rest";
}

/** What a release in the held Card's own Pane does, as the zone says it. */
export function homeLabel<S>(drag: Drag<S>): string {
	switch (drag.home) {
		case "slot":
			return "Back on the Deck";
		case "close":
			return "Close";
		default:
			return "Back in place";
	}
}
