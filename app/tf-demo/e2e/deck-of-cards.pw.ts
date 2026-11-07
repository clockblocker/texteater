/// <reference lib="dom" />
import { expect, test } from "@playwright/test";

/**
 * The vendored deck-of-cards library on its felt: it deals 52 Cards, and the
 * inspector's Fan spreads them from −130° to 130°. The fan queues behind the
 * intro and the sort, which take about 3.5 s.
 */

test("Fan in the inspector spreads all 52 Cards", async ({ page }) => {
	await page.goto("/playground/deck-of-cards");
	const cards = page.locator("[data-deck-of-cards] .card");
	await expect(cards).toHaveCount(52);

	await page
		.getByRole("complementary", { name: "Inspector" })
		.getByRole("button", { name: "Fan", exact: true })
		.click();

	// Card 51 is mounted first and sorted to the bottom, so it fans furthest left.
	await expect(cards.first()).toHaveAttribute("style", /rotate\(-130deg\)/, {
		timeout: 10_000,
	});
	await expect(cards.last()).toHaveAttribute("style", /rotate\(130deg\)/);
	const rotated = await cards.evaluateAll(
		(nodes) =>
			nodes.filter(
				(node) =>
					node instanceof HTMLElement &&
					/rotate\(/.test(node.style.transform),
			).length,
	);
	expect(rotated).toBe(52);
});
