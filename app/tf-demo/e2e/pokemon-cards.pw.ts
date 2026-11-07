/// <reference lib="dom" />
import { expect, type Locator, test } from "@playwright/test";

/**
 * The vendored pokemon-cards-css page: 88 Cards over its sections, each
 * tilting under the pointer through `--pointer-x`, and popping out to the
 * frame's centre on a click. Card art loads from remote hosts; nothing here
 * waits for it.
 */

const pointerX = (card: Locator) =>
	card.evaluate((node) =>
		Number.parseFloat(
			(node as HTMLElement).style.getPropertyValue("--pointer-x"),
		),
	);

test("the gallery renders Cards of many effects", async ({ page }) => {
	await page.goto("/playground/pokemon-cards");
	const cards = page.locator("[data-pokemon-cards] .card");
	await expect(cards).toHaveCount(88);
	const rarities = new Set(
		await cards.evaluateAll((nodes) =>
			nodes.map((node) => node.getAttribute("data-rarity")),
		),
	);
	for (const rarity of [
		"common",
		"common reverse holo",
		"rare holo",
		"rare holo cosmos",
		"amazing rare",
		"radiant rare",
		"rare holo v",
		"rare holo vmax",
		"rare holo vstar",
		"rare rainbow",
		"rare secret",
		"rare shiny",
	])
		expect(rarities).toContain(rarity);
});

test("the pointer tilts a Card and a click pops it out", async ({ page }) => {
	await page.goto("/playground/pokemon-cards");
	const card = page
		.locator("[data-pokemon-cards] .card[data-rarity='rare holo']")
		.first();
	const rotator = card.locator(".card__rotator");
	await rotator.scrollIntoViewIfNeeded();
	expect(await pointerX(card)).toBe(50);

	const box = await rotator.boundingBox();
	if (!box) throw new Error("the Card has no box");
	await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
	await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.5, {
		steps: 5,
	});
	await expect.poll(() => pointerX(card)).toBeLessThan(30);
	await expect(card).toHaveClass(/interacting/);

	await rotator.click();
	await expect(card).toHaveClass(/active/);
	await expect
		.poll(() =>
			card.evaluate((node) =>
				Number.parseFloat(
					(node as HTMLElement).style.getPropertyValue(
						"--card-scale",
					),
				),
			),
		)
		.toBeGreaterThan(1.2);
});

test("the inspector narrows the page to one effect", async ({ page }) => {
	await page.goto("/playground/pokemon-cards");
	const inspector = page.getByRole("complementary", { name: "Inspector" });
	await inspector.getByRole("button", { name: "Radiant Holofoil" }).click();
	await inspector.getByLabel("Show only the picked effect").check();
	await expect(
		page.locator("[data-pokemon-cards] .card-grid .card"),
	).toHaveCount(3);
	await expect(
		page.locator(
			"[data-pokemon-cards] .card-grid .card[data-rarity='radiant rare']",
		),
	).toHaveCount(3);
});
