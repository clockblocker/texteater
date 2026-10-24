import { expect, type Page, test } from "@playwright/test";

/**
 * The Breakdowns prototype's morphemes line as the user sketched it (#1241):
 * the word plain at rest, one morpheme revealed under the pointer or focus.
 */

async function openExample(page: Page, label: string) {
	await page
		.getByRole("complementary", { name: "Inspector" })
		.getByRole("button", { name: label, exact: true })
		.click();
}

const morphemes = (page: Page) =>
	page.getByRole("toolbar", { name: "Morphemes" });

test.beforeEach(async ({ page }) => {
	await page.goto("/playground/breakdowns");
	await openExample(page, "Einkauf 🧺");
	await expect(morphemes(page)).toBeVisible();
	await page.mouse.move(1, 1);
});

test("the word rests plain and reveals one morpheme under the pointer", async ({
	page,
}) => {
	const line = morphemes(page);
	const prefix = line.getByRole("button", { name: "Ein, prefix" });
	const root = line.getByRole("button", { name: "kauf, root" });
	await expect(line.locator('[data-shown="true"]')).toHaveCount(0);
	await expect(prefix.locator("svg")).toHaveCSS("opacity", "0");

	await prefix.hover();
	await expect(prefix).toHaveAttribute("data-shown", "true");
	await expect(prefix.locator("svg")).toHaveCSS("opacity", "1");
	await expect(root).toHaveAttribute("data-shown", "false");

	await root.hover();
	await expect(root).toHaveAttribute("data-shown", "true");
	await expect(prefix).toHaveAttribute("data-shown", "false");

	await page.mouse.move(1, 1);
	await expect(line.locator('[data-shown="true"]')).toHaveCount(0);
});

test("the zero ending is a target after the last letter", async ({ page }) => {
	const line = morphemes(page);
	const root = await line
		.getByRole("button", { name: "kauf, root" })
		.boundingBox();
	const zero = line.getByRole("button", { name: "zero ending" });
	const box = await zero.boundingBox();
	expect(root && box && box.x >= root.x + root.width - 1).toBe(true);
	await zero.hover();
	await expect(zero).toHaveAttribute("data-shown", "true");
});

test("arrow keys walk the morphemes from one tab stop", async ({ page }) => {
	const line = morphemes(page);
	await expect(line.locator('[tabindex="0"]')).toHaveCount(1);
	// The Source link sits right before the word in tab order.
	await page
		.locator('[data-breakdown-line="source"]')
		.getByRole("button", { name: "einkaufen" })
		.focus();
	await page.keyboard.press("Tab");
	await expect(
		line.getByRole("button", { name: "Ein, prefix" }),
	).toBeFocused();
	await expect(
		line.getByRole("button", { name: "Ein, prefix" }),
	).toHaveAttribute("data-shown", "true");
	await page.keyboard.press("ArrowRight");
	const root = line.getByRole("button", { name: "kauf, root" });
	await expect(root).toBeFocused();
	await expect(root).toHaveAttribute("data-shown", "true");
	await page.keyboard.press("End");
	await expect(
		line.getByRole("button", { name: "zero ending" }),
	).toBeFocused();
});

test("a click pins the reveal and opens the morpheme's Note", async ({
	page,
}) => {
	const before = page.url();
	await morphemes(page).getByRole("button", { name: "Ein, prefix" }).click();
	await expect(page).not.toHaveURL(before);
	await page.goBack();
	await page.mouse.move(1, 1);
	await expect(
		morphemes(page).getByRole("button", { name: "Ein, prefix" }),
	).toHaveAttribute("data-shown", "true");
});
