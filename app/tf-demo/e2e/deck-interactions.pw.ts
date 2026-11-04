/// <reference lib="dom" />
import { expect, type Locator, type Page, test } from "@playwright/test";

/**
 * The Deck interactions prototype: every variant behind the inspector's
 * switch, and in B a drag that closes the Deck and one that opens the
 * Card. Releases are slow, so none of them reads as a flick.
 */

test.use({ viewport: { width: 1600, height: 1000 } });

const VARIANTS = ["B · Table", "D · Swipe actions"];

const inspector = (page: Page) =>
	page.getByRole("complementary", { name: "Inspector" });
const frame = (page: Page) => page.locator("[data-deck-frame]");
const front = (page: Page) => frame(page).locator("[data-card-id]").last();

async function chooseVariant(page: Page, name: string) {
	await inspector(page).getByRole("button", { name, exact: true }).click();
}

/** Presses `card` near its top, moves to `to` slowly, rests, and lets go. */
async function carry(
	page: Page,
	card: Locator,
	to: (start: { x: number; y: number }) => Promise<{ x: number; y: number }>,
) {
	const box = await card.boundingBox();
	if (!box) throw new Error("Missing card geometry");
	const start = { x: box.x + box.width / 2, y: box.y + 24 };
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(start.x + 10, start.y + 10, { steps: 2 });
	const end = await to(start);
	await page.mouse.move(end.x, end.y, { steps: 25 });
	await page.waitForTimeout(150);
	await page.mouse.up();
}

/** The middle of a B target, once a carried Card has shown it. */
async function targetCentre(page: Page, target: "tray" | "pad") {
	const box = await frame(page)
		.locator(`[data-target="${target}"]`)
		.last()
		.boundingBox();
	if (!box) throw new Error(`Missing ${target} geometry`);
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function redeal(page: Page) {
	await inspector(page).getByRole("button", { name: "Re-deal" }).click();
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
}

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
