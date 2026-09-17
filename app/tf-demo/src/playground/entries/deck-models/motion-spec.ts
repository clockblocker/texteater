/**
 * MOTION SPEC — every animation the Compass prototype runs, as data.
 *
 * This file is the single source of truth for the playground's motion. The
 * Compass prototype (`drag-deck.tsx`) turns a spec into a Motion
 * transition with `motionOf`; the Animation workbench evaluates the same
 * spec in closed form to draw a frame at `t`. Neither owns a duration, an
 * easing or a distance of its own, so the two cannot disagree: a change
 * here is the change in both.
 *
 * Nothing here imports React, the DOM or Motion. A spec is numbers and a
 * named curve, so the workbench's pure `frame(t)` and the prototype's live
 * `animate()` are two readings of one description.
 *
 * ## What lives here, and what does not
 *
 * Here: how long something takes, what curve it runs on, how far it
 * travels, and the pure functions that map a gesture to a transform.
 *
 * Not here: which element moves and when the move starts. That is
 * choreography, and it belongs to whoever owns the state — the prototype
 * for the live deck, the scene for the workbench.
 *
 * ## The one thing that is not a number
 *
 * `CONTEXT_ITEM` animates a Source Context's height to `auto` in the
 * prototype, because a context sentence wraps and only the DOM knows how
 * tall it ends up. The spec fixes its duration and curve; the workbench
 * scene stands in a one-line height for the preview. That is the single
 * place where the preview's geometry is a stand-in rather than the shipped
 * value, and it is marked at its use.
 */

/* ---------------------------------------------------------------- kinds */

/**
 * Motion's named tween easings. `motionOf` passes the name through
 * verbatim; the workbench maps it to the matching cubic bézier.
 */
export type Ease = "linear" | "easeIn" | "easeOut" | "easeInOut";

export type Tween = {
	readonly kind: "tween";
	/** The tween's own length, in ms, not counting `delayMs`. */
	readonly ms: number;
	readonly ease: Ease;
	/** Dead time before the tween starts, in ms. */
	readonly delayMs: number;
};

export type Spring = {
	readonly kind: "spring";
	readonly stiffness: number;
	readonly damping: number;
};

export type Spec = Tween | Spring;

/**
 * A tween. The default easing is `easeInOut` because that is what Motion
 * itself uses for a `{ duration }` transition with no `ease` — declaring
 * it keeps the spec honest rather than leaning on that default.
 */
export function tween(
	ms: number,
	ease: Ease = "easeInOut",
	delayMs = 0,
): Tween {
	return { kind: "tween", ms, ease, delayMs };
}

export function spring(stiffness: number, damping: number): Spring {
	return { kind: "spring", stiffness, damping };
}

/** The spec as Motion takes it, in seconds. */
export function motionOf(spec: Spec) {
	return spec.kind === "spring"
		? ({
				type: "spring",
				stiffness: spec.stiffness,
				damping: spec.damping,
			} as const)
		: ({
				duration: spec.ms / 1000,
				ease: spec.ease,
				...(spec.delayMs > 0 ? { delay: spec.delayMs / 1000 } : {}),
			} as const);
}

/** A tween's whole timeline, delay included, in ms. */
export function spanOf(spec: Tween): number {
	return spec.delayMs + spec.ms;
}

/* ------------------------------------------------------------- geometry */

/**
 * The deck column and the rows inside a Note, in rem. The prototype lays
 * out in rem strings and the workbench in px at a given root size, so both
 * read these and scale them themselves.
 */
export const CARD_WIDTH_REM = 26;
/** The whole column: the expanded Card plus one header row per folded Card. */
export const PILE_HEIGHT_REM = 30;
/** The Heading row as a Card, and the title inside it. */
export const HEADER_REM = 2.75;
export const CARD_TITLE_REM = 1;
/** The Heading row in Sheet form: the title grows and the kind label shows. */
export const SHEET_HEADER_REM = 4.25;
export const SHEET_TITLE_REM = 1.5;
/** The Pane bar above a Sheet: the trail and the collapse control. */
export const BAR_REM = 2.25;

