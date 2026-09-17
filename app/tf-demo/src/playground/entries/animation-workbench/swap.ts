import { OPEN_SCALE } from "../deck-models/motion-spec";
import type { CardFrame, Frame, Layout } from "./motion";

/**
 * SWAP — the deck tap as it ships in the Compass prototype.
 *
 * It no longer animates. Every Card sits in its slot at full height; the
 * open one is in front and rests `OPEN_SCALE` larger than the rest, the
 * ones above show their Heading at the top, the ones below at the bottom.
 * A tap changes which of them is open, and the whole arrangement is there
 * on the next frame: no pulse, no Heading sliding to its new edge.
 *
 * So there is no `t` here. The entry keeps its place in the workbench as
 * the one thing on the list with a timeline of zero — the size difference
 * is a state, not a move — and `OPEN_SCALE` is shared with the live deck
 * through `deck-models/motion-spec.ts`, so this stage and `drag-deck.tsx`
 * cannot disagree about how far the front Card stands out.
 */

/** Which edge a Card's Heading sits at when `open` is in front. */
function edgeOf(index: number, open: number): "top" | "bottom" {
	return index > open ? "bottom" : "top";
}

/** The whole deck with `open` in front. */
export function deckFrame(open: number, layout: Layout): Frame {
	const cards: CardFrame[] = Array.from(
		{ length: layout.count },
		(_, index) => ({
			y: index * layout.header,
			height: layout.card,
			z:
				index === open
					? 10
					: index < open
						? 1 + index
						: layout.count - index,
			scale: index === open ? OPEN_SCALE : 1,
			headerAt: edgeOf(index, open),
		}),
	);
	return { cards };
}

export const SWAP_SOURCE =
	"motion-spec.ts · OPEN_SCALE → drag-deck.tsx · NoteView";
