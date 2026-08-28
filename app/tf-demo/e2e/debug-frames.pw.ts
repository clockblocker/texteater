import { expect, test } from "@playwright/test";

test("capture flight frames", async ({ page }) => {
	await page.goto("/playground/sheet-workspace");
	await page
		.locator('[data-workspace-pane="central"]')
		.getByRole("button", { name: "Morgen" })
		.click();
	await expect(
		page.locator('[data-card-layer="central"] [data-card-id]'),
	).toHaveCount(4);

	const card = page
		.locator('[data-card-layer="central"] [data-card-id]')
		.first();
	const east = page.locator('[data-workspace-pane="east"]');
	const cardBox = await card.boundingBox();
	const eastBox = await east.boundingBox();
	if (!cardBox || !eastBox) throw new Error("Missing drag geometry.");

	await page.mouse.move(
		cardBox.x + cardBox.width / 2,
		cardBox.y + cardBox.height / 2,
	);
	await page.mouse.down();
	await page.waitForTimeout(250);
	await page.mouse.move(
		eastBox.x + eastBox.width / 2,
		eastBox.y + eastBox.height / 2,
		{ steps: 12 },
	);
	await page.mouse.up();
	for (const delay of [40, 120, 200, 320]) {
		await page.waitForTimeout(delay === 40 ? 40 : 80);
		await page.screenshot({
			path: `test-results/flight-frame-${delay}.png`,
		});
	}
});
