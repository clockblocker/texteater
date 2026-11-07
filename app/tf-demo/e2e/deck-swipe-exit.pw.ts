/// <reference lib="dom" />
import { expect, type Locator, type Page, test } from "@playwright/test";
import {
	chooseVariant,
	frame,
	inspector,
	landed,
	lastRelease,
	layerOpacity,
	pull,
	redeal,
	reduceMotion,
	setKnob,
	watchExit,
} from "./support/deck-interactions";

/**
 * D's Close deck exit: the Deck fades as one layer with the gather, and a
 * commit carries the folded Deck on at the hand's speed for no more than
 * the drift knob while it fades out. No Card ever fades on its own.
 */

test.use({ viewport: { width: 1600, height: 1000 } });

const DRIFT = "Deck drift on a Close deck commit";

const card = (page: Page, index: number) =>
	frame(page).locator("[data-card-id]").nth(index);

test.beforeEach(async ({ page }) => {
	await page.goto("/playground/deck-interactions");
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
	await chooseVariant(page, "D · Swipe actions");
});

/**
 * A full swipe of `target` toward inline-start (`way` -1 on screen in
 * LTR, 1 in RTL), let go as it crosses the threshold, still moving.
 */
async function flick(page: Page, target: Locator, way: -1 | 1) {
	const box = await target.boundingBox();
	if (!box) throw new Error("Missing card geometry");
	const start = { x: box.x + box.width / 2, y: box.y + 16 };
	await page.mouse.move(start.x, start.y, { steps: 4 });
	await page.mouse.down();
	for (const dx of [30, 60]) {
		await page.mouse.move(start.x + way * dx, start.y);
		await page.waitForTimeout(6);
	}
	await page.mouse.move(start.x + way * 100, start.y);
	await page.mouse.up();
}

/** Commits Close deck on Card `lead` with a flick, and what its exit did. */
async function exitOf(page: Page, lead: number, way: -1 | 1) {
	/* a deal fades each Card in on its own; the exit starts after it */
	await landed(page);
	const watched = await watchExit(page, lead);
	await flick(page, card(page, lead), way);
	const exit = await watched();
	await expect(lastRelease(page)).toHaveText(/^dismiss · threshold/);
	/* gone, the layer is all the way out */
	expect(await layerOpacity(page)).toBe(0);
	expect(exit.frames).toBeGreaterThan(4);
	expect(exit.own).toBe(1);
	expect(exit.layer).toBeLessThan(0.1);
	expect(exit.toEnd).toBeLessThanOrEqual(0.5);
	return exit;
}

test("D: a Close deck commit carries the Deck on at the hand's speed, no further than the drift knob, while it fades out as one layer", async ({
	page,
}) => {
	const exit = await exitOf(page, 3, -1);
	expect(exit.toStart).toBeGreaterThan(10);
	expect(exit.toStart).toBeLessThanOrEqual(40 + 0.5);
	await redeal(page);
	await expect.poll(() => layerOpacity(page)).toBe(1);
	await setKnob(page, DRIFT, 12);
	const short = await exitOf(page, 1, -1);
	expect(short.toStart).toBeGreaterThan(4);
	expect(short.toStart).toBeLessThanOrEqual(12 + 0.5);
});

test("D: in RTL the Close deck commit drifts toward inline-start, on the right, and fades out", async ({
	page,
}) => {
	await inspector(page)
		.getByRole("button", { name: "RTL", exact: true })
		.click();
	await pull(page, card(page, 1), 96, 0);
	expect(await layerOpacity(page)).toBeCloseTo(0.5, 2);
	await page.mouse.up();
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(0);
	await redeal(page);
	const exit = await exitOf(page, 3, 1);
	expect(exit.toStart).toBeGreaterThan(10);
	expect(exit.toStart).toBeLessThanOrEqual(40 + 0.5);
});

test("D: under reduced motion the Deck still fades as one layer with the gather, and a commit only fades it, with no drift", async ({
	page,
}) => {
	await reduceMotion(page);
	const start = await pull(page, card(page, 1), -48, 0);
	expect(await layerOpacity(page)).toBeCloseTo(0.75, 2);
	await page.mouse.move(start.x - 150, start.y, { steps: 30 });
	await page.waitForTimeout(150);
	expect(await layerOpacity(page)).toBeCloseTo(0.5, 2);
	await page.mouse.move(start.x - 40, start.y, { steps: 30 });
	await page.mouse.up();
	await expect(lastRelease(page)).toHaveText(/^back · short/);
	await expect.poll(() => layerOpacity(page)).toBe(1);
	const exit = await exitOf(page, 3, -1);
	expect(exit.toStart).toBeLessThanOrEqual(0.5);
});
