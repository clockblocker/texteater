import { expect, type Page, test } from "@playwright/test";

/*
 * The "Always play animations" preference, through the Settings Menu Item
 * of the deck-models playground. It lives in localStorage as JSON, and
 * main.tsx applies it to the root before React mounts.
 */

const STORAGE_KEY = "tf-demo-motion-preference";

/** Walks the deck-models Ground line up to the Menu and opens Settings. */
async function openSettings(page: Page) {
	const pane = page.locator('[data-deck-frame] [data-deck-pane="root"]');
	await pane.getByRole("button", { name: "Back to Library" }).click();
	await pane.getByRole("button", { name: "Back to Menu" }).click();
	await pane.locator('[data-ground-item="settings"]').click();
	return pane.locator('[data-ground-item="motion"]');
}

const rootPreference = (page: Page) =>
	page.locator("html").getAttribute("data-motion-preference");

test("the preference survives a reload and is on the root before React mounts", async ({
	page,
}) => {
	await page.goto("/playground/deck-models");
	const motion = await openSettings(page);
	await expect(motion).toHaveText("Animations: follow the system");
	expect(await rootPreference(page)).toBe("respect");

	await motion.click();
	await expect(motion).toHaveText("Animations: always play");
	await expect(page.locator("html")).toHaveAttribute(
		"data-motion-preference",
		"ignore",
	);
	expect(
		await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
	).toBe('"ignore"');

	// With the app's modules held back React never mounts, so only main.tsx's
	// synchronous read can have set the attribute.
	const holdBack = "**/src/{App,components/app-provider}.tsx*";
	await page.route(holdBack, (route) => route.abort());
	await page.reload();
	await expect(page.locator("html")).toHaveAttribute(
		"data-motion-preference",
		"ignore",
	);
	await expect(page.locator("#root")).toBeEmpty();

	await page.unroute(holdBack);
	await page.reload();
	await expect(await openSettings(page)).toHaveText(
		"Animations: always play",
	);
});

test("a change in another tab reaches this one", async ({ page, context }) => {
	await page.goto("/playground/deck-models");
	const other = await context.newPage();
	await other.goto("/playground/deck-models");
	const motion = await openSettings(other);
	await expect(motion).toHaveText("Animations: follow the system");

	await motion.click();

	await expect(page.locator("html")).toHaveAttribute(
		"data-motion-preference",
		"ignore",
	);
	await expect(await openSettings(page)).toHaveText(
		"Animations: always play",
	);
});
