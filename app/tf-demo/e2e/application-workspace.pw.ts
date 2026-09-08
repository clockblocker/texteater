import { expect, type Locator, type Page, test } from "@playwright/test";

function workspace(page: Page) {
	return page.locator(".workspace");
}

async function firstStoredText(page: Page): Promise<Locator> {
	const text = page
		.locator('section[aria-labelledby="library-title"] button')
		.first();
	await expect(text).toBeVisible();
	return text;
}

async function dragCardToRightEdge(page: Page) {
	const cardTail = workspace(page).locator(".workspace__card-tail").first();
	const cardBox = await cardTail.boundingBox();
	const pane = workspace(page).locator("[data-workspace-pane]").first();
	const paneBox = await pane.boundingBox();
	if (!cardBox || !paneBox) throw new Error("Missing Card or Pane geometry.");

	await page.mouse.move(
		cardBox.x + cardBox.width / 2,
		cardBox.y + cardBox.height / 2,
	);
	await page.mouse.down();
	await expect(page.locator("[data-lifted-presentation]")).toBeVisible();
	await page.mouse.move(
		paneBox.x + paneBox.width - 4,
		paneBox.y + paneBox.height / 2,
		{ steps: 8 },
	);
	await expect(
		page.locator('.workspace__drop[data-edge="right"]'),
	).toBeVisible();
	await page.mouse.up();
}

test("old resource paths canonicalize to the one live workspace", async ({
	page,
}) => {
	await page.goto("/library");
	await expect(page).toHaveURL("/");
	await expect(workspace(page)).toBeVisible();
	await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
	await expect(workspace(page).locator("[data-workspace-pane]")).toHaveCount(
		1,
	);
	await expect(
		page.getByRole("button", { name: "Add a text" }),
	).toBeVisible();

	await page.getByRole("button", { name: "Add a text" }).click();
	await expect(
		page.getByRole("dialog").getByRole("heading", { name: "Add a text" }),
	).toBeVisible();
	await expect(
		page.getByRole("textbox", { name: "German text" }),
	).toBeVisible();
});

test("Settings is shell state and never changes the workspace URL", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("button", { name: "Settings" }).click();
	await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
	await expect(page).toHaveURL("/");

	await page.getByRole("button", { name: "Library" }).click();
	await expect(workspace(page)).toBeVisible();
	await expect(page).toHaveURL("/");
});

test("Playground is linked from the primary navigation", async ({ page }) => {
	await page.goto("/");
	await page.getByRole("link", { name: "Playground" }).click();

	await expect(page).toHaveURL("/playground");
	await expect(
		page.getByRole("heading", {
			name: "Experiments need a room of their own.",
		}),
	).toBeVisible();
});

test("a stored Text opens a segment deck, splits, reloads, and collapses", async ({
	page,
}) => {
	await page.goto("/");
	const storedText = await firstStoredText(page);
	await storedText.click();

	const textSheet = workspace(page).locator(".workspace__sheet", {
		has: page.locator(".text-reader"),
	});
	await expect(textSheet).toBeVisible();
	const segment = textSheet
		.locator(".text-reader__segment:not([disabled])")
		.first();
	await expect(segment).toBeVisible();
	await segment.click();

	const deck = workspace(page).locator("[data-card-layer]");
	await expect(deck).toBeVisible();
	await expect(deck.locator(".workspace__card")).not.toHaveCount(0);

	await dragCardToRightEdge(page);
	await expect(workspace(page).locator("[data-workspace-pane]")).toHaveCount(
		2,
	);
	await expect(page.locator("[data-lifted-presentation]")).toHaveCount(0);

	// Expanded Sheets, their split layout, and the retained layer all persist.
	await page.reload();
	await expect(workspace(page).locator("[data-workspace-pane]")).toHaveCount(
		2,
	);
	const splitPane = workspace(page).locator("[data-workspace-pane]").last();
	const expandedSheet = splitPane.locator(".workspace__sheet");
	await expect(expandedSheet).toBeVisible();

	// Double-clicking a Sheet surface collapses it back into its retained deck.
	const expandedBox = await expandedSheet.boundingBox();
	if (!expandedBox) throw new Error("Missing expanded Sheet geometry.");
	await page.mouse.dblclick(
		expandedBox.x + 12,
		expandedBox.y + expandedBox.height - 12,
	);
	await expect(workspace(page).locator("[data-workspace-pane]")).toHaveCount(
		1,
	);
	await expect(deck).toBeVisible();

	// Resting Cards are deliberately transient; the original locked Text remains.
	await page.reload();
	await expect(workspace(page).locator("[data-workspace-pane]")).toHaveCount(
		1,
	);
	await expect(workspace(page).locator(".text-reader")).toBeVisible();
	await expect(workspace(page).locator("[data-card-layer]")).toHaveCount(0);
});
