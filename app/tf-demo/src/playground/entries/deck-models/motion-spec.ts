/**
 * Default motion for the live deck runtime. Both playgrounds render that
 * runtime; the workbench injects overrides through runtime-config.tsx.
 * Durations are milliseconds here and seconds at the Motion boundary.
 */

/* ---------------------------------------------------------------- kinds */

/**
 * A tween's curve: one of Motion's named easings, or a cubic bézier given
 * outright. `motionOf` passes either through verbatim — Motion takes a
 * four-number array as `ease`. Both playgrounds use this same adapter.
 *
 * Prefer a bézier. Motion's named curves are the browser's built-ins, and
 * those are too weak to read as deliberate: `easeOut` is
 * `cubic-bezier(0, 0, 0.58, 1)`, which barely leans. The named ones are
 * kept for `linear`, and for comparing against a built-in on purpose.
 */
export type Bezier = readonly [number, number, number, number];
export type Ease = "linear" | "easeIn" | "easeOut" | "easeInOut" | Bezier;

/**
 * The curves this playground animates on.
 *
 * `EASE_OUT` is the default and the one to reach for: almost everything
 * here enters or leaves, and a curve that starts fast spends its slow half
 * where nobody is looking. `EASE_IN_OUT` is for something that moves from
 * one place on screen to another — nothing does yet; the springs carry
 * that. `EASE_COLOUR` is the browser's own `ease`, which is what a colour
 * change wants.
 */
export function isBezier(ease: Ease): ease is Bezier {
	return typeof ease !== "string";
}

export const EASE_OUT: Bezier = [0.23, 1, 0.32, 1];
export const EASE_IN_OUT: Bezier = [0.77, 0, 0.175, 1];
export const EASE_COLOUR: Bezier = [0.25, 0.1, 0.25, 1];

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
	/**
	 * Start from rest rather than from whatever velocity the value is
	 * carrying. Motion hands a spring the value's current velocity by
	 * default, which is what makes a flicked thing keep going — and what
	 * makes it cross its target and come back. A return that may not
	 * wobble has to start still, however fast the hand let go.
	 */
	readonly fromRest: boolean;
};

export type Spec = Tween | Spring;

/**
 * A tween. The default is `EASE_OUT`, because every tween in this file
 * enters or leaves and none of them moves across the screen. It used to be
 * Motion's own `easeInOut` default, which put a slow start on nine
 * animations that wanted a fast one — the first half of
 * `cubic-bezier(0.42, 0, 0.58, 1)` is an ease-in.
 */
export function tween(ms: number, ease: Ease = EASE_OUT, delayMs = 0): Tween {
	return { kind: "tween", ms, ease, delayMs };
}

export function spring(
	stiffness: number,
	damping: number,
	fromRest = false,
): Spring {
	return { kind: "spring", stiffness, damping, fromRest };
}

/** The spec as Motion takes it, in seconds. */
export function motionOf(spec: Spec) {
	return spec.kind === "spring"
		? ({
				type: "spring",
				stiffness: spec.stiffness,
				damping: spec.damping,
				...(spec.fromRest ? { velocity: 0 } : {}),
			} as const)
		: ({
				duration: spec.ms / 1000,
				/* Motion mutates nothing, but its type wants a plain
				   four-tuple rather than our readonly one */
				ease: isBezier(spec.ease)
					? ([...spec.ease] as [number, number, number, number])
					: spec.ease,
				...(spec.delayMs > 0 ? { delay: spec.delayMs / 1000 } : {}),
			} as const);
}

/** A tween's whole timeline, delay included, in ms. */
export function spanOf(spec: Tween): number {
	return spec.delayMs + spec.ms;
}

/* ------------------------------------------------------------- geometry */

/**
 * The deck column and the rows inside a Note, in rem. The shared runtime lays
 * out in rem strings and measures boxes in pixels at the current root size.
 */
export const CARD_WIDTH_REM = 26;
/** The whole column: the expanded Card plus one header row per folded Card. */
export const PILE_HEIGHT_REM = 30;
/** The Heading row as a Card. */
export const HEADER_REM = 2.75;
/** The Pane bar above a Sheet: the trail and the ← or X control. */
export const BAR_REM = 2.25;
/**
 * A Card lifted from a Link or a Segment, or a Text lifted off its Ground,
 * rests in no Deck; this is the box it is held in.
 */
