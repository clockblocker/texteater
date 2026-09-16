import {
	CARD_DEFAULTS,
	type CardFrame,
	ease,
	easeInOut,
	easeOut,
	type Frame,
	type Layout,
	lerp,
	localProgress,
	type Move,
	type Params,
	pulse,
	slotAtRest,
	type Variant,
	withSeed,
} from "./motion";

/**
 * Each variant is one answer to the same tap on a folded Card, as a pure
 * function of time. They share the Compass column: one header row per Card,
 * written form on top, meaning at the bottom, the open Card taking the rest
 * of the height.
 *
 * `params.easing` shapes every travel. Accents (lift, pulse, fold) run on
 * the raw local progress of the Card, scaled by `params.accent`.
 */

export type VariantSpec = {
	readonly key: string;
	readonly title: string;
	readonly blurb: string;
	readonly variant: Variant;
};

type Travel = CardFrame & {
	/** The Card's eased travel progress. */
	readonly p: number;
	/** The Card's raw local progress, for accents. */
	readonly raw: number;
};

/** A Card travelling between its two rest slots on its own eased clock. */
function travelling(
	move: Move,
	index: number,
	t: number,
	params: Params,
	layout: Layout,
): Travel {
	const raw = localProgress(move, index, t, params);
	const p = ease(raw, params);
	const start = slotAtRest(index, move.from, layout);
	const end = slotAtRest(index, move.to, layout);
	return {
		...CARD_DEFAULTS,
		y: lerp(start.y, end.y, p),
		height: lerp(start.height, end.height, p),
		z: 1 + index,
		p,
		raw,
	};
}

function strip({ p: _p, raw: _raw, ...card }: Travel): CardFrame {
	return card;
}

function each(
	layout: Layout,
	card: (index: number) => CardFrame,
): readonly CardFrame[] {
	return Array.from({ length: layout.count }, (_, index) => card(index));
}

/** The Cards that travel for this move: strictly between, plus the far one. */
function travels(move: Move, index: number): boolean {
	const low = Math.min(move.from, move.to);
	const high = Math.max(move.from, move.to);
	return index > low && index <= high;
}

/* ------------------------------------------------------------- variants */

/**
 * SWAP — what ships. Every Card sits in its slot at full height; the open
 * one is in front, the ones above show their header at the top, the ones
 * below at the bottom. A tap only changes who is in front, at once; the
 * new front Card gives one small pulse.
 */
const swap: Variant = (move, t, params, layout) => ({
	cards: each(layout, (index) => {
		const place =
			index < move.to ? "above" : index > move.to ? "below" : "open";
		const raw = localProgress(move, index, t, params);
		return {
			...CARD_DEFAULTS,
			y: index * layout.header,
			height: layout.card,
			z:
				place === "open"
					? 10
					: place === "above"
						? 1 + index
						: layout.count - index,
			headerAt: place === "below" ? "bottom" : "top",
			scale:
				place === "open" && move.from !== move.to
					? 1 + 0.02 * params.accent * pulse(easeOut(raw))
					: 1,
		};
	}),
});

/** SLIDE — headers travel as a block; the tapped Card's text rides with it. */
const slide: Variant = (move, t, params, layout) => ({
	cards: each(layout, (index) =>
		strip(travelling(move, index, t, params, layout)),
	),
});

/** LIFT — Slide, but the block that travels comes off the pile and lands. */
const lift: Variant = (move, t, params, layout) => ({
	cards: each(layout, (index) => {
		const card = travelling(move, index, t, params, layout);
		if (!travels(move, index)) return strip(card);
		const arc = pulse(easeInOut(card.raw)) * params.accent;
		return {
			...strip(card),
			scale: 1 + 0.02 * arc,
			lift: arc,
		};
	}),
});

/**
 * PLUCK — the tapped Card is the hero. It comes to the front at once with a
 * short lift, and the headers slide into place behind it.
 */
