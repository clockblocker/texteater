import { expect, type Locator, type Page, test } from "@playwright/test";

async function dragToReturnLayer(page: Page, source: Locator) {
	const sourceBox = await source.boundingBox();
	if (!sourceBox) throw new Error("Missing drag geometry.");
	await page.mouse.move(
		sourceBox.x + sourceBox.width / 2,
		sourceBox.y + sourceBox.height / 2,
	);
	await page.mouse.down();
	const layer = page.locator("[data-return-layer]");
	await expect(layer).toBeVisible();
	const layerBox = await layer.boundingBox();
	if (!layerBox) throw new Error("Missing return-layer geometry.");
	await page.mouse.move(
		layerBox.x + layerBox.width / 2,
		layerBox.y + layerBox.height / 2,
		{ steps: 8 },
	);
	await page.mouse.up();
}

async function openCards(page: Page) {
	await page.getByRole("button", { name: "Banken" }).click();
	await expect(page.locator("[data-card-layer]")).toHaveCount(1);
	await expect(page.locator('[data-presentation-form="Card"]')).toHaveCount(
		4,
	);
}

test("Cards and Sheets preserve one layer through lift, expand, return, cancel, close, and split", async ({
	page,
}) => {
	await page.goto("/playground/dynamic-panes");
	const workspace = page.locator(".workspace");
	await expect(workspace.locator("[data-workspace-pane]")).toHaveCount(1);

	await openCards(page);
	const pane = workspace.locator("[data-workspace-pane]");
	const originalCardIds = await workspace
		.locator('[data-presentation-form="Card"]')
		.evaluateAll((cards) =>
			cards.map((card) => card.dataset.presentationId),
		);
	const firstCardTail = page
		.getByRole("button", { name: /Lift .* Card$/ })
		.first();

	// The diagram is a view of the live state machine. While holding a Card it
	// includes the cancellation arrow back to the opening composition.
	await page.getByRole("button", { name: "Playground controls" }).click();
	await page.getByRole("button", { name: "Show state machine" }).click();
	await expect(
		page.getByRole("complementary", { name: "Workspace state machine" }),
	).toBeVisible();

	const firstCardBox = await firstCardTail.boundingBox();
	if (!firstCardBox) throw new Error("Missing Card geometry.");
	await page.mouse.move(
		firstCardBox.x + firstCardBox.width / 2,
		firstCardBox.y + firstCardBox.height / 2,
	);
	await page.mouse.down();
	const lifted = page.locator("[data-lifted-presentation]");
	await expect(lifted).toHaveCount(1);
	const liftedId = await lifted.getAttribute("data-lifted-presentation");
	expect(liftedId).toBe(originalCardIds[0]);
	await expect(
		workspace.locator(`[data-presentation-id="${liftedId}"]`),
	).toHaveCount(0);
	await expect(
		workspace.locator('[data-presentation-form="Card"]'),
	).toHaveCount(3);
	await expect(page.locator('[data-cancel="true"]')).toHaveCount(1);

	// Drop in the unoccupied lower portion of the same Pane: the Card becomes
	// the top Sheet while its original Card Layer remains below it.
	const paneBox = await pane.boundingBox();
	if (!paneBox) throw new Error("Missing Pane geometry.");
	await page.mouse.move(
		paneBox.x + paneBox.width * 0.75,
		paneBox.y + paneBox.height * 0.75,
		{ steps: 8 },
	);
	await page.mouse.up();
	await expect(
		workspace.locator('[data-presentation-form="Sheet"]'),
	).toHaveCount(2);
	await expect(
		workspace.locator(
			'[data-presentation-form="Sheet"][data-covered="true"]',
		),
	).toHaveCount(1);
	await expect(
		workspace.locator('[data-presentation-form="Card"]'),
	).toHaveCount(0);

	// Cancelling a Sheet lift restores the expanded Sheet checkpoint.
	const sheetLift = page
		.getByRole("button", { name: /Lift .* Sheet from bottom edge/ })
		.first();
	const sheetLiftBox = await sheetLift.boundingBox();
	if (!sheetLiftBox) throw new Error("Missing Sheet geometry.");
	await page.mouse.move(
		sheetLiftBox.x + sheetLiftBox.width / 2,
		sheetLiftBox.y + sheetLiftBox.height / 2,
	);
	await page.mouse.down();
	await expect(lifted).toHaveCount(1);
	await expect(
		workspace.locator('[data-presentation-form="Sheet"]'),
	).toHaveCount(1);
	await page.keyboard.press("Escape");
	await page.mouse.up();
	await expect(lifted).toHaveCount(0);
	await expect(
		workspace.locator('[data-presentation-form="Sheet"]'),
	).toHaveCount(2);

	// Lifting the Sheet exposes its retained Layer. Returning to the layer
	// restores the member at its original position and form.
	await dragToReturnLayer(
		page,
		page
			.getByRole("button", { name: /Lift .* Sheet from bottom edge/ })
			.first(),
	);
	await expect(workspace.locator("[data-lifted-presentation]")).toHaveCount(
		0,
	);
	await expect(
		workspace.locator('[data-presentation-form="Sheet"]'),
	).toHaveCount(1);
	await expect(
		workspace.locator('[data-presentation-form="Card"]'),
	).toHaveCount(4);
	expect(
		await workspace
			.locator('[data-presentation-form="Card"]')
			.evaluateAll((cards) =>
				cards.map((card) => card.dataset.presentationId),
			),
	).toEqual(originalCardIds);

	await workspace.getByRole("button", { name: "Close Cards" }).click();
	await expect(workspace.locator("[data-card-layer]")).toHaveCount(0);
	await expect(
		workspace.locator('[data-presentation-form="Sheet"]'),
	).toHaveCount(1);

	await openCards(page);
	const sourceBox = await page
		.getByRole("button", { name: /Lift .* Card$/ })
		.first()
		.boundingBox();
	if (!sourceBox) throw new Error("Missing Card geometry.");
	await page.mouse.move(
		sourceBox.x + sourceBox.width / 2,
		sourceBox.y + sourceBox.height / 2,
	);
	await page.mouse.down();
	await page.mouse.move(paneBox.x + 12, paneBox.y + paneBox.height / 2, {
		steps: 8,
	});
	await page.mouse.up();
	await expect(workspace.locator("[data-workspace-pane]")).toHaveCount(2);
	await dragToReturnLayer(
		page,
		page.getByRole("button", {
			name: "Lift Reading Sheet from bottom edge",
		}),
	);
	await expect(workspace.locator("[data-workspace-pane]")).toHaveCount(1);
});
