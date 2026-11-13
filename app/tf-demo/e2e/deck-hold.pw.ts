/// <reference lib="dom" />
import { expect, type Locator, type Page, test } from "@playwright/test";
import {
	anchors,
	chooseVariant,
	frame,
	front,
	inspector,
	landed,
	lastRelease,
	panel,
	pull,
	reduceMotion,
} from "./support/deck-interactions";
import { direct } from "./support/deck-interactions-swipe";

/**
 * D · Swipe actions' hold to lift: a press held still for the hold's
 * 500 ms lifts its Card into the hand, which carries it freely while the
 * Deck closes its gap and the stand-in pad shows; a release puts it back.
 * A press that moves first is the swipe it always was. The gestures are
 * synthetic mouse moves, the hold a real wait.
 */

test.use({ viewport: { width: 1600, height: 1000 } });

/** Longer than the hold, so the lift and its pop are done. */
const HELD_MS = 800;

const card = (page: Page, index: number) =>
	frame(page).locator("[data-card-id]").nth(index);
const pad = (page: Page) => frame(page).locator("[data-carry-pad]");

function padOpacity(page: Page) {
	return pad(page).evaluate((element) =>
		Number(getComputedStyle(element).opacity),
	);
}

async function rectOf(target: Locator) {
	const box = await target.boundingBox();
	if (!box) throw new Error("Missing card geometry");
	return box;
}

/** Where `hand` is on `box`, as shares of its width and height. */
function spotOf(
	box: { x: number; y: number; width: number; height: number },
	hand: { x: number; y: number },
) {
	return {
		x: (hand.x - box.x) / box.width,
		y: (hand.y - box.y) / box.height,
	};
}

/** Presses `target` near its top and holds still past the hold. */
async function hold(page: Page, target: Locator) {
	const box = await rectOf(target);
	const at = { x: box.x + box.width / 2, y: box.y + 20 };
	await page.mouse.move(at.x, at.y);
	await page.mouse.down();
	await page.waitForTimeout(HELD_MS);
	return at;
}

test.beforeEach(async ({ page }) => {
	await page.goto("/playground/deck-interactions");
	await chooseVariant(page, "D · Swipe actions");
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
	await landed(page);
});

test("D: a press held still lifts its Card, which trails the hand 1:1 while the Deck closes its gap, and a release puts it back into its slot", async ({
	page,
}) => {
	const rest = await anchors(page);
	expect(await padOpacity(page)).toBe(0);
	const at = await hold(page, card(page, 1));
	await expect.poll(() => padOpacity(page)).toBe(1);
	await expect(inspector(page).locator('[data-readout="zone"]')).toHaveText(
		"lifted",
	);
	/* lifted, it is the size of an open Card, a little more */
	const lifted = await rectOf(card(page, 1));
	expect(lifted.width).toBeGreaterThan(416 * 1.05);
	/* the Cards in front of it close up into its place */
	const closed = await anchors(page);
	expect(Math.abs((closed[2]?.v ?? 0) - (rest[1]?.v ?? 0))).toBeLessThan(1);
	expect(Math.abs((closed[3]?.v ?? 0) - (rest[2]?.v ?? 0))).toBeLessThan(1);
	expect(Math.abs((closed[0]?.v ?? 0) - (rest[0]?.v ?? 0))).toBeLessThan(1);
	/* anywhere in 2D, under the hand */
	await page.mouse.move(at.x + 260, at.y + 230, { steps: 20 });
	await page.waitForTimeout(50);
	const carried = await rectOf(card(page, 1));
	expect(carried.x - lifted.x).toBeCloseTo(260, 0);
	expect(carried.y - lifted.y).toBeCloseTo(230, 0);
	await expect(pad(page)).not.toHaveAttribute("data-over");
	await page.mouse.up();
	await expect(lastRelease(page)).toHaveText("back · let go");
	await landed(page);
	const back = await anchors(page);
	back.forEach((anchor, index) => {
		expect(Math.abs(anchor.u - (rest[index]?.u ?? 0))).toBeLessThan(0.5);
		expect(Math.abs(anchor.v - (rest[index]?.v ?? 0))).toBeLessThan(0.5);
	});
	await expect.poll(() => padOpacity(page)).toBe(0);
});

test("D: a Card let go over the pad goes back, and the pad says it took the drop", async ({
	page,
}) => {
	const rest = await anchors(page);
	const at = await hold(page, front(page));
	const target = await rectOf(pad(page));
	await page.mouse.move(
		target.x + target.width / 2,
		target.y + target.height / 2,
		{ steps: 25 },
	);
	await expect(pad(page)).toHaveAttribute("data-over", "true");
	expect(at.x).toBeLessThan(target.x);
	await page.mouse.up();
	await expect(pad(page)).toHaveAttribute("data-acknowledged", "true");
	await expect(lastRelease(page)).toHaveText("back · dropped on the pad");
	await landed(page);
	const back = await anchors(page);
	expect(Math.abs((back[3]?.u ?? 0) - (rest[3]?.u ?? 0))).toBeLessThan(0.5);
	expect(Math.abs((back[3]?.v ?? 0) - (rest[3]?.v ?? 0))).toBeLessThan(0.5);
	await expect(pad(page)).not.toHaveAttribute("data-acknowledged");
	await expect.poll(() => padOpacity(page)).toBe(0);
});

