/**
 * ANIMATION WORKBENCH — the deterministic core.
 *
 * Nothing here knows about React or the DOM. A move is a pair of open Card
 * indices; a variant is a pure function from (move, time, params, layout) to
 * the geometry of every Card. Playback, scrubbing and frame stepping all
 * call that one function with a different `t`, so they cannot disagree.
 *
 * The clock only owns time. Easing, spring response and per-Card stagger are
 * parameters of the calculation, so a parameter change re-evaluates the
 * frozen frame in place.
 */

/* --------------------------------------------------------------- layout */

export const PILE_REM = 22;
export const HEADER_REM = 2.5;

export type Layout = {
	readonly count: number;
	/** Root font size in px; every geometry below is in px. */
	readonly px: number;
	readonly header: number;
	/** The open Card's full height. */
	readonly card: number;
	/** The part of the open Card below its header. */
	readonly body: number;
};

export function layoutFor(count: number, px: number): Layout {
	const header = HEADER_REM * px;
	const card = (PILE_REM - (Math.max(1, count) - 1) * HEADER_REM) * px;
	return { count, px, header, card, body: card - header };
}

/* --------------------------------------------------------------- params */

export type Easing = "linear" | "easeOut" | "easeInOut" | "spring";

export type Params = {
	/** One Card's travel, in ms. */
	readonly duration: number;
	readonly easing: Easing;
	/** Spring overshoot, 0 (critically damped) to 0.9. Only for `spring`. */
	readonly bounce: number;
	/** Delay between neighbouring Cards, in ms, counted from the tapped Card. */
	readonly stagger: number;
	/** How much the accents (scale, shadow, fold) show, 0 to 1. */
	readonly accent: number;
};

export const DEFAULT_PARAMS: Params = {
	duration: 420,
	easing: "spring",
	bounce: 0.15,
	stagger: 0,
	accent: 1,
};

/* --------------------------------------------------------------- easing */

