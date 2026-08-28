import { expect, test } from "@playwright/test";

test("the playground registry launches and resets an isolated experiment", async ({
	page,
}) => {
	await page.goto("/playground");

	await expect(
		page.getByRole("heading", {
			name: "Experiments need a room of their own.",
		}),
	).toBeVisible();
	await page
		.getByRole("listitem")
		.filter({ hasText: "Card and Sheet workspace" })
		.getByRole("link", { name: "Launch" })
		.click();

	await expect(page).toHaveURL(/\/playground\/sheet-workspace$/);
	await expect(page.locator("[data-workspace-pane]")).toHaveCount(3);

	await page
		.locator('[data-workspace-pane="central"]')
		.getByRole("button", { name: "Morgen" })
		.click();
	await expect(
		page.locator('[data-card-layer="central"] [data-card-id]'),
	).toHaveCount(4);

	await page.getByRole("button", { name: "Reset fixture" }).click();
	await expect(page.locator("[data-card-layer]")).toHaveCount(0);
});

test("a deck card dragged onto a pane lands as a settled sheet", async ({
	page,
}) => {
	await page.goto("/playground/sheet-workspace");

	await page
		.locator('[data-workspace-pane="central"]')
		.getByRole("button", { name: "Morgen" })
		.click();
	const deck = page.locator('[data-card-layer="central"]');
	await expect(deck.locator("[data-card-id]")).toHaveCount(4);

	const card = deck.locator("[data-card-id]").first();
	const east = page.locator('[data-workspace-pane="east"]');
	const cardBox = await card.boundingBox();
	const eastBox = await east.boundingBox();
	if (!cardBox || !eastBox) throw new Error("Missing drag geometry.");

	// Pointer drags activate after a short hold and travel; the workspace
	// follows dnd-kit's default pointer activation constraints.
	await page.mouse.move(
		cardBox.x + cardBox.width / 2,
		cardBox.y + cardBox.height / 2,
	);
	await page.mouse.down();
	await page.waitForTimeout(250);
	await page.mouse.move(
		eastBox.x + eastBox.width / 2,
		eastBox.y + eastBox.height / 2,
		{ steps: 12 },
	);
	await page.mouse.up();

	await expect(east.locator("[data-sheet-id]")).toHaveCount(1);
	await expect(east.locator("[data-sheet-settling]")).toHaveCount(0);
	await expect(deck.locator("[data-card-id]")).toHaveCount(3);
});

test("the segment text study links split members of one resolved unit", async ({
	page,
}) => {
	await page.goto("/playground/segment-text");

	await expect(
		page.getByRole("heading", { name: "Segments in continuous text" }),
	).toBeVisible();
	await page.getByRole("button", { name: /an, part of anrufen/ }).click();
	await page
		.getByRole("button", { name: /zurück\., part of zurückschreiben/ })
		.click();
	await page.locator(".segment-study__toolbar").hover();
	await expect(
		page.locator('.text-segment[data-unit-active="true"]'),
	).toHaveCount(4);
	await expect(
		page.getByRole("button", { name: "rufe, part of anrufen" }),
	).toHaveAttribute("data-unit-active", "true");
	await expect(
		page.getByRole("button", {
			name: "schreibe, part of zurückschreiben",
		}),
	).toHaveAttribute("data-unit-active", "true");
	await expect(
		page
			.locator('[data-passage-block="call-and-write"]')
			.getByRole("button", { name: "Sam, single segment" }),
	).not.toHaveAttribute("data-unit-active");

	await expect(page.getByText("Memory ink · 2 kept")).toBeVisible();

	await page.getByRole("button", { name: "Reset fixture" }).click();
	await expect(
		page.locator('.text-segment[data-unit-active="true"]'),
	).toHaveCount(0);
	await expect(page.getByText("Memory ink · 0 kept")).toBeVisible();
});

test("each reading note direction switches independently between pane and card", async ({
	page,
}) => {
	await page.goto("/playground/notes-study");

	await expect(
		page.getByRole("heading", { name: "Reading note directions" }),
	).toBeVisible();
	await expect(page.locator(".notes-prototype")).toHaveCount(3);
	const rootOverflow = await page.evaluate(() => {
		const browser = globalThis as unknown as {
			readonly document: {
				readonly documentElement: { readonly scrollHeight: number };
			};
			readonly innerHeight: number;
		};
		return (
			browser.document.documentElement.scrollHeight - browser.innerHeight
		);
	});
	expect(rootOverflow).toBeLessThanOrEqual(1);

	const midnight = page.locator(".notes-prototype--midnight");
	const catalog = page.locator(".notes-prototype--catalog");
	const field = page.locator(".notes-prototype--field");
	for (const [variant, colors] of [
		[
			midnight,
			{
				feminine: "rgb(230, 154, 157)",
				neuter: "rgb(163, 195, 159)",
				masculine: "rgb(170, 178, 216)",
			},
		],
		[
			catalog,
			{
				feminine: "rgb(233, 132, 110)",
				neuter: "rgb(148, 184, 142)",
				masculine: "rgb(170, 164, 207)",
			},
		],
		[
			field,
			{
				feminine: "rgb(206, 137, 148)",
				neuter: "rgb(152, 179, 149)",
				masculine: "rgb(153, 168, 202)",
			},
		],
	] as const) {
		for (const [gender, color] of Object.entries(colors)) {
			await expect(
				variant.locator(`[data-noun-gender="${gender}"]`).first(),
			).toHaveCSS("color", color);
		}
	}
	await expect(midnight.locator(".notes-prototype__stage")).toHaveAttribute(
		"data-view",
		"pane",
	);
	await expect(catalog.locator(".notes-prototype__stage")).toHaveAttribute(
		"data-view",
		"card",
	);

	await midnight
		.getByRole("group", { name: "Midnight index view" })
		.getByRole("button", { name: "Card", exact: true })
		.click();
	await expect(midnight.locator(".notes-prototype__stage")).toHaveAttribute(
		"data-view",
		"card",
	);
	await expect(catalog.locator(".notes-prototype__stage")).toHaveAttribute(
		"data-view",
		"card",
	);

	await catalog
		.getByRole("group", { name: "Catalog leaf view" })
		.getByRole("button", { name: "Pane", exact: true })
		.click();
	await expect(catalog.locator(".notes-prototype__stage")).toHaveAttribute(
		"data-view",
		"pane",
	);
	await expect(midnight.locator(".notes-prototype__stage")).toHaveAttribute(
		"data-view",
		"card",
	);
});
