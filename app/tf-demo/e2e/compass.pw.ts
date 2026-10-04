/// <reference lib="dom" />
import { expect, type Locator, type Page, test } from "@playwright/test";

/**
 * The Compass renderer beyond the deck's motion: right-to-left text, the
 * narrow screen, the keyboard's Lift and Expand, and a short Pane. Run in
 * the deck-models playground, which renders the production Compass.
 */

async function press(page: Page, card: Locator, dx: number, dy: number) {
	const heading = await card.locator("[data-heading]").boundingBox();
	if (!heading) throw new Error("Missing heading geometry");
	const x = heading.x + heading.width / 2;
	const y = heading.y + heading.height / 2;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x + dx, y + dy, { steps: 5 });
	return { x, y };
}

async function deal(frame: Locator) {
	await frame.locator('[data-word="noch"]').click();
	await expect(frame.locator('[data-form="card"]')).toHaveCount(4);
}

test.describe("in right-to-left text", () => {
	test.use({ viewport: { width: 1600, height: 1100 } });

	test("Back and the swipe point toward inline-start, and the edges flip", async ({
		page,
	}) => {
		await page.goto("/playground/deck-models");
		await page.getByLabel("Right-to-left").check();
		const frame = page.locator("[data-deck-frame]");
		const cards = frame.locator('[data-form="card"]');

		/* ← mirrors: it points to the right, toward inline-start */
		const back = frame
			.locator('[data-deck-pane="root"]')
			.getByRole("button", { name: "Back to Library" })
			.locator("svg");
		await expect
			.poll(() => back.evaluate((svg) => getComputedStyle(svg).scale))
			.toBe("-1 1");

		/* a drag leftward is no swipe: the Card is in hand */
		await deal(frame);
		await press(page, frame.locator('[data-place="open"]'), -110, 0);
		await expect(frame.locator("[data-arm]")).toHaveCount(0);
		await expect(frame.locator("[data-held]")).toHaveCount(1);
		await page.keyboard.press("Escape");
		await page.mouse.up();
		await expect(frame.locator("[data-held]")).toHaveCount(0);
		await expect(cards).toHaveCount(4);

		/* rightward swipes the Deck, and letting go past the line sweeps it */
		await press(page, frame.locator('[data-place="open"]'), 110, 0);
		await expect(frame.locator('[data-arm="sweep"]')).toHaveCount(1);
		await page.mouse.up();
		await expect(cards).toHaveCount(0);

		/* the right edge is inline-start: the new Pane opens first in
		   reading order, which is on the right */
		await deal(frame);
		await press(page, frame.locator('[data-place="open"]'), 30, 0);
		const box = await frame.boundingBox();
		if (!box) throw new Error("Missing frame geometry");
		await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2, {
			steps: 10,
		});
		await expect(
			frame.locator('[data-edge="right"][data-active="true"]'),
		).toHaveCount(1);
		await page.mouse.up();
		const floating = frame.locator('[data-pane-kind="floating"]');
		await expect(floating).toHaveCount(1);
		const root = await frame
			.locator('[data-deck-pane="root"]')
			.boundingBox();
		const spawned = await floating.boundingBox();
		expect(spawned?.x ?? 0).toBeGreaterThan(root?.x ?? 0);
	});
});

test.describe("on a narrow screen", () => {
	test.use({ viewport: { width: 700, height: 900 } });

	test("there is one Pane, no edge drops, and a would-be Pane opens as a full Cover", async ({
		page,
	}) => {
		await page.goto("/playground/deck-models");
		const frame = page.locator("[data-deck-frame]");
		await expect(frame).toHaveAttribute("data-narrow", "true");
		/* a split made elsewhere is not drawn: the Active Pane alone */
		await page
			.getByRole("button", { name: "Spawn an empty Rooted Pane" })
			.click();
		await expect(frame.locator("[data-deck-pane]")).toHaveCount(1);

		await deal(frame);
		await press(page, frame.locator('[data-place="open"]'), 20, 0);
		await expect(frame.locator("[data-held]")).toHaveCount(1);
		await expect(frame.locator("[data-edge]")).toHaveCount(0);
		const box = await frame.boundingBox();
		if (!box) throw new Error("Missing frame geometry");
		/* at the very side, above the Deck: where a wide screen would
		   spawn a Pane. (Over the Deck, the return band spans the Pane.) */
		await page.mouse.move(box.x + box.width - 4, box.y + 100, {
			steps: 10,
		});
		await page.mouse.up();
		await expect(frame.locator("[data-deck-pane]")).toHaveCount(1);
		const cover = frame.locator('[data-form="sheet"]');
		await expect(cover).toHaveCount(1);
		const pane = await frame.locator("[data-deck-pane]").boundingBox();
		await expect
			.poll(async () => (await cover.boundingBox())?.width ?? 0)
			.toBeCloseTo(pane?.width ?? -1, 0);
		/* the Deck and Back work as usual */
		await frame
			.getByRole("button", { name: "Collapse back to card" })
			.click();
		await expect(frame.locator('[data-form="card"]')).toHaveCount(4);
	});
});

