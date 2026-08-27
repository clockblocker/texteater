import { expect, type Page, test } from "@playwright/test";

function pane(page: Page, name: "west" | "central" | "east") {
	return page.getByRole("region", { name: `${name} Pane`, exact: true });
}

test("old resource paths canonicalize to the one live workspace", async ({
	page,
}) => {
	await page.goto("/library");
	await expect(page).toHaveURL("/");
	await expect(page.getByRole("region", { name: "Workspace" })).toBeVisible();
	await expect(
		pane(page, "central").getByRole("heading", { name: "Library" }),
	).toBeVisible();
	const centralPane = pane(page, "central");
	const library = centralPane.locator(
		".card-sheet-workspace__stack-base > div",
	);
	const { paneHeight, libraryHeight } = await library.evaluate(
		(libraryElement) => ({
			paneHeight:
				libraryElement
					.closest("[data-workspace-pane]")
					?.getBoundingClientRect().height ?? 0,
			libraryHeight: libraryElement.getBoundingClientRect().height,
		}),
	);
	expect(libraryHeight).toBeGreaterThanOrEqual(paneHeight - 2);
	await expect(
		centralPane.getByRole("button", { name: "Add a text" }),
	).toBeVisible();
	const paneBox = await centralPane.boundingBox();
	const addTextBox = await centralPane
		.getByRole("button", { name: "Add a text" })
		.boundingBox();
	if (!paneBox || !addTextBox) {
		throw new Error(
			"The central Pane and Add Text action must be visible.",
		);
	}
	expect(addTextBox.x).toBeGreaterThanOrEqual(paneBox.x);
	expect(addTextBox.x + addTextBox.width).toBeLessThanOrEqual(
		paneBox.x + paneBox.width,
	);
	await expect(pane(page, "west")).toContainText("Drop a Card or Sheet");
	await expect(pane(page, "east")).toContainText("Drop a Card or Sheet");
	await centralPane.getByRole("button", { name: "Add a text" }).click();
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
	await expect(page.getByRole("region", { name: "Workspace" })).toBeVisible();
	await expect(page).toHaveURL("/");
});

test("placed Sheets survive reload without encoding themselves in the URL", async ({
	page,
}) => {
	await page.addInitScript(() => {
		const browser = globalThis as unknown as {
			localStorage: { setItem(key: string, value: string): void };
		};
		browser.localStorage.setItem(
			"tf-demo.workspace.v1",
			JSON.stringify({
				centralPaneId: "central",
				activePaneId: "central",
				panes: [
					{ id: "west", sheets: [] },
					{
						id: "central",
						sheets: [
							{
								instanceId: "persisted-text",
								locked: true,
								subject: {
									kind: "Text",
									target: {
										kind: "Text",
										textId: "missing-text",
									},
								},
							},
						],
					},
					{ id: "east", sheets: [] },
				],
			}),
		);
	});
	await page.goto("/");
	await expect(
		pane(page, "central").locator('[data-sheet-id="persisted-text"]'),
	).toBeVisible();
	await expect(page).toHaveURL("/");

	await page.reload();
	await expect(
		pane(page, "central").locator('[data-sheet-id="persisted-text"]'),
	).toBeVisible();
	await expect(page).toHaveURL("/");
});
