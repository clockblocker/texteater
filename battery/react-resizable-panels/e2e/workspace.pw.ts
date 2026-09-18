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
	await page.getByRole("button", { name: "Banken", exact: true }).click();
	await expect(page.locator("[data-card-layer]")).toHaveCount(1);
	await expect(page.locator('[data-presentation-form="Card"]')).toHaveCount(
		4,
	);
}

async function dismissFromPaneBackground(page: Page) {
	const sheet = page.locator(".workspace__sheet").first();
	const box = await sheet.boundingBox();
	if (!box) throw new Error("Missing Sheet geometry.");
	// The reading column is centered, so this point is in the same pane's
	// background while remaining clear of the edge lift handles.
	await page.mouse.click(box.x + 12, box.y + box.height / 2, { delay: 40 });
}

test("Cards and Sheets preserve one layer through lift, expand, return, cancel, close, and split", async ({
	page,
}) => {
	await page.goto("/");
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
	await expect(
		page.getByRole("complementary", { name: "Workspace state machine" }),
	).toBeVisible();
	await expect(page.locator('[data-cancel="true"]')).toHaveCount(0);

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

	await dismissFromPaneBackground(page);
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

test("a deck stays open for segment changes, scrolling, and gestures, then Escape dismisses it", async ({
	page,
}) => {
	await page.goto("/");
	const workspace = page.locator(".workspace");
	await openCards(page);

	const layer = workspace.locator("[data-card-layer]");
	const bankenLayerId = await layer.getAttribute("data-card-layer");
	await workspace
		.locator(".workspace__sheet")
		.getByRole("button", { name: "sind", exact: true })
		.click();
	await expect(layer).toHaveCount(1);
	expect(await layer.getAttribute("data-card-layer")).not.toBe(bankenLayerId);
	await expect(layer.locator('[data-presentation-form="Card"]')).toHaveCount(
		4,
	);

	const sheet = workspace.locator(".workspace__sheet");
	await sheet.hover({ position: { x: 8, y: 100 } });
	await page.mouse.wheel(0, 360);
	await expect(layer).toHaveCount(1);

	const cardTail = page
		.getByRole("button", { name: /Lift .* Card$/ })
		.first();
	await dragToReturnLayer(page, cardTail);
	await expect(layer).toHaveCount(1);
	await expect(layer.locator('[data-presentation-form="Card"]')).toHaveCount(
		4,
	);

	await page.keyboard.press("Escape");
	await expect(layer).toHaveCount(0);
});

test("a deck keeps its place while the Sheet scrolls", async ({ page }) => {
	await page.goto("/");
	const sheet = page.locator(".workspace__sheet");
	const before = await sheet.boundingBox();
	await openCards(page);
	const deck = page.locator("[data-card-layer]");
	const box = await deck.boundingBox();
	if (!before || !box) throw new Error("Missing geometry");
	expect(await sheet.boundingBox()).toEqual(before);
	await sheet.hover({ position: { x: 8, y: 100 } });
	await page.mouse.wheel(0, 240);
	await expect
		.poll(async () => sheet.evaluate((el) => el.scrollTop))
		.toBeGreaterThan(0);
	expect(await deck.boundingBox()).toEqual(box);
});

test("top edge expands without creating a split", async ({ page }) => {
	await page.goto("/");
	await openCards(page);
	const handle = page.getByRole("button", {
		name: "Lift Reading Card",
		exact: true,
	});
	const box = await handle.boundingBox();
	const pane = page.locator("[data-workspace-pane]");
	const paneBox = await pane.boundingBox();
	if (!box || !paneBox) throw new Error("Missing geometry");
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await expect(
		page.locator('.workspace__edge-hint[data-edge="top"]'),
	).toHaveCount(0);
	await page.mouse.move(paneBox.x + paneBox.width / 2, paneBox.y + 8, {
		steps: 8,
	});
	await expect(page.locator(".workspace__drop")).toHaveAttribute(
		"data-edge",
		"inside",
	);
	await page.mouse.up();
	await expect(pane).toHaveCount(1);
	await expect(page.locator('[data-presentation-form="Sheet"]')).toHaveCount(
		2,
	);
});

test("bottom resize clearance does not start a Sheet lift", async ({
	page,
}) => {
	await page.goto("/");
	const pane = page.locator("[data-workspace-pane]");
	const box = await pane.boundingBox();
	if (!box) throw new Error("Missing pane geometry");
	await page.mouse.move(box.x + box.width / 2, box.y + box.height - 3);
	await page.mouse.down();
	await page.mouse.move(box.x + box.width / 2, box.y + box.height - 8);
	await expect(page.locator("[data-lifted-presentation]")).toHaveCount(0);
	await page.mouse.up();
	const handle = await page
		.getByRole("button", {
			name: "Lift Source text Sheet from bottom edge",
		})
		.boundingBox();
	if (!handle) throw new Error("Missing lift handle");
	expect(
		box.y + box.height - handle.y - handle.height,
	).toBeGreaterThanOrEqual(12);
	await page.mouse.move(
		handle.x + handle.width / 2,
		handle.y + handle.height / 2,
	);
	await page.mouse.down();
	await expect(page.locator("[data-lifted-presentation]")).toHaveCount(1);
	await page.keyboard.press("Escape");
	await page.mouse.up();
});

test("return target accepts a drop just outside the deck without a label", async ({
	page,
}) => {
	await page.goto("/");
	await openCards(page);
	const deck = page.locator("[data-card-layer]");
	const bounds = await deck.boundingBox();
	const tail = await page
		.getByRole("button", { name: "Lift Reading Card", exact: true })
		.boundingBox();
	if (!bounds || !tail) throw new Error("Missing deck geometry");
	await page.mouse.move(tail.x + tail.width / 2, tail.y + tail.height / 2);
	await page.mouse.down();
	await page.mouse.move(bounds.x - 6, bounds.y + bounds.height / 2, {
		steps: 8,
	});
	await expect(deck).toHaveAttribute("data-return-target", "true");
	await expect(
		page.getByText("Return to Cards", { exact: true }),
	).toHaveCount(0);
	await page.mouse.up();
	await expect(page.locator('[data-presentation-form="Card"]')).toHaveCount(
		4,
	);
	await expect(page.locator('[data-presentation-form="Sheet"]')).toHaveCount(
		1,
	);
});

test("double-clicking top handles expands and restores the retained deck", async ({
	page,
}) => {
	await page.goto("/");
	await openCards(page);
	const ids = await page
		.locator('[data-presentation-form="Card"]')
		.evaluateAll((cards) =>
			cards.map((card) => card.dataset.presentationId),
		);
	const handle = page
		.getByRole("button", { name: /Lift .* Card from top edge/ })
		.first();
	const box = await handle.boundingBox();
	if (!box) throw new Error("Missing handle");
	// Each press temporarily lifts and remounts the handle.
	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
		delay: 40,
	});
	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
		delay: 40,
	});
	await expect(page.locator(".workspace__sheet")).toHaveCount(2);
	const sheetHandle = page
		.getByRole("button", { name: /Lift .* Sheet from top edge/ })
		.last();
	const sheetBox = await sheetHandle.boundingBox();
	if (!sheetBox) throw new Error("Missing Sheet handle");
	await page.mouse.click(
		sheetBox.x + sheetBox.width / 2,
		sheetBox.y + sheetBox.height / 2,
		{ delay: 40 },
	);
	await page.mouse.click(
		sheetBox.x + sheetBox.width / 2,
		sheetBox.y + sheetBox.height / 2,
		{ delay: 40 },
	);
	await expect(page.locator(".workspace__sheet")).toHaveCount(1);
	expect(
		await page
			.locator('[data-presentation-form="Card"]')
			.evaluateAll((cards) =>
				cards.map((card) => card.dataset.presentationId),
			),
	).toEqual(ids);
});

