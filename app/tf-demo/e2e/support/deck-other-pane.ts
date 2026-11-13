/// <reference lib="dom" />
import { expect, type Locator, type Page } from "@playwright/test";
import {
	frame,
	front,
	landed,
	lastRelease,
	panel,
	pull,
} from "./deck-interactions";
import { offBy, type Sample, type Shown, shown } from "./deck-interactions-tap";

/**
 * The other Pane in D's specs (#1350): where it is, whether a Card lies
 * in it, opening one there as a hand does, and the Deck at rest after.
 */

export const pane = (page: Page) => frame(page).locator("[data-other-pane]");
export const open = (page: Page) => frame(page).locator("[data-expanded]");

/** A box in the frame's logical px, as `shown` reads a Card: its middle and size. */
export async function paneBox(
	page: Page,
): Promise<Omit<Shown, "id" | "z" | "o">> {
	return frame(page).evaluate((deck) => {
		const box = deck.getBoundingClientRect();
		const rtl = getComputedStyle(deck).direction === "rtl";
		const own = deck.querySelector("[data-other-pane]");
		if (!own) throw new Error("No other Pane");
		const at = own.getBoundingClientRect();
		const middle = at.left + at.width / 2;
		return {
			u: rtl ? box.right - middle : middle - box.left,
			v: at.top + at.height / 2 - box.top,
			w: at.width,
			h: at.height,
		};
	});
}

/** Whether `card` lies inside `box`, to half a px. */
export function inside(card: Shown, box: Omit<Shown, "id" | "z" | "o">) {
	return (
		card.u - card.w / 2 >= box.u - box.w / 2 - 0.5 &&
		card.u + card.w / 2 <= box.u + box.w / 2 + 0.5 &&
		card.v - card.h / 2 >= box.v - box.h / 2 - 0.5 &&
		card.v + card.h / 2 <= box.v + box.h / 2 + 0.5
	);
}

/** Lands, then expects every Card where it rested in `rest`, to half a px. */
export async function expectRest(page: Page, rest: readonly Shown[]) {
	await page.mouse.move(5, 5);
	await landed(page);
	const now = await shown(page);
	now.forEach((card, index) => {
		const was = rest[index];
		if (!was) throw new Error(`No Card ${index}`);
		expect(card.id).toBe(was.id);
		expect(offBy(card, was)).toBeLessThanOrEqual(0.5);
	});
}

/**
 * Opens `card`, the front one if none is given, in the other Pane by a
 * slow swipe `way` px along the inline axis; resolves once it rests
 * there. The front Card's panel shows its label; one behind uncovers too
 * little of its own for one.
 */
export async function openAside(page: Page, way: number, card?: Locator) {
	await pull(page, card ?? front(page), way, 0);
	await expect(panel(page)).toHaveAttribute("data-panel", "other-pane");
	await expect(panel(page)).toHaveAttribute("data-armed", "true");
	if (!card) await expect(panel(page)).toContainText("Other pane");
	await page.mouse.up();
	await expect(lastRelease(page)).toHaveText(/^other-pane · threshold/);
	await expect(open(page)).toHaveCount(1);
	await expect(pane(page)).toHaveCount(1);
	await page.mouse.move(5, 5);
	await landed(page);
}

/** Frames from the first in which the hand had let go. */
export function afterRelease(frames: readonly Sample[]) {
	const at = frames.findIndex((sample) => !sample.down);
	if (at < 0) throw new Error("The hand never let go");
	return frames.slice(at);
}
