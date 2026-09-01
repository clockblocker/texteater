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

test("the segment text study compares pre-resolved and on-demand units", async ({
	page,
}) => {
	await page.goto("/playground/segment-text");

	await expect(
		page.getByRole("heading", { name: "Segments in continuous text" }),
	).toBeVisible();
	const preResolved = page.locator('[data-resolution-model="pre-resolved"]');
	const onDemand = page.locator('[data-resolution-model="on-demand"]');
	await expect(page.locator(".resolution-model__header")).toHaveCount(0);
	await expect(page.locator(".resolution-model__inspector")).toHaveCount(0);

	const knownMember = preResolved.getByRole("button", {
		name: "an, part of anrufen",
	});
	await knownMember.hover();
	await expect(
		preResolved.locator('.text-segment[data-state="known-preview"]'),
	).toHaveCount(2);

	const unknownMember = onDemand.getByRole("button", {
		name: "an, click to resolve",
	});
	await unknownMember.hover();
	await expect(
		onDemand.locator('.text-segment[data-state="unknown-preview"]'),
	).toHaveCount(1);
	await expect(
		onDemand.locator('.text-segment[data-state="known-preview"]'),
	).toHaveCount(0);

	await unknownMember.click();
	await expect(
		onDemand.locator('.text-segment[data-state="resolving"]'),
	).toHaveCount(1);
	await expect(
		onDemand.locator('.text-segment[data-state="selected"]'),
	).toHaveCount(2);

	await onDemand
		.getByRole("button", { name: "rufe, part of anrufen" })
		.hover();
	const previewedUnit = onDemand.locator(
		'.text-segment[data-state="known-preview"]',
	);
	await expect(previewedUnit).toHaveCount(2);
	await page.waitForTimeout(200);
	for (const member of await previewedUnit.all()) {
		await expect(member).toHaveCSS("color", "rgb(156, 198, 237)");
		await expect(member).toHaveCSS(
			"background-color",
			"rgba(156, 198, 237, 0.1)",
		);
	}

	await onDemand
		.getByRole("button", { name: "zurück., click to resolve" })
		.click();
	await expect(
		onDemand.locator('.text-segment[data-state="selected"]'),
	).toHaveCount(2);
	await expect(
		onDemand.locator('.text-segment[data-state="retained"]'),
	).toHaveCount(2);
	await expect(onDemand.locator(".text-segment[data-known]")).toHaveCount(4);
	await expect(
		preResolved.locator(".text-segment:not([data-known])"),
	).toHaveCount(0);

	await page.getByRole("button", { name: "Reset fixture" }).click();
	await expect(onDemand.locator(".text-segment[data-known]")).toHaveCount(0);
});

test("each reading note Sheet lifts into its own purpose-built Card", async ({
	page,
}) => {
	await page.goto("/playground/notes-study");

	await expect(
		page.getByRole("heading", { name: "Reading note cards" }),
	).toBeVisible();
	await expect(page.locator(".notes-prototype")).toHaveCount(3);
	await expect(page.locator(".note-view-toggle")).toHaveCount(0);
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

	for (const [variant, expectedText] of [
		[midnight, "Die Dämmerung legte sich langsam über den See"],
		[catalog, "dämmern + -ung"],
		[field, "The blue hour on the walk home"],
	] as const) {
		const id = await variant.getAttribute("class");
		const variantId = id?.match(/notes-prototype--(\w+)/)?.[1];
		if (!variantId) throw new Error("Missing note variant id.");
		const stageBox = await variant
			.locator(".notes-prototype__stage")
			.boundingBox();
		const sheetBox = await variant
			.locator(".notes-prototype__sheet")
			.boundingBox();
		if (!stageBox || !sheetBox) throw new Error("Missing Sheet geometry.");
		expect(sheetBox.width).toBeLessThan(stageBox.width - 20);
		await expect(
			variant.locator(".notes-prototype__sheet-handle"),
		).toHaveCount(2);
		const handle = variant.getByRole("button", {
			name: "Lift Sheet as Card from top edge",
		});
		await handle.scrollIntoViewIfNeeded();
		const box = await handle.boundingBox();
		if (!box) throw new Error("Missing Sheet handle geometry.");

		await page.mouse.move(box.x + box.width / 2, box.y + 12);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width / 2 + 36, box.y + 70, {
			steps: 4,
		});
		const preview = page.locator(`[data-card-preview="${variantId}"]`);
		await expect(preview).toBeVisible();
		await expect(preview).toContainText(expectedText);
		await expect(
			variant.locator(".notes-prototype__stage"),
		).toHaveAttribute("data-dragging", "true");
		await page.mouse.up();
		await expect(preview).toHaveCount(0);
	}
});
