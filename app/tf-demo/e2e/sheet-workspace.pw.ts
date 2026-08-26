import { expect, type Locator, type Page, test } from "@playwright/test";

const workspacePath = "/playground/sheet-workspace/dnd-kit";

function pane(page: Page, name: "west" | "central" | "east") {
	return page.getByRole("region", { name: `${name} Pane`, exact: true });
}

async function selectSegment(
	page: Page,
	paneName: "west" | "central",
	segment: string,
) {
	await pane(page, paneName)
		.getByRole("button", { name: segment, exact: true })
		.click();
	await expect(
		page.getByRole("region", {
			name: `Card Layer in ${paneName} Pane`,
			exact: true,
		}),
	).toBeVisible();
}

async function dragTo(
	source: Locator,
	target: Locator,
	destinationRatio = { x: 0.5, y: 0.5 },
) {
	const sourceBox = await source.boundingBox();
	const targetBox = await target.boundingBox();
	if (!sourceBox || !targetBox) {
		throw new Error("Drag source and destination must be visible.");
	}
	const page = source.page();
	const start = {
		x: sourceBox.x + sourceBox.width / 2,
		y: sourceBox.y + sourceBox.height / 2,
	};
	const destination = {
		x: targetBox.x + targetBox.width * destinationRatio.x,
		y: targetBox.y + targetBox.height * destinationRatio.y,
	};
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(start.x + 12, start.y, { steps: 2 });
	await page.mouse.move(destination.x, destination.y, { steps: 10 });
	await expect(target).toHaveAttribute("data-drop-target", "true");
	await page.mouse.up();
	await expect(
		page.locator(
			'.card-sheet-workspace__drag-overlay > [data-subject-presentation="Card"]',
		),
	).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
	await page.goto(workspacePath);
	await expect(
		pane(page, "central").locator('[data-sheet-id="sheet-central-text"]'),
	).toBeVisible();
});

test("renders real Text and Note presentations in the fixed four-Card order", async ({
	page,
}) => {
	const central = pane(page, "central");
	await expect(central.getByRole("article", { name: "Text" })).toBeVisible();
	await expect(central.getByText("Am Fluss", { exact: true })).toHaveCount(0);
	await expect(
		central.getByText("Select any word to open", { exact: false }),
	).toHaveCount(0);
	await selectSegment(page, "central", "geschlossen");

	const layer = page.locator('[data-card-layer="central"]');
	await expect(layer.locator("[data-card-id]")).toHaveCount(4);
	await expect(
		layer
			.locator("[data-card-id]")
			.evaluateAll((cards) =>
				cards.map(
					(card) =>
						card
							.querySelector("[data-subject-id]")
							?.getAttribute("data-subject-id")
							?.split(":")[1],
				),
			),
	).resolves.toEqual(["reading", "lemma", "surface", "attestation"]);
	await expect(layer.locator('[aria-label="Reading note"]')).toBeVisible();
	await expect(
		layer.getByText("fixture sense", { exact: false }),
	).toHaveCount(0);
	await expect(layer.locator(".sheet-workspace-fixture-note")).toHaveCount(0);
	await expect(layer.getByText("Lemma Route Note")).toBeAttached();
	await expect(layer.getByText("Surface Route Note")).toBeAttached();
	await expect(layer.getByText("Attestation Route Note")).toBeAttached();
	await expect(layer.locator("[data-note-tail]")).toHaveCount(3);
	await expect(layer.locator('[data-note-tail="lemma"]')).toHaveText("Lemma");
});

test("a dragging Card keeps its source geometry and does not leave a ghost", async ({
	page,
}) => {
	await selectSegment(page, "central", "geschlossen");
	const card = page.locator(
		'[data-card-layer="central"] [data-card-order="0"]',
	);
	const sourceBox = await card.boundingBox();
	if (!sourceBox) throw new Error("Card must be visible.");

	await page.mouse.move(
		sourceBox.x + sourceBox.width / 2,
		sourceBox.y + sourceBox.height / 2,
	);
	await page.mouse.down();
	await page.mouse.move(
		sourceBox.x + sourceBox.width / 2 + 48,
		sourceBox.y + 24,
		{
			steps: 5,
		},
	);

	const overlay = page.locator(
		'.card-sheet-workspace__drag-overlay > [data-subject-presentation="Card"]',
	);
	await expect(overlay).toBeVisible();
	const overlayBox = await overlay.boundingBox();
	if (!overlayBox) throw new Error("Card overlay must be visible.");
	expect(Math.abs(overlayBox.width - sourceBox.width)).toBeLessThan(2);
	expect(Math.abs(overlayBox.height - sourceBox.height)).toBeLessThan(2);
	await expect(card).toHaveCSS("opacity", "0");

	await page.keyboard.press("Escape");
	await page.mouse.up();
});

