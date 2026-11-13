/// <reference lib="dom" />
import { expect, type Page, test } from "@playwright/test";
import {
	anchors,
	chooseVariant,
	frame,
	front,
	inspector,
	landed,
	lastRelease,
	layerOpacity,
	type Moment,
	panel,
	pull,
	redeal,
	reduceMotion,
	shares,
	spread,
	strayed,
	styles,
	topCardAt,
	watchApart,
	watchRelease,
	watchStacking,
} from "./support/deck-interactions";
import { closeSpecs } from "./support/deck-interactions-close-specs";
import {
	swipeDirectionSpecs,
	swipeUpSpecs,
} from "./support/deck-interactions-swipe-specs";
import { tapSpecs } from "./support/deck-interactions-tap-specs";

/**
 * The Deck interactions prototype: every variant behind the inspector's
 * switch, now D alone, and in D a swipe that closes the Deck and one that
 * opens the Card. Releases are slow, so none of them reads as a flick,
 * except where a case judges the motion a release while moving starts.
 */

test.use({ viewport: { width: 1600, height: 1000 } });

const VARIANTS = ["D · Swipe actions"];

const card = (page: Page, index: number) =>
	frame(page).locator("[data-card-id]").nth(index);

test.beforeEach(async ({ page }) => {
	await page.goto("/playground/deck-interactions");
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
});

test("every variant deals the Deck, with nothing but Cards at rest", async ({
	page,
}) => {
	for (const name of VARIANTS) {
		await chooseVariant(page, name);
		await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
		await expect(frame(page)).not.toContainText("Readouts");
	}
});

test("the Card in hand never goes transparent", async ({ page }) => {
	for (const name of VARIANTS) {
		await chooseVariant(page, name);
		const card = front(page);
		const box = await card.boundingBox();
		if (!box) throw new Error("Missing card geometry");
		await page.mouse.move(box.x + box.width / 2, box.y + 24);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width / 2 - 140, box.y + 60, {
			steps: 20,
		});
		await expect(card).toHaveCSS("opacity", "1");
		await page.mouse.up();
		await redeal(page);
	}
});

test("D: short of the threshold the action shows, and a release puts the Card back", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	await pull(page, front(page), -60, 0);
	await expect(panel(page)).toHaveAttribute("data-panel", "dismiss");
	await expect(panel(page)).not.toHaveAttribute("data-armed");
	await page.mouse.up();
	await expect(lastRelease(page)).toHaveText(/^back · short/);
	await expect(panel(page)).toHaveCount(0);
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
});

test("D: one breakpoint for any Card: 1 px short nothing says it will go, at the threshold the Deck is gathered onto it and leaves as one, and no Card ever changes its place in the stack", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	/* the front Card, one from the middle, and the backmost */
	for (const lead of [3, 1, 0]) {
		await landed(page);
		const rest = await anchors(page);
		/* every frame of the gather, the cancel, the gather again and the commit */
		const stacking = await watchStacking(page, lead);
		await pull(page, card(page, lead), -95, 0);
		await expect(panel(page)).not.toHaveAttribute("data-armed");
		for (const share of await shares(page, rest, lead))
			expect(share).toBeLessThan(1);
		await page.mouse.up();
		await expect(lastRelease(page)).toHaveText("back · short 95");
		await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
		await expect(panel(page)).toHaveCount(0);
		expect(await layerOpacity(page)).toBe(1);
		await pull(page, card(page, lead), -96, 0);
		await expect(panel(page)).toHaveAttribute("data-armed", "true");
		expect(await layerOpacity(page)).toBeCloseTo(0.5, 2);
		const now = await anchors(page);
		expect(spread(now, lead)).toBeLessThanOrEqual(1);
		/* the Cards in front came up onto it, the ones behind down */
		now.forEach((at, index) => {
			const was = rest[index]?.v ?? 0;
			if (index > lead) expect(at.v).toBeLessThan(was - 10);
			if (index < lead) expect(at.v).toBeGreaterThan(was + 10);
		});
		/* folded, the stack shows the front Card it showed before */
		expect(await topCardAt(card(page, lead))).toBe(3);
		const apart = await watchApart(card(page, lead), 400);
		await page.mouse.up();
		const seen = await apart();
		expect(seen.frames).toBeGreaterThan(2);
		expect(seen.apart).toBeLessThanOrEqual(1);
		await expect(lastRelease(page)).toHaveText("dismiss · threshold 96");
		await expect(frame(page).locator("[data-card-id]")).toHaveCount(0);
		const stacked = await stacking();
		expect(stacked.frames).toBeGreaterThan(30);
		expect(stacked.restacked).toBe(0);
		expect(stacked.panelOff).toBe(0);
		expect(stacked.faded).toBe(0);
		await redeal(page);
	}
});