export const LOOSE_CARD_REM = 18;

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
 *
 * It has no bounce and no momentum. 520/36 put it at ζ ≈ 0.79, on the
 * reading that a release is the one gesture where bounce belongs — but
 * the Card comes home into a Deck it has to line up with, and a Card that
 * crosses its slot and comes back reads as a thing that missed. Damping
 * 50 against stiffness 620 is ζ ≈ 1.004: it arrives and stops, in about
 * 265 ms. `fromRest` drops the flick's velocity on top of that, so a
 * Card thrown at the Deck cannot carry itself past the slot either.
 *
 * This is the one place in the file that gives up a spring's best
 * property on purpose. Nothing else here is dragged, so nothing else
 * had velocity to hand on.
 */
export const DRAG_SPRING = spring(620, 50, true);

/**
 * How long the prototype waits for a settling animation before it treats
 * the gesture as over and tears the drag state down.
 *
 * This is a ceiling on `DRAG_SPRING`, and the reason it lives here rather
 * than in `drag-deck.tsx`: a spring softer than `DRAG_SPRING` can outlast
 * it. The same timeout applies to both playgrounds.
 *
 * `DRAG_SPRING` settles at 368 ms from rest and 379 ms after a hard flick,
 * so this leaves about 70 ms of margin. It was 400, which the softer
 * damping would have left almost nothing of.
 */
export const SETTLE_TIMEOUT_MS = 450;

/* --------------------------------------------------------- note tweens */

/*
 * A Note does not fade in when it is dealt, and does not fade out when it
 * is swept: a tap on a word puts four Cards on the page at once, and the
 * ones they replace are gone in the same frame. There is no spec for it
 * because there is no animation in it.
 */

/** The Note's border colour following its arm state: a colour, so `ease`. */
export const NOTE_BORDER = tween(160, EASE_COLOUR);
/** The Card's clip gradient; a Sheet lifts it. */
export const CLIP_FADE = tween(200);

/** Card selection changes the Heading's edge immediately; variants may add a slide. */
export const HEADING_EDGE = tween(0);

/**
 * One Source Context unfolding. The
 * runtime animates this height to `auto`, measured from the actual content.
 *
 * Height is a layout property and there is no way around it here: an
 * unfolding list has to push what is under it down, so `clip-path` would
 * composite beautifully and leave the Body where it was. The rule against
 * animating layout gives way to the thing the animation is for.
 */
export const CONTEXT_ITEM = tween(160);

/** How many Source Contexts arrive at once when a Sheet loads a page. */
export const CONTEXT_PAGE = 5;

/**
 * The beat between one arriving Source Context and the next.
 *
 * They used to arrive on identical timing, which is a group landing as one
 * flat event rather than as a group. 50 ms is the middle of the 30–80 ms a
 * stagger wants: under 30 it is indistinguishable from simultaneous, over
 * 80 the last item feels late.
 *
 * The cap is what keeps a long page from becoming a cascade. At 50 ms the
 * fifth item starts at 200 ms and is done at 360 ms, and nothing may start
 * later than that however many arrive — a stagger is decoration, and
 * decoration does not get to run the clock.
 */
export const CONTEXT_STAGGER = 50;
export const CONTEXT_STAGGER_MAX = 200;

/** How long the `nth` arriving Source Context waits its turn, in ms. */
export function contextDelayFor(nth: number): number {
	return Math.min(CONTEXT_STAGGER_MAX, Math.max(0, nth) * CONTEXT_STAGGER);
}

/** `spec` with `delayMs` replaced: the same tween, waiting its turn. */
export function after(spec: Tween, delayMs: number): Tween {
	return { ...spec, delayMs };
}

/**
 * A bar's words: the Pane bar's trail, and the Heading's face as it turns
 * between a Card's title and a Cover's ← and label. They arrive after the
 * box has started and leave first; the row that holds them never fades.
 */
export const BAR_ENTER = tween(160, EASE_OUT, 180);
export const BAR_EXIT = tween(100);
/**
 * A Cover's Heading changing height in place, with no change of form: the
 * tall Heading folding to a bar once its body scrolls, or a switch of the
 * Heading's design. A change of form still rides `MORPH` with the box.
 */
export const HEADING_RESIZE = tween(200);

/* --------------------------------------------------------- drag tweens */