test("a Tail drag previews the whole Card rather than the Tail", async ({
	page,
}) => {
	await selectSegment(page, "central", "geschlossen");
	const card = page.locator(
		'[data-card-layer="central"] [data-card-order="1"]',
	);
	const tail = card.locator("[data-card-tail]");
	const cardBox = await card.boundingBox();
	const tailBox = await tail.boundingBox();
	if (!cardBox || !tailBox) throw new Error("Card and Tail must be visible.");

	await page.mouse.move(
		tailBox.x + tailBox.width / 2,
		tailBox.y + tailBox.height / 2,
	);
	await page.mouse.down();
	await page.mouse.move(tailBox.x + tailBox.width / 2 + 48, tailBox.y + 24, {
		steps: 5,
	});

	const overlay = page.locator(
		'.card-sheet-workspace__drag-overlay > [data-subject-presentation="Card"]',
	);
	await expect(overlay).toBeVisible();
	const overlayBox = await overlay.boundingBox();
	if (!overlayBox) throw new Error("Card overlay must be visible.");
	expect(Math.abs(overlayBox.width - cardBox.width)).toBeLessThan(2);
	expect(Math.abs(overlayBox.height - cardBox.height)).toBeLessThan(2);
	await expect(card).toHaveCSS("opacity", "0");

	await page.keyboard.press("Escape");
	await page.mouse.up();
});

test("several Panes keep independent Card Layers and same-Pane selection replaces locally", async ({
	page,
}) => {
	await selectSegment(page, "central", "geschlossen");
	await selectSegment(page, "west", "Banken");
	await expect(page.locator("[data-card-layer]")).toHaveCount(2);

	await selectSegment(page, "central", "geöffnet");
	await expect(
		page.locator('[data-card-layer="central"] [data-card-id]'),
	).toHaveCount(4);
	await expect(
		page.locator('[data-card-layer="west"] [data-card-id]'),
	).toHaveCount(4);
	await expect(
		page.locator('[data-card-layer="central"] [data-card-id]').first(),
	).toHaveAttribute("data-card-id", /reading-0-6$/);
});

test("the foremost Card drags across Panes and remaining Cards keep order", async ({
	page,
}) => {
	await selectSegment(page, "central", "geschlossen");
	const centralLayer = page.locator('[data-card-layer="central"]');
	const foremost = centralLayer.locator('[data-card-order="0"]');
	const east = pane(page, "east");

	await dragTo(foremost, east);
	await expect(
		east.locator(
			'[data-sheet-id] [data-subject-id*="workspace-note:reading:"]',
		),
	).toBeVisible();
	await expect(centralLayer.locator("[data-card-id]")).toHaveCount(3);
	await expect(
		centralLayer
			.locator("[data-card-id]")
			.evaluateAll((cards) =>
				cards.map(
					(card) =>
						card
							.querySelector("[data-subject-id]")
							?.getAttribute("data-subject-id")
							?.split(":")[1],
				),
			),
	).resolves.toEqual(["lemma", "surface", "attestation"]);
});

test("a Card returned to its deck snaps back into its original place", async ({
	page,
}) => {
	await selectSegment(page, "central", "geschlossen");
	const central = pane(page, "central");
	const layer = page.locator('[data-card-layer="central"]');
	const card = layer.locator('[data-card-order="0"]');
	const cardId = await card.getAttribute("data-card-id");
	if (!cardId) throw new Error("Card must have an identity.");

	await dragTo(card, layer);

	await expect(layer.locator("[data-card-id]")).toHaveCount(4);
	await expect(layer.locator('[data-card-order="0"]')).toHaveAttribute(
		"data-card-id",
		cardId,
	);
	await expect(
		layer
			.locator("[data-card-id]")
			.evaluateAll((cards) =>
				cards.map((candidate) =>
					candidate.getAttribute("data-card-order"),
				),
			),
	).resolves.toEqual(["0", "1", "2", "3"]);
	await expect(central.locator("[data-sheet-id]")).toHaveCount(1);
	await expect(pane(page, "east").locator("[data-sheet-id]")).toHaveCount(0);
});

