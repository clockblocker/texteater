/// <reference lib="dom" />
import { expect, test } from "@playwright/test";
import {
	anchors,
	carry,
	chooseVariant,
	farthestOut,
	frame,
	front,
	inspector,
	lastRelease,
	lift,
	type Moment,
	panel,
	pull,
	redeal,
	rotation,
	shares,
	targetCentre,
	watchApart,
	watchRelease,
} from "./support/deck-interactions";

/**
 * The Deck interactions prototype: every variant behind the inspector's
 * switch, and in B and D a drag that closes the Deck and one that opens
 * the Card. Releases are slow, so none of them reads as a flick, except
 * where a case judges the motion a release while moving starts.
 */

test.use({ viewport: { width: 1600, height: 1000 } });

const VARIANTS = ["B · Table", "D · Swipe actions"];

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

test("B: the tray closes the Deck, the pad opens the Card", async ({
	page,
}) => {
	await chooseVariant(page, "B · Table");
	await carry(page, front(page), () => targetCentre(page, "tray"));
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(0);
	await expect(
		inspector(page).locator('[data-readout="last release"]'),
	).toHaveText("dismiss · tray");
	await redeal(page);
	await carry(page, front(page), () => targetCentre(page, "pad"));
	await expect(frame(page).locator("[data-expanded]")).toHaveCount(1);
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

test("B: a Card just lifted lights nothing and wears no stamp", async ({
	page,
}) => {
	await chooseVariant(page, "B · Table");
	await lift(page, front(page));
	await expect(frame(page).locator('[data-target="pad"]')).toBeVisible();
	await page.waitForTimeout(200);
	await expect(frame(page).locator("[data-target][data-active]")).toHaveCount(
		0,
	);
	await expect(frame(page).locator("[data-stamp]")).toHaveCount(0);
	await page.mouse.up();
});

test("B: only the target under the hand lights, and the release does what it shows", async ({
	page,
}) => {
	await chooseVariant(page, "B · Table");
	const start = await lift(page, front(page));
	const pad = await targetCentre(page, "pad");
	await page.mouse.move((start.x + pad.x) / 2, (start.y + pad.y) / 2, {
		steps: 12,
	});
	await expect(frame(page).locator("[data-target][data-active]")).toHaveCount(
		0,
	);
	await page.mouse.move(pad.x, pad.y, { steps: 12 });
	await expect(
		frame(page).locator('[data-target="pad"][data-active]'),
	).toHaveCount(1);
	await expect(frame(page).locator('[data-stamp="expand"]')).toHaveCount(1);
	await page.mouse.up();
	await expect(frame(page).locator("[data-expanded]")).toHaveCount(1);
});

test("B: a Card dropped over nothing comes home without leaving the frame", async ({
	page,
}) => {
	await chooseVariant(page, "B · Table");
	const card = front(page);
	const id = await card.getAttribute("data-card-id");
	const start = await lift(page, card);
	await page.mouse.move(start.x + 420, start.y + 260, { steps: 20 });
	await page.waitForTimeout(150);
	const home = frame(page).locator(`[data-card-id="${id ?? ""}"]`);
	const sample = farthestOut(home, 900);
	await page.mouse.up();
	expect(await sample).toBe(0);
	await expect(
		inspector(page).locator('[data-readout="last release"]'),
	).toHaveText("back · nothing");
});

test("B: a fast drop on the pad opens the Card in a straight line, never past the Cover or on the way the hand went", async ({
	page,
}) => {
	await chooseVariant(page, "B · Table");
	const card = front(page);
	const start = await lift(page, card);
	const pad = await targetCentre(page, "pad");
	const watched = await watchRelease(card, 700);
	/* a throw onto the pad, let go at speed toward inline-end and up */
	for (const step of [1, 2, 3, 4, 5, 6]) {
		await page.mouse.move(
			start.x + ((pad.x - start.x) * step) / 6,
			start.y + ((pad.y - start.y) * step) / 6,
		);
		if (step < 6) await page.waitForTimeout(16);
	}
	await page.mouse.up();
	const moments = await watched();
	const first = moments[0];
	const last = moments.at(-1);
	if (!first || !last) throw new Error("Nothing sampled");
	await expect(lastRelease(page)).toHaveText("expand · pad");
	await expect(frame(page).locator("[data-expanded]")).toHaveCount(1);
	/* how far an edge strays outside the span from where it was let go to where it opens */
	const stray = (key: keyof Moment) => {
		const low = Math.min(first[key], last[key]);
		const high = Math.max(first[key], last[key]);
		return Math.max(
			...moments.map((f) => Math.max(low - f[key], f[key] - high)),
		);
	};
	for (const key of ["x", "top", "right", "bottom"] as const)
		expect(stray(key), key).toBeLessThanOrEqual(0.5);
});

test("B: the lean relaxes once the hand rests", async ({ page }) => {
	await chooseVariant(page, "B · Table");
	const card = front(page);
	const start = await lift(page, card);
	await page.mouse.move(start.x + 260, start.y + 20, { steps: 6 });
	await page.waitForTimeout(600);
	expect(Math.abs(await rotation(card))).toBeLessThan(0.5);
	await page.mouse.up();
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

test("D: one breakpoint: 1 px short nothing says it will go, at the threshold everything does", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	const rest = await anchors(page);
	await pull(page, front(page), -95, 0);
	await expect(panel(page)).not.toHaveAttribute("data-armed");
	for (const share of await shares(page, rest)) expect(share).toBeLessThan(1);
	await page.mouse.up();
	await expect(lastRelease(page)).toHaveText("back · short 95");
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
	await expect(panel(page)).toHaveCount(0);
	await pull(page, front(page), -96, 0);
	await expect(panel(page)).toHaveAttribute("data-armed", "true");
	for (const share of await shares(page, rest))
		expect(share).toBeCloseTo(1, 3);
	await page.mouse.up();
	await expect(lastRelease(page)).toHaveText("dismiss · threshold 96");
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(0);
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
	const back = frame(page).locator("[data-card-id]").first();
	const box = await card.boundingBox();
	if (!box) throw new Error("Missing card geometry");
	const start = { x: box.x + box.width / 2, y: box.y + 40 };
	/* hovered, so the Deck is still settling out of its fan at the release */
	await page.mouse.move(start.x, start.y, { steps: 4 });
	await expect.poll(() => rotation(back)).toBeLessThan(-11);
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
	const back = frame(page).locator("[data-card-id]").first();
	const box = await card.boundingBox();
	if (!box) throw new Error("Missing card geometry");
	const start = { x: box.x + box.width / 2, y: box.y + 40 };
	/* hovered, so the Deck is still settling out of its fan as it folds */
	await page.mouse.move(start.x, start.y, { steps: 4 });
	await expect.poll(() => rotation(back)).toBeLessThan(-11);
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

test("D: in RTL, inline-start is on the right", async ({ page }) => {
	await chooseVariant(page, "D · Swipe actions");
	await inspector(page)
		.getByRole("button", { name: "RTL", exact: true })
		.click();
	await pull(page, front(page), 150, 0);
	await expect(panel(page)).toHaveAttribute("data-panel", "dismiss");
	await page.mouse.up();
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(0);
});

test("D: a Card from behind slides out under the Cards in front of it", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	const back = frame(page).locator("[data-card-id]").first();
	const z = await back.evaluate(
		(element) => getComputedStyle(element).zIndex,
	);
	await pull(page, back, -80, 0);
	await expect(back).toHaveCSS("z-index", z);
	await expect(panel(page)).toHaveAttribute("data-panel", "dismiss");
	await page.mouse.up();
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
});

test("D: toward Close deck the rest of the Deck folds in at once, and back out on a cancel", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	const rest = await anchors(page);
	const start = await pull(page, front(page), -48, 0);
	const half = await shares(page, rest);
	expect(Math.max(...half) - Math.min(...half)).toBeLessThan(0.01);
	for (const share of half) expect(share).toBeCloseTo(0.5, 2);
	await page.mouse.move(start.x - 150, start.y, { steps: 30 });
	await page.waitForTimeout(150);
	for (const share of await shares(page, rest))
		expect(share).toBeCloseTo(1, 3);
	await page.mouse.move(start.x - 40, start.y, { steps: 30 });
	await page.waitForTimeout(150);
	await page.mouse.up();
	await expect(lastRelease(page)).toHaveText(/^back · short/);
	/* off the Deck, the hover lets it rest */
	await page.mouse.move(8, 8, { steps: 4 });
	await expect
		.poll(async () => Math.max(...(await shares(page, rest)).map(Math.abs)))
		.toBeLessThan(0.01);
});

test("D: the panel never shows above or below the swiped Card", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	const card = front(page);
	/* how far the panel reaches past the Card's top or bottom edge, worst over `ms` of frames */
	const worstPeek = (ms: number) =>
		card.evaluate(
			(element, duration) =>
				new Promise<number>((resolve) => {
					let worst = 0;
					const end = performance.now() + duration;
					const step = () => {
						const shown = document.querySelector("[data-panel]");
						if (
							shown &&
							Number(getComputedStyle(shown).opacity) > 0.01
						) {
							const own = element.getBoundingClientRect();
							const box = shown.getBoundingClientRect();
							worst = Math.max(
								worst,
								own.top - box.top,
								box.bottom - own.bottom,
							);
						}
						if (performance.now() < end)
							requestAnimationFrame(step);
						else resolve(worst);
					};
					requestAnimationFrame(step);
				}),
			ms,
		);
	const start = await pull(page, card, -40, 0);
	expect(await worstPeek(100)).toBeLessThanOrEqual(0);
	await page.mouse.move(start.x - 130, start.y, { steps: 20 });
	expect(await worstPeek(200)).toBeLessThanOrEqual(0);
	await page.mouse.move(start.x - 60, start.y, { steps: 10 });
	const returning = worstPeek(500);
	await page.mouse.up();
	expect(await returning).toBeLessThanOrEqual(0);
});

test("B: a hovered Deck fans slightly, and settles back while a Card is pressed", async ({
	page,
}) => {
	await chooseVariant(page, "B · Table");
	const card = front(page);
	const back = frame(page).locator("[data-card-id]").first();
	const box = await card.boundingBox();
	if (!box) throw new Error("Missing card geometry");
	await page.mouse.move(box.x + box.width / 2, box.y + 40, { steps: 4 });
	await expect.poll(() => rotation(back)).toBeLessThan(-11);
	await page.mouse.down();
	await expect
		.poll(async () => Math.abs(await rotation(back)))
		.toBeLessThan(0.5);
	await page.mouse.up();
	await expect.poll(() => rotation(back)).toBeLessThan(-11);
});

test("D: a hovered Deck fans, settles back on press, and fans again after a cancel on it", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	const card = front(page);
	const back = frame(page).locator("[data-card-id]").first();
	const box = await card.boundingBox();
	if (!box) throw new Error("Missing card geometry");
	const start = { x: box.x + box.width / 2, y: box.y + 40 };
	await page.mouse.move(start.x, start.y, { steps: 4 });
	await expect.poll(() => rotation(back)).toBeLessThan(-11);
	await page.mouse.down();
	await expect
		.poll(async () => Math.abs(await rotation(back)))
		.toBeLessThan(0.5);
	await page.mouse.move(start.x - 60, start.y, { steps: 20 });
	await page.waitForTimeout(150);
	await page.mouse.move(start.x - 10, start.y, { steps: 10 });
	await page.mouse.up();
	await expect(lastRelease(page)).toHaveText(/^back · short/);
	await expect.poll(() => rotation(back)).toBeLessThan(-11);
});