const pluck: Variant = (move, t, params, layout) => ({
	cards: each(layout, (index) => {
		const card = travelling(move, index, t, params, layout);
		if (index !== move.to || move.from === move.to) return strip(card);
		const arc = pulse(easeInOut(card.raw)) * params.accent;
		return {
			...strip(card),
			z: 50,
			scale: 1 + 0.035 * arc,
			lift: arc,
		};
	}),
});

/**
 * CROSSFADE — headers slide as in Slide, but the body is one panel that
 * only changes its text: the old lines leave toward the header that was
 * tapped from, the new ones arrive from the side the tap came from.
 */
const crossfade: Variant = (move, t, params, layout) => {
	const direction = move.to >= move.from ? 1 : -1;
	const hero = travelling(move, move.to, t, params, layout);
	// The text swap is quicker than the travel, so the new lines are legible
	// while the headers are still settling.
	const swapAt = easeOut(Math.min(1, hero.raw / 0.6));
	const shift = 14 * params.accent;
	const texts =
		move.from === move.to
			? [{ index: move.to, opacity: 1, y: 0 }]
			: [
					{
						index: move.from,
						opacity: 1 - swapAt,
						y: -direction * shift * swapAt,
					},
					{
						index: move.to,
						opacity: swapAt,
						y: direction * shift * (1 - swapAt),
					},
				];
	return {
		panel: {
			y: lerp(move.from * layout.header, move.to * layout.header, hero.p),
			height: layout.card,
			texts,
		},
		cards: each(layout, (index) => {
			const card = travelling(move, index, t, params, layout);
			return {
				...strip(card),
				height: layout.header,
				chrome: index === move.to ? 0 : 1,
			};
		}),
	};
};

/**
 * FOLD — every body hinges on its header. The open one folds away into the
 * pile as it closes; the tapped one unfolds toward the reader while the
 * headers make room.
 */
const FOLDED_ANGLE = 88;
const FOLDED_OPACITY = 0.35;

const fold: Variant = (move, t, params, layout) => ({
	cards: each(layout, (index) => {
		const card = travelling(move, index, t, params, layout);
		const hinge = easeInOut(card.raw);
		let open = 0;
		if (index === move.to) open = move.from === move.to ? 1 : hinge;
		else if (index === move.from) open = 1 - hinge;
		return {
			...strip(card),
			bodyRotate: lerp(FOLDED_ANGLE, 0, open),
			bodyOpacity: lerp(FOLDED_OPACITY, 1, open),
		};
	}),
});

export const VARIANTS: readonly VariantSpec[] = [
	{
		key: "swap",
		title: "Swap",
		blurb: "What ships today. The tapped Card comes to the front; nothing travels, every header teleports.",
		variant: withSeed(swap),
	},
	{
		key: "slide",
		title: "Slide",
		blurb: "Headers between the two Cards travel as one block across the body. The tapped Card's text rides up with its header; the old one is covered.",
		variant: withSeed(slide),
	},
	{
		key: "lift",
		title: "Lift",
		blurb: "Slide, with weight: the travelling block comes off the pile, casts a shadow on what it crosses, and lands.",
		variant: withSeed(lift),
	},
	{
		key: "pluck",
		title: "Pluck",
		blurb: "The tapped Card is plucked to the front at once and the headers settle behind it. Fastest to read, least physical.",
		variant: withSeed(pluck),
	},
	{
		key: "crossfade",
		title: "Crossfade",
		blurb: "Headers slide, but the body is one panel whose text changes, entering from the side the tap came from. Calm, not a stack.",
		variant: withSeed(crossfade),
	},
	{
		key: "fold",
		title: "Fold",
		blurb: "Each body hinges on its header. The open one folds into the pile; the tapped one unfolds toward you.",
		variant: withSeed(fold),
	},
];

export function variantFrame(
	spec: VariantSpec,
	move: Move,
	t: number,
	params: Params,
	layout: Layout,
): Frame {
	return spec.variant(move, t, params, layout);
}