test.describe("from the keyboard", () => {
	test.use({ viewport: { width: 1600, height: 1100 } });

	test("a Card opens as a Cover, and a Lift walks the destinations to a new Pane", async ({
		page,
	}) => {
		await page.goto("/playground/deck-models");
		const frame = page.locator("[data-deck-frame]");
		await deal(frame);

		/* Open is Expand: the Card is a Cover in its Pane */
		await frame
			.locator('[data-place="open"]')
			.getByRole("button", { name: /as a Cover$/ })
			.focus();
		await page.keyboard.press("Enter");
		const cover = frame.locator('[data-form="sheet"]');
		await expect(cover).toHaveCount(1);

		/* Lift holds the Cover; the arrows choose, Escape cancels */
		await cover.getByRole("button", { name: /^Lift / }).focus();
		await page.keyboard.press("Enter");
		await expect(frame.locator("[data-held]")).toHaveCount(1);
		await page.keyboard.press("Escape");
		await expect(frame.locator("[data-held]")).toHaveCount(0);
		await expect(cover).toHaveCount(1);

		/* home first, then the inline-start edge: Enter lets go there */
		await cover.getByRole("button", { name: /^Lift / }).focus();
		await page.keyboard.press("Enter");
		await expect(
			frame.locator('[data-zone="cover"][data-active="true"]'),
		).toHaveCount(1);
		await page.keyboard.press("ArrowRight");
		await expect(
			frame.locator('[data-edge="left"][data-active="true"]'),
		).toHaveCount(1);
		await page.keyboard.press("Enter");
		const floating = frame.locator('[data-pane-kind="floating"]');
		await expect(floating).toHaveCount(1);
		const root = await frame
			.locator('[data-deck-pane="root"]')
			.boundingBox();
		expect((await floating.boundingBox())?.x ?? 1).toBeLessThan(
			root?.x ?? 0,
		);

		/* a resting Card lifts too, and Escape puts it back on its Deck */
		const cards = frame.locator('[data-form="card"]');
		await expect(cards).toHaveCount(3);
		await frame
			.locator('[data-place="open"]')
			.getByRole("button", { name: /^Lift / })
			.focus();
		await page.keyboard.press("Enter");
		await expect(frame.locator("[data-held]")).toHaveCount(1);
		await page.keyboard.press("Escape");
		await expect(frame.locator("[data-held]")).toHaveCount(0);
		await expect(cards).toHaveCount(3);

		/* the Floating Ground lifts by its Pane bar's handle; let go at
		   home, it stays */
		await floating.getByRole("button", { name: /^Lift / }).focus();
		await page.keyboard.press("Enter");
		await expect(frame.locator("[data-held]")).toHaveCount(1);
		await page.keyboard.press("Enter");
		await expect(frame.locator("[data-held]")).toHaveCount(0);
		await expect(floating).toHaveCount(1);
	});
});

test.describe("in a short Pane", () => {
	test.use({ viewport: { width: 1600, height: 560 } });

	test("the Deck fits inside its Pane", async ({ page }) => {
		await page.goto("/playground/deck-models");
		const frame = page.locator("[data-deck-frame]");
		await deal(frame);
		const pane = await frame
			.locator('[data-deck-pane="root"]')
			.boundingBox();
		if (!pane) throw new Error("Missing pane geometry");
		const boxes = await frame
			.locator('[data-form="card"]')
			.evaluateAll((cards) =>
				cards.map((card) => card.getBoundingClientRect().toJSON()),
			);
		for (const box of boxes) {
			expect(box.top).toBeGreaterThanOrEqual(pane.y);
			expect(box.bottom).toBeLessThanOrEqual(pane.y + pane.height);
		}
	});
});
