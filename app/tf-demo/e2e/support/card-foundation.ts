/// <reference lib="dom" />
import type { Locator } from "@playwright/test";

/**
 * What a Presentation's box, Heading row and Body compute to, read off
 * the page for the foundation's parity spec. Offsets are layout offsets
 * inside the box, so a resting scale or a Card's place on the page does
 * not show in them.
 */
export type PresentationMetrics = {
	readonly box: {
		readonly width: number;
		readonly radius: string;
		readonly border: string;
		readonly background: string;
		readonly shadow: string;
		readonly contain: string;
		readonly overflow: string;
		readonly display: string;
	};
	readonly heading: {
		readonly top: number;
		readonly height: number;
		readonly order: string;
		readonly facePadding: string | null;
	};
	readonly title: {
		readonly left: number;
		readonly top: number;
		readonly font: string;
	} | null;
	readonly body: {
		readonly top: number;
		readonly overflowY: string;
		readonly notePadding: string | null;
	};
	readonly fade: {
		readonly height: number;
		readonly position: string;
		readonly opacity: string;
		readonly image: string;
	};
};

/** The metrics of the Presentation `box` is, once its row has settled. */
export function presentationMetrics(
	box: Locator,
): Promise<PresentationMetrics> {
	return box.evaluate((element) => {
		const root = element as HTMLElement;
		/** Where `node` is laid out inside the box, transforms aside. */
		const within = (node: HTMLElement) => {
			let left = 0;
			let top = 0;
			let at: HTMLElement | null = node;
			while (at && at !== root) {
				left += at.offsetLeft;
				top += at.offsetTop;
				at = at.offsetParent as HTMLElement | null;
			}
			return { left, top };
		};
		const need = (selector: string) => {
			const found = root.querySelector<HTMLElement>(selector);
			if (!found) throw new Error(`Missing ${selector}`);
			return found;
		};
		const style = getComputedStyle(root);
		const heading = need("[data-heading]");
		const face = heading.firstElementChild;
		const title = root.querySelector<HTMLElement>(
			"[data-heading] [data-slot=note-title]",
		);
		const titleStyle = title ? getComputedStyle(title) : null;
		const scroller = need("[data-scroller]");
		const note = scroller.querySelector(
			"[data-note-presentation] > article",
		);
		const fade = scroller.lastElementChild as HTMLElement;
		const fadeStyle = getComputedStyle(fade);
		return {
			box: {
				width: root.offsetWidth,
				radius: style.borderRadius,
				border: `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`,
				background: style.backgroundColor,
				shadow: style.boxShadow,
				contain: style.contain,
				overflow: style.overflow,
				display: `${style.display} ${style.flexDirection}`,
			},
			heading: {
				top: within(heading).top,
				height: heading.offsetHeight,
				order: getComputedStyle(heading).order,
				facePadding: face ? getComputedStyle(face).padding : null,
			},
			title:
				title && titleStyle
					? {
							...within(title),
							font: `${titleStyle.fontFamily} ${titleStyle.fontSize}/${titleStyle.lineHeight} ${titleStyle.fontWeight}`,
						}
					: null,
			body: {
				top: within(scroller).top,
				overflowY: getComputedStyle(scroller).overflowY,
				notePadding: note ? getComputedStyle(note).padding : null,
			},
			fade: {
				height: fade.offsetHeight,
				position: fadeStyle.position,
				opacity: fadeStyle.opacity,
				image: fadeStyle.backgroundImage,
			},
		};
	});
}

/** One Card of a pile as it rests: its box as laid out, and as drawn in its frame. */
export type PileCard = {
	readonly width: number;
	readonly height: number;
	/** The drawn box's top, below the frame's. */
	readonly top: number;
	/** The drawn box's middle, across, from the frame's. */
	readonly middle: number;
	readonly drawnWidth: number;
};

/**
 * A dealt Deck's Cards from the top of the pile down, each measured in
 * `frame`, which is the Deck's Pane.
 */
export function pileCards(frame: Locator, cards: string): Promise<PileCard[]> {
	return frame.evaluate((root, selector) => {
		const pane = root.getBoundingClientRect();
		return [...root.querySelectorAll<HTMLElement>(selector)]
			.map((card) => {
				const drawn = card.getBoundingClientRect();
				return {
					width: card.offsetWidth,
					height: card.offsetHeight,
					top: drawn.top - pane.top - root.clientTop,
					middle:
						drawn.left +
						drawn.width / 2 -
						(pane.left + root.clientLeft + root.clientWidth / 2),
					drawnWidth: drawn.width,
				};
			})
			.sort((a, b) => a.top - b.top);
	}, cards);
}
