/// <reference lib="dom" />
import { expect, test } from "@playwright/test";
import {
	frame,
	front,
	inspector,
	landed,
	lastRelease,
	panel,
	pull,
	reduceMotion,
} from "./support/deck-interactions";
import { closeButton } from "./support/deck-interactions-close";
import {
	choose,
	offBy,
	record,
	shown,
	trackOf,
} from "./support/deck-interactions-tap";
import {
	afterRelease,
	expectRest,
	inside,
	open,
	openAside,
	pane,
	paneBox,
} from "./support/deck-other-pane";

/**
 * D's swipe toward inline-end by the screen's width (#1350): on a wide
 * screen it opens the Card in the other Pane, a stand-in at inline-end of
 * the frame, while the Deck stays where it rests in its own Pane; on a
 * phone, read from the screen or pinned in the inspector, it opens the
 * Card into the Cover as before. Up opens the Cover at every width.
 */

test.use({ viewport: { width: 1600, height: 1000 } });

test.beforeEach(async ({ page }) => {
	await page.goto("/playground/deck-interactions");
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
	await page.mouse.move(5, 5);
	await landed(page);
});

for (const rtl of [false, true])
	test(`D wide${rtl ? " in RTL" : ""}: inline-end opens the Card in the other Pane at inline-end, the Deck stays where it rests, and its × takes the Card back into its place`, async ({
		page,
	}) => {
		if (rtl)
			await inspector(page)
				.getByRole("button", { name: "RTL", exact: true })
				.click();
		await page.mouse.move(5, 5);
		await landed(page);
		await expect(frame(page)).toHaveAttribute("data-width", "wide");
		await expect(pane(page)).toHaveCount(0);
		const rest = await shown(page);
		const id = rest.at(-1)?.id ?? "";
		await openAside(page, rtl ? -150 : 150);
		/* the icon is a Pane opening at inline-end: mirrored in RTL */
		const now = await shown(page);
		const box = await paneBox(page);
		const frameWidth = (await frame(page).boundingBox())?.width ?? 0;
		/* logical px: inline-end is the far side in either direction */
		expect(box.u - box.w / 2).toBeGreaterThan(frameWidth / 2 - 1);
		const card = now.find((own) => own.id === id);
		if (!card) throw new Error("No Card in the other Pane");
		expect(inside(card, box)).toBe(true);
		expect(card.w).toBeGreaterThan(box.w * 0.8);
		/* the Deck stays where it rests */
		for (const other of now)
			if (other.id !== id) {
				const was = rest.find((own) => own.id === other.id);
				expect(was && offBy(other, was)).toBeLessThanOrEqual(0.5);
			}
		await closeButton(page).click();
		await expect(pane(page)).toHaveCount(0);
		await expect(open(page)).toHaveCount(0);
		await expectRest(page, rest);
	});

