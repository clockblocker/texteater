import { DEAL_GAP_PX } from "compass";

/**
 * The Deck sits at one place in its Pane; the Text moves instead. The
 * Sheet's body scrolls just far enough that the Sentence the Segment was
 * clicked in sits whole above the Deck's top, `deckTop` in viewport px,
 * and not at all when it already does.
 */
export function clearSentence(
	segment: HTMLElement,
	deckTop: number,
	smooth: boolean,
): void {
	const sentence = segment.closest<HTMLElement>("[data-sentence]");
	const scroller = segment.closest<HTMLElement>("[data-scroller]");
	if (!sentence || !scroller) return;
	const overshoot =
		sentence.getBoundingClientRect().bottom + DEAL_GAP_PX - deckTop;
	if (overshoot <= 0) return;
	scroller.scrollBy({ top: overshoot, behavior: smooth ? "smooth" : "auto" });
}
