import {
	type CardFrame,
	type Layout,
	MOTION_EASE_OUT,
	type Move,
	progress,
	type Variant,
	withSeed,
} from "./motion";
import type { Where } from "./scene";

/**
 * The deck tap as it ships in the Compass prototype. Every Card sits in its
 * slot at full height; the open one is in front, the ones above show their
 * header at the top, the ones below at the bottom. A tap only changes who
 * is in front, at once; the new front Card gives one small pulse.
 */

export type VariantSpec = {
	readonly key: string;
	readonly title: string;
	readonly blurb: string;
	readonly source: string;
	readonly where: Where;
	readonly variant: Variant;
};

/** `animate(front, { scale: [1, 1.02, 1] }, { times: [0, 0.22, 1], ease: "easeOut" })`. */
const PULSE_PEAK = 0.02;
const PULSE_PEAK_AT = 0.22;

function pulseAt(raw: number): number {
	if (raw <= PULSE_PEAK_AT) {
		return MOTION_EASE_OUT(raw / PULSE_PEAK_AT);
	}
	return 1 - MOTION_EASE_OUT((raw - PULSE_PEAK_AT) / (1 - PULSE_PEAK_AT));
}

function each(
	layout: Layout,
	card: (index: number) => CardFrame,
): readonly CardFrame[] {
	return Array.from({ length: layout.count }, (_, index) => card(index));
}

const swap: Variant = (move: Move, t, params, layout) => ({
	cards: each(layout, (index) => {
		const place =
			index < move.to ? "above" : index > move.to ? "below" : "open";
		return {
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
					? 1 +
						PULSE_PEAK *
							params.accent *
							pulseAt(progress(t, params))
					: 1,
		};
	}),
});

export const VARIANTS: readonly VariantSpec[] = [
	{
		key: "swap",
		title: "Swap",
		blurb: "The tapped Card comes to the front at once; nothing travels. The new front Card pulses to 1.02 over the first 22 % of 420 ms and settles over the rest, both ease-out.",
		source: "drag-deck.tsx · expand · LIFT_MS",
		where: "playground",
		variant: withSeed(swap),
	},
];