export function clamp01(value: number): number {
	return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function easeOut(p: number): number {
	const x = clamp01(p);
	return 1 - (1 - x) ** 3;
}

export function easeInOut(p: number): number {
	const x = clamp01(p);
	return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/**
 * A damped spring normalised to settle by progress 1. `bounce` is
 * 1 − damping ratio: 0 is critically damped, higher overshoots more. The
 * natural frequency is chosen so the envelope has decayed to 0.1% at p = 1,
 * which keeps the same choreography at any duration.
 */
export function spring(p: number, bounce: number): number {
	const x = clamp01(p);
	if (x >= 1) return 1;
	const zeta = 1 - Math.min(0.9, Math.max(0, bounce));
	const settle = Math.log(1000);
	if (zeta >= 0.999) {
		// Critically damped: (1 + ωx)e^(−ωx); ω ≈ 9.2 reaches 0.1% at x = 1.
		const omega = 9.233;
		return 1 - (1 + omega * x) * Math.exp(-omega * x);
	}
	const omega = settle / zeta;
	const damped = omega * Math.sqrt(1 - zeta * zeta);
	const envelope = Math.exp(-zeta * omega * x);
	return (
		1 -
		envelope *
			(Math.cos(damped * x) +
				((zeta * omega) / damped) * Math.sin(damped * x))
	);
}

export function ease(p: number, params: Params): number {
	switch (params.easing) {
		case "linear":
			return clamp01(p);
		case "easeOut":
			return easeOut(p);
		case "easeInOut":
			return easeInOut(p);
		case "spring":
			return spring(p, params.bounce);
	}
}

/** 0 → 1 → 0 over a local progress: the shape of a lift or a pulse. */
export function pulse(p: number): number {
	return Math.sin(Math.PI * clamp01(p));
}

export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/* ----------------------------------------------------------------- move */

export type Move = {
	/** The Card that was open before the tap. */
	readonly from: number;
	/** The Card that was tapped. */
	readonly to: number;
	/**
	 * When the tap landed mid-flight: the frame on screen at that instant.
	 * The variant plays its own choreography from `from`; the difference
	 * between this seed and the variant's own first frame is faded out over
	 * the move, so nothing jumps and the choreography is preserved.
	 */
	readonly seed?: Frame;
};

export function rest(open: number): Move {
	return { from: open, to: open };
}

/** The Cards that travel for this move: strictly between, plus the far one. */
export function moving(move: Move, index: number): boolean {
	const low = Math.min(move.from, move.to);
	const high = Math.max(move.from, move.to);
	return index > low && index <= high;
}

/** Each Card starts `stagger` ms later per step it sits from the tapped Card. */
export function delayFor(move: Move, index: number, params: Params): number {
	return Math.abs(index - move.to) * params.stagger;
}

export function maxDelay(move: Move, params: Params, count: number): number {
	let max = 0;
	for (let index = 0; index < count; index += 1) {
		max = Math.max(max, delayFor(move, index, params));
	}
	return max;
}

/** The whole timeline of a move, in ms. */
export function moveLength(move: Move, params: Params, count: number): number {
	if (move.from === move.to && !move.seed) return 0;
	return params.duration + maxDelay(move, params, count);
}

/** A Card's own eased progress at `t`, after its stagger delay. */
export function localProgress(
	move: Move,
	index: number,
	t: number,
	params: Params,
): number {
	const delay = delayFor(move, index, params);
	return clamp01((t - delay) / params.duration);
}

/* ---------------------------------------------------------------- frame */

export type CardFrame = {
	readonly y: number;
	readonly height: number;
	readonly z: number;
	readonly scale: number;
	/** 0 flat on the pile, 1 fully lifted (shadow). */
	readonly lift: number;
	readonly opacity: number;
	/** Where the header row sits inside the Card. */
	readonly headerAt: "top" | "bottom";
	/** Whether the Card draws its border and paper, 0 or 1. */
	readonly chrome: number;
	/** Fold: the body's hinge angle in degrees and its opacity. */
	readonly bodyRotate: number;
	readonly bodyOpacity: number;
};

/** Crossfade's single body panel and the two texts inside it. */
export type PanelFrame = {
	readonly y: number;
	readonly height: number;
	readonly texts: readonly {
		readonly index: number;
		readonly opacity: number;
		readonly y: number;
	}[];
};

export type Frame = {
	readonly cards: readonly CardFrame[];
	readonly panel?: PanelFrame;
};

export const CARD_DEFAULTS: Omit<CardFrame, "y" | "height" | "z"> = {
	scale: 1,
	lift: 0,
	opacity: 1,
	headerAt: "top",
	chrome: 1,
	bodyRotate: 0,
	bodyOpacity: 1,
};

/**
 * The geometry the travelling variants share at rest. A Card at or above
 * the open one is full height, its body hidden behind the next Card; a Card
 * below is only its header, pushed down by one body.
 */
export function slotAtRest(
	index: number,
	open: number,
	layout: Layout,
): { readonly y: number; readonly height: number } {
	const above = index <= open;
	return {
		y: index * layout.header + (above ? 0 : layout.body),
		height: above ? layout.card : layout.header,
	};
}

export type Variant = (
	move: Move,
	t: number,
	params: Params,
	layout: Layout,
) => Frame;

/* ------------------------------------------------------------- retarget */

const NUMERIC_KEYS = [
	"y",
	"height",
	"scale",
	"lift",
	"opacity",
	"bodyRotate",
	"bodyOpacity",
] as const;

/**
 * Wrap a variant so a mid-flight tap starts from what is on screen. The
 * offset between the seed and the variant's own first frame is faded with
 * an ease-out over the whole timeline.
 */
export function withSeed(variant: Variant): Variant {
	return (move, t, params, layout) => {
		const frame = variant(move, t, params, layout);
		if (!move.seed) return frame;
		const first = variant(move, 0, params, layout);
		const length = moveLength(move, params, layout.count);
		const keep = 1 - easeOut(length > 0 ? t / length : 1);
		if (keep <= 0) return frame;
		const seed = move.seed;
		const cards = frame.cards.map((card, index) => {
			const was = seed.cards[index];
			const base = first.cards[index];
			if (!was || !base) return card;
			const next = { ...card };
			for (const key of NUMERIC_KEYS) {
				(next as Record<typeof key, number>)[key] =
					card[key] + (was[key] - base[key]) * keep;
			}
			return next;
		});
		let panel = frame.panel;
		if (panel && seed.panel && first.panel) {
			panel = {
				...panel,
				y: panel.y + (seed.panel.y - first.panel.y) * keep,
			};
		}
		return { cards, panel };
	};
}