/**
 * A committed Remove: the Card leaves to the left and fades as it turns.
 *
 * The travel used to be an `easeIn`, on the reading that a thing thrown
 * away accelerates. What it actually did was stop the Card dead at the
 * frame the finger let go — the gesture that commits a Remove is a flick,
 * so the Card is already moving fast when this starts, and a slow start
 * throws that away. See the note on `flyAway` in `drag-deck.tsx`: the
 * flick's measured velocity still is not handed on.
 */
export const FLY_TRAVEL = tween(220);
export const FLY_ROTATE = tween(220);
export const FLY_FADE = tween(220);
/** How far left it goes, px, and the angle it turns to on the way out. */
export const FLY_DISTANCE = 720;
export const FLY_ROTATE_TO = -28;

/**
 * A Card in hand that a release would lose (one from nowhere, or a Cover
 * on no live Deck, over nowhere to open) dims to this, on `LEAVING`, so
 * the loss shows before it happens. Half is still plainly the Card.
 */
export const LEAVING_OPACITY = 0.5;
export const LEAVING = tween(160);

/**
 * How far ahead of the hand a release reads, in ms of its current speed.
 * A flick is the start of a move, so a release is read where the move was
 * going: a Card flicked up opens, a Deck flicked left is swept. The
 * preview reads the same projection, so neither can surprise the other.
 */
export const THROW_PROJECTION_MS = 160;

/* ---------------------------------------------------------------- hold */

/**
 * The long press on a Rooted Pane's bar that lifts its Ground content
 * (issue 480: about one second). Everything else lifts by a plain drag of
 * its bar; the Ground is the main thing, and moving it should not happen
 * by accident.
 */
export const GROUND_PRESS_MS = 1000;
/** The bar lets go of its press shrink on this. */
export const HOLD_RELEASE = tween(160);

/* ------------------------------------------------- gesture → transform */

/**
 * A swiped Deck leans with the pointer: one degree per 16 px of travel,
 * left only, and never past `TILT_MAX`.
 */
export const TILT_MAX = -20;
const TILT_PER_PX = 1 / 16;

export function leanFor(
	dx: number,
	max = TILT_MAX,
	perPx = TILT_PER_PX,
): number {
	return Math.max(max, Math.min(0, dx * perPx));
}

/* ----------------------------------------------------------- deck swipe */

/**
 * A Deck swiped left moves as one thing. The Card under the finger leads
 * and every other Card follows at a share of its travel, a little less
 * for each Card further from it, so the whole Deck trails after the hand
 * rather than one Card leaving it.
 *
 * It does not fade while it goes. Each Card is its own layer, so a Deck
 * at partial opacity shows every Card behind through the one in front.
 */
export const DECK_FOLLOW = 0.9;
export const DECK_FOLLOW_FALLOFF = 0.12;
/** No Card trails at less than this share, however deep in the Deck. */
const DECK_FOLLOW_MIN = 0.5;

/** The share of the lead Card's travel a Card `distance` ranks away follows at. */
export function deckFollowFor(
	distance: number,
	follow = DECK_FOLLOW,
	falloff = DECK_FOLLOW_FALLOFF,
): number {
	return Math.max(DECK_FOLLOW_MIN, follow - falloff * (distance - 1));
}

/**
 * What the trailing Cards ride to their share. Their lag behind the lead
 * Card is the follow-through: the Deck has weight, the hand is pulling it.
 * No `fromRest`: the target moves every frame and each retarget has to
 * keep the speed it already has.
 */
export const DECK_FOLLOW_SPRING = spring(700, 45);

/**
 * The give in a swipe pulled right, or off its axis: the Deck moves a
 * little and resists more the further it is pulled, and never goes past
 * `SWIPE_RUBBER_PX`. The curve is iOS's scroll overshoot.
 */
export const SWIPE_RUBBER_PX = 40;

export function rubberBand(d: number, limit = SWIPE_RUBBER_PX): number {
	return Math.sign(d) * limit * (1 - 1 / ((Math.abs(d) / limit) * 0.55 + 1));
}

/**
 * How far the finger may pull off the swipe, up, down or back right past
 * where it started, before the Card tears loose: the Deck springs back
 * without it and the Card is in hand, a plain drag. A distance, not a
 * wait, so the way out of a swipe is a move the reader makes.
 */
export const SWIPE_BREAK_PX = 48;

/**
 * The torn-off Card catching up to the finger from where the rubber band
 * held it: quick, and short of any overshoot, since a Card that passes
 * the finger reads as thrown rather than let go.
 */
export const TEAR_CATCH_UP = spring(900, 55);
