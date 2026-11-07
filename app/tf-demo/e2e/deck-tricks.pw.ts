/// <reference lib="dom" />
import { expect, test } from "@playwright/test";

/**
 * deck-of-cards' tricks on tf-demo's own Deck model: it deals 52 Cards, and
 * the inspector's Fan spreads them from −130° to 130°, as the vendored
 * entry's does (`deck-of-cards.pw.ts`). The fan queues behind the intro and
 * the sort, which take about 3.5 s.
 */

test("Fan in the inspector spreads all 52 Cards, as deck-of-cards does", async ({
	page,
}) => {
	await page.goto("/playground/deck-tricks");
	const cards = page.locator("[data-deck-tricks] [data-card-id]");
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
					/rotate\(-?\d/.test(node.style.transform),
			).length,
	);
	expect(rotated).toBe(52);
});

test("the surface shows only the felt and the Cards", async ({ page }) => {
	await page.goto("/playground/deck-tricks");
	const felt = page.locator("[data-deck-tricks]");
	await expect(felt.locator("[data-card-id]")).toHaveCount(52);
	await expect(felt.getByRole("button")).toHaveCount(0);
	await expect(felt).not.toContainText("Fan");
});