test("an occluded Card drags only from its visible Tail", async ({ page }) => {
	await selectSegment(page, "central", "geschlossen");
	const centralLayer = page.locator('[data-card-layer="central"]');
	const lemma = centralLayer.locator('[data-card-order="1"]');
	const lemmaTail = lemma.locator("[data-card-tail]");
	await expect(lemmaTail).toBeVisible();

	await dragTo(lemmaTail, pane(page, "east"));
	await expect(
		pane(page, "east").locator(
			'[data-sheet-id] [data-subject-id*="workspace-note:lemma:"]',
		),
	).toBeVisible();
	await expect(
		centralLayer.locator('[data-subject-id*="workspace-note:reading:"]'),
	).toBeVisible();
	await expect(centralLayer.locator("[data-card-id]")).toHaveCount(3);
});

test("clicking a Card Tail neither reorders nor places its Card", async ({
	page,
}) => {
	await selectSegment(page, "central", "geschlossen");
	const centralLayer = page.locator('[data-card-layer="central"]');
	await centralLayer
		.locator('[data-card-order="1"] [data-card-tail]')
		.click();
	await expect(centralLayer.locator("[data-card-id]")).toHaveCount(4);
	await expect(
		centralLayer
			.locator("[data-card-id]")
			.evaluateAll((cards) =>
				cards.map((card) => card.getAttribute("data-card-order")),
			),
	).resolves.toEqual(["0", "1", "2", "3"]);
	await expect(pane(page, "central").locator("[data-sheet-id]")).toHaveCount(
		1,
	);
});

test("Escape cancellation restores a dragging Card without changing algebra", async ({
	page,
}) => {
	await selectSegment(page, "central", "geschlossen");
	const card = page.locator(
		'[data-card-layer="central"] [data-card-order="0"]',
	);
	const cardBox = await card.boundingBox();
	if (!cardBox) throw new Error("Card must be visible.");
	await page.mouse.move(cardBox.x + 20, cardBox.y + 20);
	await page.mouse.down();
	await page.mouse.move(cardBox.x + 60, cardBox.y + 40, { steps: 4 });
	await expect(card).toHaveClass(/card-sheet-workspace__card--dragging/);
	await page.keyboard.press("Escape");
	await page.mouse.up();

	await expect(
		page.locator('[data-card-layer="central"] [data-card-id]'),
	).toHaveCount(4);
	await expect(pane(page, "east").locator("[data-sheet-id]")).toHaveCount(0);
});

test("Card Layers dismiss deterministically", async ({ page }) => {
	await selectSegment(page, "central", "geschlossen");
	await page
		.getByRole("button", { name: "Close Card Layer in central Pane" })
		.click();
	await expect(page.locator('[data-card-layer="central"]')).toHaveCount(0);

	await selectSegment(page, "central", "geschlossen");
	await page.keyboard.press("Escape");
	await expect(page.locator("[data-card-layer]")).toHaveCount(0);

	await selectSegment(page, "central", "geschlossen");
	await pane(page, "central")
		.locator("[data-workspace-subject]")
		.click({ position: { x: 8, y: 8 } });
	await expect(page.locator('[data-card-layer="central"]')).toHaveCount(0);
});

test("moving an originating Sheet dismisses its layer and uses both handles", async ({
	page,
}) => {
	await selectSegment(page, "central", "geschlossen");
	const centralTopHandle = pane(page, "central").getByRole("button", {
		name: "Move top Sheet from top handle",
		exact: true,
	});
	await dragTo(centralTopHandle, pane(page, "east"));
	await expect(page.locator('[data-card-layer="central"]')).toHaveCount(0);
	await expect(
		pane(page, "east").locator('[data-sheet-id="sheet-central-text"]'),
	).toBeVisible();

	const westBottomHandle = pane(page, "west").getByRole("button", {
		name: "Move top Sheet from bottom handle",
		exact: true,
	});
	await dragTo(westBottomHandle, pane(page, "central"));
	await expect(
		pane(page, "central").locator('[data-sheet-id="sheet-west-text"]'),
	).toBeVisible();
});

test("dropping a Sheet into a Pane's bottom removal zone deletes it", async ({
	page,
}) => {
	const central = pane(page, "central");
	const sheet = central.locator('[data-sheet-id="sheet-central-text"]');
	const handle = central.getByRole("button", {
		name: "Move top Sheet from top handle",
		exact: true,
	});
	const handleBox = await handle.boundingBox();
	if (!handleBox) throw new Error("Sheet handle must be visible.");

	await page.mouse.move(
		handleBox.x + handleBox.width / 2,
		handleBox.y + handleBox.height / 2,
	);
	await page.mouse.down();
	await page.mouse.move(handleBox.x + 16, handleBox.y + 12, { steps: 3 });

	const removalZone = central.getByRole("region", {
		name: "Remove Sheet in central Pane",
		exact: true,
	});
	await expect(page.locator("[data-sheet-removal-zone]")).toHaveCount(3);
	await expect(removalZone).toBeVisible();
	const removalBox = await removalZone.boundingBox();
	if (!removalBox) throw new Error("Sheet removal zone must be visible.");
	await page.mouse.move(
		removalBox.x + removalBox.width / 2,
		removalBox.y + removalBox.height / 2,
		{ steps: 10 },
	);
	await expect(removalZone).toHaveAttribute("data-drop-target", "true");
	await expect(removalZone).toContainText("Release to remove");
	await page.mouse.up();

	await expect(sheet).toHaveCount(0);
	await expect(removalZone).toHaveCount(0);
	await expect(
		central.getByText("Navigation Anchor", { exact: true }),
	).toBeVisible();
});