test("D: under reduced motion no Card changes its place in the stack either, through a gather, a cancel and a commit", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	await reduceMotion(page);
	/* one from the middle, and the backmost */
	for (const lead of [1, 0]) {
		await landed(page);
		const stacking = await watchStacking(page, lead);
		await pull(page, card(page, lead), -60, 0);
		await page.mouse.up();
		await expect(lastRelease(page)).toHaveText(/^back · short/);
		await expect(panel(page)).toHaveCount(0);
		await pull(page, card(page, lead), -120, 0);
		await expect(panel(page)).toHaveAttribute("data-armed", "true");
		expect(await topCardAt(card(page, lead))).toBe(3);
		await page.mouse.up();
		await expect(frame(page).locator("[data-card-id]")).toHaveCount(0);
		const stacked = await stacking();
		expect(stacked.frames).toBeGreaterThan(20);
		expect(stacked.restacked).toBe(0);
		expect(stacked.panelOff).toBe(0);
		expect(stacked.faded).toBe(0);
		await redeal(page);
	}
});

test("D: past the threshold the panel arms, and the release does what it shows", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	await pull(page, front(page), -150, 0);
	await expect(panel(page)).toHaveAttribute("data-armed", "true");
	await page.mouse.up();
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(0);
	await expect(lastRelease(page)).toHaveText(/^dismiss · threshold/);
	await redeal(page);
	await pull(page, front(page), 0, -150);
	await expect(panel(page)).toHaveAttribute("data-panel", "expand");
	await expect(panel(page)).toHaveAttribute("data-armed", "true");
	await page.mouse.up();
	await expect(frame(page).locator("[data-expanded]")).toHaveCount(1);
});

test("D: an Open commit goes straight to the Cover, never further toward inline-end, and the Deck behind rests", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	const card = front(page);
	const box = await card.boundingBox();
	if (!box) throw new Error("Missing card geometry");
	const start = { x: box.x + box.width / 2, y: box.y + 40 };
	await page.mouse.move(start.x, start.y, { steps: 4 });
	const watched = await watchRelease(card, 600);
	await page.mouse.down();
	/* a swipe let go while moving, about 2.5 px/ms toward inline-end */
	for (const dx of [40, 80, 120, 160]) {
		await page.mouse.move(start.x + dx, start.y);
		await page.waitForTimeout(16);
	}
	await page.mouse.move(start.x + 200, start.y);
	await page.mouse.up();
	const moments = await watched();
	const first = moments[0];
	if (!first) throw new Error("Nothing sampled");
	await expect(lastRelease(page)).toHaveText(/^expand · threshold/);
	await expect(frame(page).locator("[data-expanded]")).toHaveCount(1);
	const most = (key: keyof Moment) => Math.max(...moments.map((f) => f[key]));
	expect(most("x")).toBeLessThanOrEqual(first.x + 0.5);
	expect(most("mid")).toBeLessThanOrEqual(first.mid + 0.5);
	moments.slice(1).forEach((f, i) => {
		expect(f.top).toBeLessThanOrEqual((moments[i]?.top ?? 0) + 0.5);
	});
	expect(moments.at(-1)?.top).toBeLessThan(first.top - 100);
	expect(most("lean")).toBeLessThanOrEqual(first.lean + 1.5);
});

test("D: a Close deck commit takes the Deck folded under the Card along with it, never out from under it", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	const card = front(page);
	const box = await card.boundingBox();
	if (!box) throw new Error("Missing card geometry");
	const start = { x: box.x + box.width / 2, y: box.y + 40 };
	await page.mouse.move(start.x, start.y, { steps: 4 });
	const watched = await watchApart(card, 400);
	await page.mouse.down();
	/* a full swipe let go as it crosses the threshold, still moving */
	for (const dx of [30, 60]) {
		await page.mouse.move(start.x - dx, start.y);
		await page.waitForTimeout(6);
	}
	await page.mouse.move(start.x - 100, start.y);
	await page.mouse.up();
	const seen = await watched();
	await expect(lastRelease(page)).toHaveText(/^dismiss · threshold/);
	expect(seen.frames).toBeGreaterThan(2);
	expect(seen.apart).toBeLessThanOrEqual(1);
});