test("D: a press that moves before the hold is done swipes as before, and one that drifts within the stillness still lifts", async ({
	page,
}) => {
	await pull(page, front(page), -60, 0);
	await page.waitForTimeout(HELD_MS);
	await expect(panel(page)).toHaveAttribute("data-panel", "dismiss");
	expect(await padOpacity(page)).toBe(0);
	await page.mouse.up();
	await expect(lastRelease(page)).toHaveText(/^back · short/);
	await landed(page);
	const box = await rectOf(front(page));
	await page.mouse.move(box.x + 200, box.y + 20);
	await page.mouse.down();
	await page.mouse.move(box.x + 206, box.y + 24, { steps: 6 });
	await page.waitForTimeout(HELD_MS);
	await expect.poll(() => padOpacity(page)).toBe(1);
	await expect(panel(page)).toHaveCount(0);
	await page.mouse.up();
	await expect(lastRelease(page)).toHaveText("back · let go");
});

test("D: a Card on its way home from a swipe can be caught and held to lift it", async ({
	page,
}) => {
	await inspector(page)
		.getByRole("group", { name: "Slow-mo" })
		.getByRole("button", { name: "0.25×", exact: true })
		.click();
	const start = await pull(page, front(page), -70, 0);
	await page.mouse.up();
	await expect(lastRelease(page)).toHaveText(/^back · short/);
	/* caught where the hand let go, the Card still short of home */
	await page.mouse.down();
	await page.waitForTimeout(HELD_MS);
	await expect.poll(() => padOpacity(page)).toBe(1);
	await expect(panel(page)).toHaveCount(0);
	/* slowed, the lift's pop is still growing it: the spot the hand has
	   stays under the hand all the same */
	const hand = { x: start.x - 70, y: start.y };
	const before = spotOf(await rectOf(front(page)), hand);
	const to = { x: hand.x + 120, y: hand.y + 140 };
	await page.mouse.move(to.x, to.y, { steps: 10 });
	await page.waitForTimeout(50);
	const after = spotOf(await rectOf(front(page)), to);
	expect(Math.abs(after.x - before.x)).toBeLessThan(0.005);
	expect(Math.abs(after.y - before.y)).toBeLessThan(0.005);
	await page.mouse.up();
	await expect(lastRelease(page)).toHaveText("back · let go");
	/* on its way home from the carry, slowed, the same hand catches it again */
	await page.mouse.down();
	await page.waitForTimeout(HELD_MS);
	await expect.poll(() => padOpacity(page)).toBe(1);
	const caught = spotOf(await rectOf(front(page)), to);
	expect(caught.x).toBeGreaterThan(0);
	expect(caught.x).toBeLessThan(1);
	await page.mouse.up();
});

test("D in RTL: the lifted Card trails the hand, and the pad stands at the inline-end side", async ({
	page,
}) => {
	await direct(page, "RTL");
	await landed(page);
	const at = await hold(page, card(page, 2));
	await expect.poll(() => padOpacity(page)).toBe(1);
	const target = await rectOf(pad(page));
	const deck = await rectOf(frame(page));
	expect(target.x - deck.x).toBeLessThan(40);
	const lifted = await rectOf(card(page, 2));
	await page.mouse.move(at.x - 200, at.y + 100, { steps: 20 });
	await page.waitForTimeout(50);
	const carried = await rectOf(card(page, 2));
	expect(carried.x - lifted.x).toBeCloseTo(-200, 0);
	expect(carried.y - lifted.y).toBeCloseTo(100, 0);
	await page.mouse.up();
	await landed(page);
});

type Seen = { x: number; y: number; opacity: number };

test("D, reduced: the hold lifts only the shadow, the hand carries the Card 1:1, and a release far from home dissolves back rather than travelling", async ({
	page,
}) => {
	await reduceMotion(page);
	await landed(page);
	const rest = await rectOf(card(page, 1));
	const at = await hold(page, card(page, 1));
	await expect.poll(() => padOpacity(page)).toBe(1);
	const lifted = await rectOf(card(page, 1));
	/* nothing grows */
	expect(lifted.width).toBeCloseTo(rest.width, 0);
	await page.mouse.move(at.x + 300, at.y + 200, { steps: 20 });
	await page.waitForTimeout(50);
	const carried = await rectOf(card(page, 1));
	expect(carried.x - lifted.x).toBeCloseTo(300, 0);
	expect(carried.y - lifted.y).toBeCloseTo(200, 0);
	/* every frame for 500 ms from the release */
	await card(page, 1).evaluate((element) => {
		const seen: Seen[] = [];
		let until = 0;
		const step = () => {
			const box = element.getBoundingClientRect();
			seen.push({
				x: box.x,
				y: box.y,
				opacity: Number(getComputedStyle(element).opacity),
			});
			if (performance.now() < until) requestAnimationFrame(step);
		};
		const start = () => {
			until = performance.now() + 500;
			step();
		};
		window.addEventListener("pointerup", start, {
			capture: true,
			once: true,
		});
		Object.assign(window, { seen });
	});
	await page.mouse.up();
	await expect(lastRelease(page)).toHaveText("back · let go");
	await landed(page);
	await page.waitForTimeout(600);
	const seen = await page.evaluate(
		() => (window as unknown as { seen: Seen[] }).seen,
	);
	expect(seen.length).toBeGreaterThan(20);
	/* it was only ever where the hand let it go or home, and faded between */
	for (const frame of seen) {
		const there = Math.hypot(frame.x - carried.x, frame.y - carried.y);
		const home = Math.hypot(frame.x - rest.x, frame.y - rest.y);
		expect(Math.min(there, home)).toBeLessThan(1);
	}
	expect(Math.min(...seen.map((frame) => frame.opacity))).toBeLessThan(0.2);
	const back = await rectOf(card(page, 1));
	expect(back.x).toBeCloseTo(rest.x, 0);
	expect(back.y).toBeCloseTo(rest.y, 0);
});