test("the source Stack reveals its lower Sheet only after a committed move", async ({
	page,
}) => {
	await selectSegment(page, "central", "geschlossen");
	const central = pane(page, "central");
	await dragTo(
		page.locator('[data-card-layer="central"] [data-card-order="0"]'),
		central,
		{ x: 0.5, y: 0.1 },
	);
	const noteSheet = central.locator('[data-sheet-top="true"]');
	const textSheet = central.locator('[data-sheet-id="sheet-central-text"]');
	await expect(
		noteSheet.locator('[data-subject-id*="workspace-note:reading:"]'),
	).toBeVisible();
	await expect(textSheet).toBeHidden();

	const handle = noteSheet.getByRole("button", {
		name: "Move top Sheet from top handle",
		exact: true,
	});
	const handleBox = await handle.boundingBox();
	const eastBox = await pane(page, "east").boundingBox();
	if (!handleBox || !eastBox)
		throw new Error("Move geometry must be visible.");
	await page.mouse.move(
		handleBox.x + handleBox.width / 2,
		handleBox.y + handleBox.height / 2,
	);
	await page.mouse.down();
	await page.mouse.move(handleBox.x + 20, handleBox.y + 10, { steps: 3 });
	await page.mouse.move(eastBox.x + eastBox.width / 2, eastBox.y + 120, {
		steps: 10,
	});
	await expect(noteSheet).toHaveAttribute("data-dragging", "true");
	await expect(textSheet).toBeHidden();
	await page.mouse.up();
	await expect(textSheet).toBeVisible();
});

test("lock is visible and clickable while a moving Sheet stays as a dim placeholder", async ({
	page,
}) => {
	const central = pane(page, "central");
	const lock = central.getByRole("button", { name: "Unlock Sheet" });
	await expect(lock).toHaveAttribute("aria-pressed", "true");
	await lock.click();
	await expect(
		central.getByRole("button", { name: "Lock Sheet" }),
	).toHaveAttribute("aria-pressed", "false");

	const handle = central.getByRole("button", {
		name: "Move top Sheet from top handle",
		exact: true,
	});
	const handleBox = await handle.boundingBox();
	if (!handleBox) throw new Error("Sheet handle must be visible.");
	await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + 5);
	await page.mouse.down();
	await page.mouse.move(handleBox.x + 40, handleBox.y + 20, { steps: 4 });
	await expect(
		central.locator('[data-sheet-id="sheet-central-text"]'),
	).toHaveAttribute("data-dragging", "true");
	await expect(
		page.locator('[data-subject-presentation="Card"]'),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await page.mouse.up();
	await expect(
		central.locator('[data-sheet-id="sheet-central-text"]'),
	).toBeVisible();
});

test("phone Cards stay within their narrow Pane", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(workspacePath);
	await selectSegment(page, "central", "geschlossen");
	const paneBox = await pane(page, "central").boundingBox();
	const cardBox = await page
		.locator('[data-card-layer="central"] [data-card-order="0"]')
		.boundingBox();
	if (!paneBox || !cardBox) throw new Error("Pane and Card must be visible.");
	expect(cardBox.width).toBeLessThanOrEqual(paneBox.width);
	expect(cardBox.x).toBeGreaterThanOrEqual(paneBox.x);
	expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(
		paneBox.x + paneBox.width + 1,
	);
});

for (const retiredPath of [
	"/playground",
	"/playground/card-demo/motion/text",
	"/playground/sheet-workspace/motion",
	"/playground/sheet-workspace/pragmatic",
	"/playground/sheet-workspace/react-aria",
]) {
	test(`retired route ${retiredPath} reaches the general not-found view`, async ({
		page,
	}) => {
		await page.goto(retiredPath);
		await expect(
			page.getByText("Page not found", { exact: true }),
		).toBeVisible();
	});
}
