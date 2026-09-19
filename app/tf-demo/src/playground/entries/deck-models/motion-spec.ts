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
/** The Heading row as a Card, and the title inside it. */
export const HEADER_REM = 2.75;
export const CARD_TITLE_REM = 1;
/** The Heading row in Sheet form: the title grows and the kind label shows. */
export const SHEET_HEADER_REM = 4.25;
export const SHEET_TITLE_REM = 1.5;
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

/* ----------------------------------------------------------- snap back */

/**
 * How a cancelled drag rejoins the Deck.
 *
 * A Held Card is drawn over the whole Deck (z 40), and the Deck is a
 * stack: every Card but the front one is covered down to its Heading row
 * by the Card in front of it. So the frame on which a returning Card gets
 * its resting z back is a visible event — the Deck closes over it. These
 * models differ in when that frame is, and in what the Card does to earn
 * it.
 *
 * - `under` is the one the Deck runs. It gives the Card its resting z
 *   back at the release, so the Card travels home beneath the Cards that
 *   overlap it and nothing at all happens on arrival: there is no moment
 *   left for the Deck to close in, because it never opened.
 * - `lifted` is what the prototype shipped with, kept to compare against:
 *   the stack is restored when the gesture tears down, which is
 *   `SETTLE_TIMEOUT_MS` after the release rather than the moment of
 *   arrival. The Card is home at ~220 ms, floats over the Deck for
 *   another ~230, and the stack then closes in one frame. Nothing about
 *   that frame is motion, so it reads as a teleport.
 * - `land` keeps the Card over the Deck while it travels and restores the
 *   stack at `SNAP_LAND_PX` from the slot — the same event as `lifted`,
 *   moved onto the frame the motion ends, where the arrival hides it.
 * - `quick` is `land` on `SNAP_RETURN` rather than the drag spring: a
 *   cancelled gesture is a refusal, and a refusal is answered at once.
 * - `setdown` is `land` with the lift made visible: the Card rises off
 *   the Deck when the drag arms and descends onto it as it arrives, so
 *   the Deck closing over it is the end of a movement rather than a
 *   change of z.
 */
export const SNAP_BACK_MODELS = [
	"lifted",
	"under",
	"land",
	"quick",
	"setdown",
] as const;
export type SnapBackModel = (typeof SNAP_BACK_MODELS)[number];

/**
 * The `quick` model's return.
 *
 * 200 ms is the middle of what a drawer gets and the top of what a
 * dropdown gets, and this is smaller than either: the Card is already
 * near its slot, and the gesture it answers has been refused.
 */
export const SNAP_RETURN = tween(200);

/** How near its slot a returning Card has to be to rejoin the stack, px. */
export const SNAP_LAND_PX = 6;

/**
 * The `setdown` model's lift: how far the Card rises off the Deck while
 * it is in hand, as a fraction of its own size, and the tween it rises on.
 * It descends on the drag spring instead, so the landing and the descent
 * are one event.
 */
export const LIFT_SCALE = 0.04;
export const LIFT = tween(140);

/**
 * The lift's shadow at height `lift`, 0 → 1. A Card on the Deck has no
 * shadow at all rather than a shadow of no size: the models that never
 * lift should not hand the compositor one to think about.
 */
export function liftShadow(lift: number): string {
	return lift <= 0
		? "none"
		: `0 ${(lift * 18).toFixed(1)}px ${(lift * 32).toFixed(1)}px rgba(0, 0, 0, ${(lift * 0.34).toFixed(3)})`;
}

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

/** The Heading's kind label, shown in Sheet form only. */
export const KIND_LABEL = tween(160);
/** How far the kind label sits below its rest while hidden, px. */
export const KIND_LABEL_Y = 4;

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

/** The Pane bar: Sheet chrome, arriving after the box and leaving first. */
export const BAR_ENTER = tween(160, EASE_OUT, 180);
export const BAR_EXIT = tween(100);

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

/** The arm label appears when the gesture arms, and firms up past commit. */
export const ARM_LABEL = tween(150);
/** The label as it arrives, while armed, and once past the commit line. */
export const ARM_LABEL_FROM = { opacity: 0, scale: 0.9 } as const;
export const ARM_LABEL_ARMED = { opacity: 0.55, scale: 0.96 } as const;
export const ARM_LABEL_COMMITTED = { opacity: 1, scale: 1 } as const;

/* ---------------------------------------------------------------- hold */

/** A press this long on a Sheet margin lifts it as a Held Card. */
export const LONG_PRESS_MS = 500;
/**
 * The long press that lifts a Rooted Pane's Ground content off its Heading
 * (issue 480: about one second). Longer than a margin hold on purpose: the
 * Ground is the main thing, and moving it should not happen by accident.
 */
export const GROUND_PRESS_MS = 1000;
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

export function leanFor(
	dx: number,
	max = TILT_MAX,
	perPx = TILT_PER_PX,
): number {
	return Math.max(max, Math.min(0, dx * perPx));
}

/**
 * A Card armed for Open as sheet swells a little as it rises: up to 5 %
 * over 800 px, upward only.
 */
export const EXPAND_SCALE_MAX = 0.05;
const EXPAND_PER_PX = 1 / 800;

export function expandScaleFor(
	dy: number,
	max = EXPAND_SCALE_MAX,
	perPx = EXPAND_PER_PX,
): number {
	return 1 + Math.max(0, Math.min(max, -dy * perPx));
}