/**
 * The open Card's resting scale: 5 % larger than the Cards behind it.
 *
 * A tap used to be marked with a pulse. It is not any more: the open Card
 * simply rests larger than the rest, so which Card is in front reads at a
 * glance instead of only in the moment of the tap.
 */
export const OPEN_SCALE = 1.05;

/* -------------------------------------------------------------- springs */

/**
 * MORPH — the spring a Note's box rides between forms.
 *
 * The prototype animates a Note's left, top, width and height on it
 * whenever the model hands the Note a new box (deck slot, Sheet box, or
 * the hand), and the Heading's row height and title size with it.
 */
export const MORPH = spring(380, 38);

/**
 * The drag spring: what a Held Card settles on when it snaps back, and
 * what the remove tilt rides.
 */
export const DRAG_SPRING = spring(520, 42);

/* --------------------------------------------------------- note tweens */

/** A Note fading in on mount, and out when it leaves. */
export const NOTE_ENTER = tween(160);
export const NOTE_EXIT = tween(120);
/** The Note's border colour following its arm state. */
export const NOTE_BORDER = tween(160);
/** The Card's clip gradient; a Sheet lifts it. */
export const CLIP_FADE = tween(200);

/** The Heading's kind label, shown in Sheet form only. */
export const KIND_LABEL = tween(160);
/** How far the kind label sits below its rest while hidden, px. */
export const KIND_LABEL_Y = 4;

/**
 * One Source Context unfolding. See the note at the top of this file: the
 * prototype animates this height to `auto`, so only the duration and curve
 * are shared.
 */
export const CONTEXT_ITEM = tween(160);

/** The Pane bar: Sheet chrome, arriving after the box and leaving first. */
export const BAR_ENTER = tween(160, "easeInOut", 180);
export const BAR_EXIT = tween(100);

/* --------------------------------------------------------- drag tweens */

/** A committed Remove: the Card leaves to the left and fades as it turns. */
export const FLY_TRAVEL = tween(220, "easeIn");
export const FLY_ROTATE = tween(220);
export const FLY_FADE = tween(220);
/** How far left it goes, px, and the angle it turns to on the way out. */
export const FLY_DISTANCE = 720;
export const FLY_ROTATE_TO = -28;

/** The arm label appears when the gesture arms, and firms up past commit. */
export const ARM_LABEL = tween(150);
/** The label as it arrives, while armed, and once past the commit line. */
export const ARM_LABEL_FROM = { opacity: 0, scale: 0.9 } as const;
export const ARM_LABEL_ARMED = { opacity: 0.55, scale: 0.96 } as const;
export const ARM_LABEL_COMMITTED = { opacity: 1, scale: 1 } as const;

/* ---------------------------------------------------------------- hold */

/** A press this long on a Sheet margin lifts it as a Held Card. */
export const LONG_PRESS_MS = 500;
/** The Sheet shrinks toward the finger over the whole press, then releases. */
export const HOLD_SHRINK = tween(LONG_PRESS_MS, "linear");
export const HOLD_RELEASE = tween(160);
export const HOLD_SCALE = 0.95;

/* ------------------------------------------------- gesture → transform */

/**
 * A Card armed for Remove leans with the pointer: one degree per 16 px of
 * travel, left only, and never past the angle it holds over the zone.
 */
export const TILT_MAX = -20;
const TILT_PER_PX = 1 / 16;

export function leanFor(dx: number): number {
	return Math.max(TILT_MAX, Math.min(0, dx * TILT_PER_PX));
}

/**
 * A Card armed for Open as sheet swells a little as it rises: up to 5 %
 * over 800 px, upward only.
 */
export const EXPAND_SCALE_MAX = 0.05;
const EXPAND_PER_PX = 1 / 800;

export function expandScaleFor(dy: number): number {
	return 1 + Math.max(0, Math.min(EXPAND_SCALE_MAX, -dy * EXPAND_PER_PX));
}
