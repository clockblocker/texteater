import { SWAP, type SwapSpec } from "../deck-models/swap-pulse";
import {
	type CardFrame,
	type Layout,
	type Move,
	progress,
	SWAP_EASE,
	type Variant,
	withSeed,
} from "./motion";

/**
 * The deck tap as it ships in the Compass prototype. Every Card sits in its
 * slot at full height; the open one is in front, the ones above show their
 * header at the top, the ones below at the bottom. A tap only changes who
 * is in front, at once; the new front Card gives one small pulse.
 *
 * The pulse's numbers are `SwapSpec`, shared with the live deck through
 * `deck-models/swap-pulse.ts`. `swapKeyframes` there is the Motion form of
 * exactly this function: `scale: [1, 1 + peak, 1]`, `times: [0, peakAt,
 * 1]`, `ease: [grow, settle]`.
 */

/** The pulse's shape at raw progress `raw`: 0 at rest, 1 at the peak. */
export function pulseAt(raw: number, spec: SwapSpec): number {
	const peakAt = Math.min(Math.max(spec.peakAt, 1e-6), 1 - 1e-6);
	if (raw <= peakAt) {
		return SWAP_EASE[spec.grow](raw / peakAt);
	}
	return 1 - SWAP_EASE[spec.settle]((raw - peakAt) / (1 - peakAt));
}

/** When the pulse peaks, in ms. */
export function peakMs(spec: SwapSpec): number {
	return spec.peakAt * spec.duration;
}

function each(
	layout: Layout,
	card: (index: number) => CardFrame,
): readonly CardFrame[] {
	return Array.from({ length: layout.count }, (_, index) => card(index));
}

const bare: Variant = (move: Move, t, spec, layout) => ({
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
					? 1 + spec.peak * pulseAt(progress(t, spec), spec)
					: 1,
		};
	}),
});

export const swap: Variant = withSeed(bare);

export const SWAP_SOURCE = "swap-pulse.ts · SWAP → drag-deck.tsx · expand";

export { SWAP };