test("bodies and every deck footer toggle the same presentation", async ({
	page,
}) => {
	await page.goto("/");
	await openCards(page);
	const card = page.locator(".workspace__card").first();
	const id = await card.getAttribute("data-presentation-id");
	await card.dblclick({ position: { x: 80, y: 300 } });
	await expect(page.locator(".workspace__sheet")).toHaveCount(2);
	await page
		.locator(".workspace__sheet")
		.last()
		.dblclick({ position: { x: 80, y: 350 } });
	await expect(
		page.locator(
			`[data-presentation-id="${id}"][data-presentation-form="Card"]`,
		),
	).toBeVisible();
	for (const label of ["Lemma", "Surface", "Attestation"]) {
		const footer = page.getByRole("button", {
			name: `Lift ${label} Card`,
			exact: true,
		});
		// Hovering waits for the restored deck to settle before measuring.
		await footer.hover();
		const box = await footer.boundingBox();
		if (!box) throw new Error("Missing footer");
		await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
			delay: 40,
		});
		await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
			delay: 40,
		});
		await expect(page.locator(".workspace__sheet")).toHaveCount(2);
		await page
			.locator(".workspace__sheet")
			.last()
			.dblclick({ position: { x: 10, y: 350 } });
		await expect(page.locator(".workspace__sheet")).toHaveCount(1);
	}
});