test("D wide: the panel's icon mirrors in RTL", async ({ page }) => {
	const transformOf = async () => {
		const icon = panel(page).locator("[data-panel-icon] svg").first();
		return icon.evaluate((svg) => {
			const style = getComputedStyle(svg);
			return `${style.transform} / ${style.scale}`;
		});
	};
	await pull(page, front(page), 150, 0);
	const ltr = await transformOf();
	await page.mouse.up();
	await closeButton(page).click();
	await expect(open(page)).toHaveCount(0);
	await inspector(page)
		.getByRole("button", { name: "RTL", exact: true })
		.click();
	await page.mouse.move(5, 5);
	await landed(page);
	await pull(page, front(page), -150, 0);
	expect(ltr).toBe("none / none");
	expect(await transformOf()).toMatch(/matrix\(-1, 0, 0, 1|\/ -1 1$/);
	await page.mouse.up();
});

test("D wide: Escape takes the Card in the other Pane back into its place", async ({
	page,
}) => {
	const rest = await shown(page);
	await openAside(page, 150);
	await page.keyboard.press("Escape");
	await expect(pane(page)).toHaveCount(0);
	await expectRest(page, rest);
});

test("D wide: let go moving, the Card goes in a straight line from where the hand let it go into the other Pane, never back toward inline-start, and no other Card moves", async ({
	page,
}) => {
	const rest = await shown(page);
	const id = rest.at(-1)?.id ?? "";
	const box = await front(page).boundingBox();
	if (!box) throw new Error("Missing card geometry");
	const start = { x: box.x + box.width / 2, y: box.y + 40 };
	await page.mouse.move(start.x, start.y, { steps: 4 });
	const done = await record(page, 900);
	await page.mouse.down();
	/* a swipe let go while moving, about 2.5 px/ms toward inline-end */
	for (const dx of [40, 80, 120, 160]) {
		await page.mouse.move(start.x + dx, start.y);
		await page.waitForTimeout(16);
	}
	await page.mouse.move(start.x + 200, start.y);
	await page.mouse.up();
	const frames = afterRelease(await done());
	await expect(lastRelease(page)).toHaveText(/^other-pane · threshold/);
	const track = trackOf(frames, id);
	const first = track[0];
	const last = track.at(-1);
	if (!first || !last) throw new Error("Nothing sampled");
	expect(last.u - first.u).toBeGreaterThan(100);
	track.slice(1).forEach((at, i) => {
		expect(at.u).toBeGreaterThanOrEqual((track[i]?.u ?? 0) - 0.5);
	});
	/* on the line from where it was let go to where it lands */
	const way = { u: last.u - first.u, v: last.v - first.v };
	const length = Math.hypot(way.u, way.v);
	for (const at of track) {
		const off =
			Math.abs((at.u - first.u) * way.v - (at.v - first.v) * way.u) /
			length;
		expect(off).toBeLessThanOrEqual(1.5);
	}
	expect(inside(last, await paneBox(page))).toBe(true);
	for (const sample of frames)
		for (const card of sample.cards)
			if (card.id !== id) {
				const was = rest.find((own) => own.id === card.id);
				expect(was && offBy(card, was)).toBeLessThanOrEqual(0.5);
			}
});

test("D wide, reduced: the Card dissolves into the other Pane and back, shown only where it was let go or where it lands", async ({
	page,
}) => {
	await reduceMotion(page);
	await page.mouse.move(5, 5);
	await landed(page);
	const rest = await shown(page);
	const id = rest.at(-1)?.id ?? "";
	const done = await record(page, 1200);
	await pull(page, front(page), 150, 0);
	await page.mouse.up();
	await expect(open(page)).toHaveCount(1);
	const frames = afterRelease(await done());
	const track = trackOf(frames, id);
	const first = track[0];
	const last = track.at(-1);
	if (!first || !last) throw new Error("Nothing sampled");
	expect(inside(last, await paneBox(page))).toBe(true);
	for (const at of track)
		expect(Math.min(offBy(at, first), offBy(at, last))).toBeLessThanOrEqual(
			0.5,
		);
	const switched = track.findIndex((at) => offBy(at, last) <= 0.5);
	expect(switched).toBeGreaterThan(0);
	for (const at of [track[switched - 1], track[switched]])
		expect(at?.o ?? 1).toBeLessThanOrEqual(0.25);
	/* back, as the Cover's close dissolves */
	const back = await record(page, 800);
	await closeButton(page).click();
	const closing = trackOf(await back(), id);
	const slot = rest.at(-1);
	if (!slot) throw new Error("No slot");
	for (const at of closing)
		expect(Math.min(offBy(at, last), offBy(at, slot))).toBeLessThanOrEqual(
			0.5,
		);
	await expectRest(page, rest);
});

test("D, Width pinned to phone on a wide screen: inline-end opens the Card into the Cover filling the Deck's Pane, and no other Pane shows", async ({
	page,
}) => {
	await choose(page, "Width", "phone");
	await page.mouse.move(5, 5);
	await landed(page);
	await expect(frame(page)).toHaveAttribute("data-width", "phone");
	await pull(page, front(page), 150, 0);
	await expect(panel(page)).toHaveAttribute("data-panel", "expand");
	await expect(panel(page)).toContainText("Open");
	await page.mouse.up();
	await expect(lastRelease(page)).toHaveText(/^expand · threshold/);
	await expect(open(page)).toHaveCount(1);
	await page.mouse.move(5, 5);
	await landed(page);
	await expect(pane(page)).toHaveCount(0);
	/* a phone's Cover fills its Pane, here the whole frame */
	const cover = await open(page).boundingBox();
	const whole = await frame(page).boundingBox();
	expect(Math.abs((cover?.width ?? 0) - (whole?.width ?? 0))).toBeLessThan(4);
});

for (const width of ["wide", "phone"] as const)
	test(`D ${width}: up opens the Card into the Cover of the Deck's own Pane, and no other Pane shows`, async ({
		page,
	}) => {
		await choose(page, "Width", width);
		await page.mouse.move(5, 5);
		await landed(page);
		await pull(page, front(page), 0, -150);
		await expect(panel(page)).toHaveAttribute("data-panel", "expand");
		await page.mouse.up();
		await expect(open(page)).toHaveCount(1);
		await page.mouse.move(5, 5);
		await landed(page);
		await expect(pane(page)).toHaveCount(0);
		const cover = await open(page).boundingBox();
		const whole = await frame(page).boundingBox();
		if (!cover || !whole) throw new Error("Missing geometry");
		const share = width === "wide" ? 0.5 : 1;
		expect(cover.x + cover.width).toBeLessThanOrEqual(
			whole.x + whole.width * share + 1,
		);
	});

test.describe("on a screen under md", () => {
	test.use({ viewport: { width: 700, height: 1000 } });

	test("D: auto reads a phone, and inline-end and up both open the Card into the Cover", async ({
		page,
	}) => {
		await expect(frame(page)).toHaveAttribute("data-width", "phone");
		for (const [dx, dy] of [
			[150, 0],
			[0, -150],
		] as const) {
			await pull(page, front(page), dx, dy);
			await expect(panel(page)).toHaveAttribute("data-panel", "expand");
			await page.mouse.up();
			await expect(open(page)).toHaveCount(1);
			await expect(pane(page)).toHaveCount(0);
			await page.keyboard.press("Escape");
			await expect(open(page)).toHaveCount(0);
			await page.mouse.move(5, 5);
			await landed(page);
		}
	});
});
