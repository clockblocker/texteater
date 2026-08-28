import { expect, test } from "@playwright/test";

test("capture return-to-deck frames", async ({ page }) => {
	await page.goto("/playground/sheet-workspace");
	await page
		.locator('[data-workspace-pane="central"]')
		.getByRole("button", { name: "Morgen" })
		.click();
	const deck = page.locator('[data-card-layer="central"]');
	await expect(deck.locator("[data-card-id]")).toHaveCount(4);

	// Lift the foremost card well above the deck, then drop it back onto
	// the deck itself (ReturnCard flight).
	const card = deck.locator("[data-card-id]").first();
	const cardBox = await card.boundingBox();
	if (!cardBox) throw new Error("Missing card geometry.");
	await page.mouse.move(
		cardBox.x + cardBox.width / 2,
		cardBox.y + cardBox.height / 2,
	);
	await page.mouse.down();
	await page.waitForTimeout(250);
	await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y - 180, {
		steps: 10,
	});
	await page.waitForTimeout(100);
	await page.mouse.move(
		cardBox.x + cardBox.width / 2,
		cardBox.y + cardBox.height / 2,
		{ steps: 6 },
	);
	await page.mouse.up();
	await page.waitForTimeout(500);

	const info = await page.evaluate(() => {
		const cards = [
			...document.querySelectorAll("[data-card-id]"),
		].map((el) => ({
			id: el.getAttribute("data-card-id"),
			opacity: getComputedStyle(el).opacity,
			dropping: el.classList.contains("card-sheet-workspace__card--dropping"),
		}));
		return { cards };
	});
	console.log(JSON.stringify(info, null, 2));
	await expect(deck.locator("[data-card-id]")).toHaveCount(4);
});