test("D: pulled back under the threshold, the panel disarms and the Card returns", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	const start = await pull(page, front(page), -150, 0);
	await expect(panel(page)).toHaveAttribute("data-armed", "true");
	await page.mouse.move(start.x - 95, start.y, { steps: 30 });
	await page.waitForTimeout(150);
	await expect(panel(page)).not.toHaveAttribute("data-armed");
	await page.mouse.up();
	await expect(lastRelease(page)).toHaveText(/^back · short/);
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
});

test("D: in RTL, inline-start is on the right, and the Deck gathers onto a Card from the middle there", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	await inspector(page)
		.getByRole("button", { name: "RTL", exact: true })
		.click();
	const rest = await anchors(page);
	await pull(page, card(page, 1), 96, 0);
	await expect(panel(page)).toHaveAttribute("data-panel", "dismiss");
	await expect(panel(page)).toHaveAttribute("data-armed", "true");
	const now = await anchors(page);
	expect(spread(now, 1)).toBeLessThanOrEqual(1);
	expect(now[1]?.u).toBeGreaterThan((rest[1]?.u ?? 0) + 90);
	expect(now[3]?.v).toBeLessThan((rest[3]?.v ?? 0) - 10);
	expect(now[0]?.v).toBeGreaterThan((rest[0]?.v ?? 0) + 10);
	await page.mouse.up();
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(0);
	await redeal(page);
	await pull(page, front(page), 150, 0);
	await expect(panel(page)).toHaveAttribute("data-panel", "dismiss");
	await page.mouse.up();
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(0);
});

test("D: toward Open a Card from behind slides out under the Cards in front of it", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	const back = frame(page).locator("[data-card-id]").first();
	const z = await back.evaluate(
		(element) => getComputedStyle(element).zIndex,
	);
	await pull(page, back, 80, 0);
	await expect(back).toHaveCSS("z-index", z);
	await expect(panel(page)).toHaveAttribute("data-panel", "expand");
	await page.mouse.up();
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
});

test("D: toward Close deck the rest of the Deck folds in at once onto any Card, and back to its slots on a cancel", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	const rest = await anchors(page);
	const z = await styles(page, "z-index");
	for (const lead of [3, 2, 0]) {
		const start = await pull(page, card(page, lead), -48, 0);
		const half = await shares(page, rest, lead);
		expect(Math.max(...half) - Math.min(...half)).toBeLessThan(0.01);
		for (const share of half) expect(share).toBeCloseTo(0.5, 2);
		/* the Deck fades as one layer by the same share */
		expect(await layerOpacity(page)).toBeCloseTo(0.75, 2);
		await page.mouse.move(start.x - 150, start.y, { steps: 30 });
		await page.waitForTimeout(150);
		for (const share of await shares(page, rest, lead))
			expect(share).toBeCloseTo(1, 3);
		expect(await layerOpacity(page)).toBeCloseTo(0.5, 2);
		await page.mouse.move(start.x - 40, start.y, { steps: 30 });
		await page.waitForTimeout(150);
		await page.mouse.up();
		await expect(lastRelease(page)).toHaveText(/^back · short/);
		await expect.poll(() => strayed(page, rest)).toBeLessThan(0.5);
		await expect.poll(() => styles(page, "z-index")).toEqual(z);
		await expect.poll(() => layerOpacity(page)).toBe(1);
	}
});

swipeDirectionSpecs();
swipeUpSpecs();

test("D: hovering any Card changes no Card's transform, and lights only its border until a press", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	const still = await styles(page, "transform");
	const unlit = await styles(page, "border-top-color");
	for (const index of [0, 1, 2, 3]) {
		const box = await card(page, index).boundingBox();
		if (!box) throw new Error("Missing card geometry");
		/* on the strip of it that shows, where it is the Card under the pointer */
		await page.mouse.move(box.x + box.width / 2, box.y + 12, { steps: 4 });
		await expect
			.poll(async () => (await styles(page, "border-top-color"))[index])
			.not.toBe(unlit[index]);
		await page.waitForTimeout(400);
		expect(await styles(page, "transform")).toEqual(still);
		const lit = await styles(page, "border-top-color");
		lit.forEach((colour, other) => {
			if (other !== index) expect(colour).toBe(unlit[other]);
		});
	}
	await page.mouse.down();
	await expect.poll(() => styles(page, "border-top-color")).toEqual(unlit);
	await page.mouse.up();
});

tapSpecs();
closeSpecs();
