/// <reference lib="dom" />
import { expect, type Locator, test } from "@playwright/test";

/**
 * deck-of-cards' tricks on tf-demo's own Deck model: it deals 52 Cards, and
 * the inspector's Fan spreads them from −130° to 130°, as the library
 * does; its Flip turns each Card over in 3D. Both queue behind the intro
 * and the sort, which take about 3.5 s.
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

/** The angle a Card's turning element shows, from its inline transform. */
async function turnAngle(card: Locator) {
	return card
		.locator("[data-card-turn]")
		.evaluate((node) =>
			Number(
				/rotateY\((-?[\d.]+)deg\)/.exec(
					node instanceof HTMLElement ? node.style.transform : "",
				)?.[1] ?? Number.NaN,
			),
		);
}

test("Flip turns every Card over in 3D, through the angles between", async ({
	page,
}) => {
	await page.goto("/playground/deck-tricks");
	const cards = page.locator("[data-deck-tricks] [data-card-id]");
	await expect(cards).toHaveCount(52);
	const inspector = page.getByRole("complementary", { name: "Inspector" });
	const flip = inspector.getByRole("button", { name: "Flip", exact: true });
	const card = cards.nth(20);

	// The intro leaves the Deck face down; Flip turns it face up, half a round on.
	await flip.click();
	await expect.poll(() => turnAngle(card), { timeout: 10_000 }).toBe(360);
	await expect(card.locator("[data-card-turn]")).toHaveCSS(
		"transform-style",
		"preserve-3d",
	);
	await expect(card.locator('[data-side="back"]')).toHaveCSS(
		"backface-visibility",
		"hidden",
	);

	// Slowed four times, the next Flip is caught mid-turn on its way face down.
	await inspector.getByRole("button", { name: "0.25×" }).click();
	await flip.click();
	await expect
		.poll(
			async () => {
				const angle = await turnAngle(card);
				return angle > 360 && angle < 540;
			},
			{ timeout: 5_000, intervals: [16] },
		)
		.toBe(true);
	await expect.poll(() => turnAngle(card), { timeout: 5_000 }).toBe(540);
});
