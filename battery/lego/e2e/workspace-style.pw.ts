import { expect, test } from "@playwright/test";

for (const overrides of [false, true]) {
	test(`workspace skin follows tokens inside the root and in the drag portal${overrides ? " with class overrides" : ""}`, async ({
		page,
	}) => {
		await page.goto(overrides ? "/?overrides" : "/");
		await page.addStyleTag({
			content: `:root {
			--canvas: rgb(11 21 31);
			--paper: rgb(41 51 61);
			--raised: rgb(71 81 91);
			--ink: rgb(211 221 231);
		}`,
		});
		const root = page.locator(".workspace");
		await expect(root).toHaveCSS("background-color", "rgb(11, 21, 31)");
		await expect(root).toHaveCSS("color", "rgb(211, 221, 231)");
		await expect(root).toHaveCSS(
			"font-size",
			overrides ? "18px" : "13.6px",
		);
		await page.getByRole("button", { name: "Banken", exact: true }).click();
		const card = root.locator(".workspace__card").first();
		const surface = overrides ? "rgb(71, 81, 91)" : "rgb(41, 51, 61)";
		await expect(card).toHaveCSS("background-color", surface);
		await expect(card).toHaveCSS(
			"font-size",
			overrides ? "18px" : "13.6px",
		);
		await expect(card).toHaveCSS("border-radius", "11.2px");
		await expect(card).not.toHaveCSS("box-shadow", "none");

		const tail = page
			.getByRole("button", { name: /Lift .* Card$/ })
			.first();
		await tail.hover();
		const box = await tail.boundingBox();
		if (!box) throw new Error("Missing Card Tail geometry.");
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		const preview = page.locator("body > [data-lifted-presentation]");
		await expect(preview).toBeVisible();
		await expect(root.locator("[data-lifted-presentation]")).toHaveCount(0);
		await expect(preview).toHaveCSS("background-color", surface);
		await expect(preview).toHaveCSS("color", "rgb(211, 221, 231)");
		await expect(preview).toHaveCSS(
			"font-size",
			overrides ? "18px" : "13.6px",
		);
		await expect(preview).toHaveCSS("border-radius", "11.2px");
		await expect(preview).not.toHaveCSS("box-shadow", "none");
		await page.keyboard.press("Escape");
		await page.mouse.up();
		await expect(preview).toHaveCount(0);
	});
}
