const TOP_CARD_HEIGHT_RATIO = 2 / 5;
/** Must match --card-footer-height in card-sheet-workspace.css. */
const CARD_FOOTER_HEIGHT_PX = 64;
const ANCHOR_GAP_LINE_COUNT = 2;
const PANE_EDGE_MARGIN_PX = 16;

/**
 * Vertical offset for the Card Layer inside its Pane so the deck hangs
 * two text lines below the element that opened it. The deck is as tall as
 * its foremost Card (2/5 of the Pane) plus one Card footer per Card behind
 * it. When the deck would not fit below the anchor, the anchor's reading
 * scroll container is scrolled just enough to fit both the anchor and the
 * deck. Returns null when the deck should fall back to its default
 * placement.
 */
export function cardLayerTopBelowAnchor(
	anchor: Element | null | undefined,
	pane: HTMLElement | null | undefined,
	deckSize: number,
): number | null {
	if (!anchor || !pane || !anchor.isConnected || !pane.isConnected) {
		return null;
	}
	const paneRect = pane.getBoundingClientRect();
	if (paneRect.height <= 0) return null;

	const deckHeight =
		paneRect.height * TOP_CARD_HEIGHT_RATIO +
		CARD_FOOTER_HEIGHT_PX * (deckSize - 1);
	const gap = ANCHOR_GAP_LINE_COUNT * lineHeightOf(anchor);
	const maxTop = Math.max(
		0,
		paneRect.height - deckHeight - PANE_EDGE_MARGIN_PX,
	);

	scrollToFitDeckBelowAnchor({ anchor, deckHeight, gap });

	const anchorRect = anchor.getBoundingClientRect();
	const unclamped = anchorRect.bottom - paneRect.top + gap;
	return Math.min(Math.max(unclamped, 0), maxTop);
}

function scrollToFitDeckBelowAnchor(options: {
	readonly anchor: Element;
	readonly deckHeight: number;
	readonly gap: number;
}): void {
	const { anchor, deckHeight, gap } = options;
	const scroller = scrollContainerOf(anchor);
	if (!scroller) return;
	const needed = gap + deckHeight + PANE_EDGE_MARGIN_PX;
	const spaceBelow =
		scroller.getBoundingClientRect().bottom -
		anchor.getBoundingClientRect().bottom;
	const shortfall = needed - spaceBelow;
	if (shortfall <= 0) return;
	const scrollable = Math.max(
		0,
		scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop,
	);
	scroller.scrollTop += Math.min(shortfall, scrollable);
}

function scrollContainerOf(anchor: Element): HTMLElement | null {
	let current: Element | null = anchor.parentElement;
	while (current) {
		if (current instanceof HTMLElement && isScrollContainer(current)) {
			return current;
		}
		current = current.parentElement;
	}
	return null;
}

function isScrollContainer(element: HTMLElement): boolean {
	const overflowY = getComputedStyle(element).overflowY;
	return (
		(overflowY === "auto" || overflowY === "scroll") &&
		element.scrollHeight > element.clientHeight
	);
}

function lineHeightOf(anchor: Element): number {
	const computed = Number.parseFloat(getComputedStyle(anchor).lineHeight);
	if (Number.isFinite(computed) && computed > 0) return computed;
	const anchorHeight = anchor.getBoundingClientRect().height;
	return anchorHeight > 0 ? anchorHeight : 16;
}