test("back swipe returns a Sheet to its deck without treating vertical scroll as back", async ({
	page,
}) => {
	await page.goto("/");
	await openCards(page);
	await page
		.locator(".workspace__card")
		.first()
		.dblclick({ position: { x: 80, y: 300 } });
	const sheet = page.locator(".workspace__sheet").last();
	await sheet.hover({ position: { x: 80, y: 350 } });
	await page.mouse.wheel(-10, 120);
	await expect(page.locator(".workspace__sheet")).toHaveCount(2);
	await page.mouse.wheel(-100, 0);
	await expect(page.locator(".workspace__sheet")).toHaveCount(1);
	await expect(page.locator('[data-presentation-form="Card"]')).toHaveCount(
		4,
	);
	// Momentum cannot collapse another presentation or close the restored deck.
	await page.mouse.wheel(-150, 0);
	await expect(page.locator("[data-card-layer]")).toHaveCount(1);
});

test("forward swipe restores the last back swipe until the deck changes", async ({
	page,
}) => {
	await page.goto("/");
	await openCards(page);
	const id = await page
		.locator(".workspace__card")
		.first()
		.getAttribute("data-presentation-id");
	await page
		.locator(".workspace__card")
		.first()
		.dblclick({ position: { x: 80, y: 300 } });
	await page
		.locator(".workspace__sheet")
		.last()
		.hover({ position: { x: 80, y: 350 } });
	await page.mouse.wheel(-100, 0);
	await expect(page.locator(".workspace__sheet")).toHaveCount(1);
	// Separate physical gestures by the momentum quiet period.
	await page.waitForTimeout(300);
	await page.mouse.wheel(100, 0);
	await expect(
		page.locator(
			`[data-presentation-id="${id}"][data-presentation-form="Sheet"]`,
		),
	).toBeVisible();
	await page.waitForTimeout(300);
	await page.mouse.wheel(-100, 0);
	await expect(page.locator(".workspace__sheet")).toHaveCount(1);
	await page.keyboard.press("Escape");
	await openCards(page);
	await page.waitForTimeout(300);
	await page
		.locator(".workspace__sheet")
		.hover({ position: { x: 10, y: 350 } });
	await page.mouse.wheel(100, 0);
	await expect(page.locator(".workspace__sheet")).toHaveCount(1);
});

test("workspace reserves horizontal overscroll at the browser root", async ({
	page,
}) => {
	await page.goto("/");
	await expect(page.locator("html")).toHaveCSS(
		"overscroll-behavior-x",
		"none",
	);
	await expect(page.locator("body")).toHaveCSS(
		"overscroll-behavior-x",
		"none",
	);
	await page.goto("/?empty");
	await expect(page.locator("html")).toHaveCSS(
		"overscroll-behavior-x",
		"auto",
	);
});

for (const edge of ["right", "bottom"] as const) {
	test(`a ${edge} split can be resized through its separator`, async ({
		page,
	}) => {
		await page.goto("/");
		await openCards(page);
		const tail = page
			.getByRole("button", { name: /Lift .* Card$/ })
			.first();
		await tail.hover();
		const tailBox = await tail.boundingBox();
		const paneBox = await page
			.locator("[data-workspace-pane]")
			.boundingBox();
		if (!tailBox || !paneBox) throw new Error("Missing split geometry.");
		await page.mouse.move(
			tailBox.x + tailBox.width / 2,
			tailBox.y + tailBox.height / 2,
		);
		await page.mouse.down();
		await page.mouse.move(
			paneBox.x +
				(edge === "right" ? paneBox.width - 4 : paneBox.width / 2),
			paneBox.y +
				(edge === "bottom" ? paneBox.height - 4 : paneBox.height / 2),
			{ steps: 8 },
		);
		await page.mouse.up();
		const panes = page.locator("[data-workspace-pane]");
		await expect(panes).toHaveCount(2);
		const separator = page.getByRole("separator");
		const separatorBox = await separator.boundingBox();
		const before = await panes.first().boundingBox();
		if (!separatorBox || !before)
			throw new Error("Missing separator geometry.");
		const x = separatorBox.x + separatorBox.width / 2;
		const y = separatorBox.y + separatorBox.height / 2;
		await page.mouse.move(x, y);
		await page.mouse.down();
		await page.mouse.move(
			x + (edge === "right" ? 24 : 0),
			y + (edge === "bottom" ? 24 : 0),
			{ steps: 5 },
		);
		await page.mouse.up();
		const dimension = edge === "right" ? "width" : "height";
		await expect
			.poll(async () => (await panes.first().boundingBox())?.[dimension])
			.toBeGreaterThan(before[dimension] + 10);
	});
}
