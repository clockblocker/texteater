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

	const centralReader = page
		.locator('[data-workspace-pane="central"]')
		.locator(".text-reader");
	await expect(centralReader).toHaveCSS(
		"background-color",
		"rgb(27, 30, 35)",
	);
	const morgen = centralReader.getByRole("button", { name: "Morgen" });
	await morgen.hover();
	await expect(
		centralReader.locator(
			'.text-reader__segment[data-state="unknown-preview"]',
		),
	).toHaveCount(1);
	await expect(morgen).toHaveCSS("color", "rgb(93, 137, 199)");
	await morgen.click();
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
	await expect(knownMember).toHaveCSS("color", "rgb(122, 174, 247)");
	await expect(knownMember).toHaveCSS("text-decoration-line", "underline");

	const unknownMember = onDemand.getByRole("button", {
		name: "an, click to resolve",
	});
	await unknownMember.hover();
	await expect(
		onDemand.locator('.text-segment[data-state="unknown-preview"]'),
	).toHaveCount(1);
	await expect(unknownMember).toHaveCSS("color", "rgb(93, 137, 199)");
	await expect(unknownMember).toHaveCSS("text-decoration-line", "underline");
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
		await expect(member).toHaveCSS("color", "rgb(122, 174, 247)");
		await expect(member).toHaveCSS("text-decoration-line", "underline");
		await expect(member).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
		await expect(member).toHaveCSS("box-shadow", "none");
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
	const retainedMember = onDemand.getByRole("button", {
		name: "rufe, part of anrufen",
	});
	await expect(retainedMember).toHaveCSS("color", "rgb(122, 174, 247)");
	await expect(retainedMember).toHaveCSS("text-decoration-line", "none");
	await retainedMember.hover();
	await expect(
		onDemand.locator('.text-segment[data-state="known-preview"]'),
	).toHaveCount(2);
	await expect(retainedMember).toHaveCSS("color", "rgb(122, 174, 247)");
	await expect(retainedMember).toHaveCSS("text-decoration-line", "underline");
	await expect(onDemand.locator(".text-segment[data-known]")).toHaveCount(4);
	await expect(
		preResolved.locator(".text-segment:not([data-known])"),
	).toHaveCount(0);

	await page.getByRole("button", { name: "Reset fixture" }).click();
	await expect(onDemand.locator(".text-segment[data-known]")).toHaveCount(0);
});

test("the Midnight reading note Sheet lifts into its purpose-built Card", async ({
	page,
}) => {
	await page.goto("/playground/notes-study");

	await expect(
		page.getByRole("heading", { name: "Reading note card" }),
	).toBeVisible();
	await expect(page.locator(".notes-prototype")).toHaveCount(1);
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
	const ipaBox = await midnight.locator(".lexical-note__ipa").boundingBox();
	if (!ipaBox) throw new Error("Missing IPA geometry.");
	const ipaRight = ipaBox.x + ipaBox.width;
	for (const headingName of [
		"Im Kontext",
		"Beziehungen",
		"Wortbildung",
		"Übersetzung",
		"Formen",
	]) {
		const headingTextBox = await midnight
			.getByRole("heading", { name: headingName })
			.locator("span")
			.boundingBox();
		if (!headingTextBox)
			throw new Error(`Missing ${headingName} text geometry.`);
		expect(
			Math.abs(headingTextBox.x + headingTextBox.width - ipaRight),
		).toBeLessThan(1);
	}
	const synonymRelationMark = midnight.getByRole("button", {
		name: "Synonym",
		exact: true,
	});
	await synonymRelationMark.hover();
	const relationTooltip = page.locator('[data-slot="tooltip-content"]');
	await expect(relationTooltip).toBeVisible();
	await expect(relationTooltip).toHaveText("Synonym");
	await expect(
		midnight.getByRole("heading", { name: "Deine Notiz" }),
	).toHaveCount(0);
	const noteEditor = midnight.getByPlaceholder("...");
	await expect(noteEditor).toBeVisible();
	await expect(noteEditor).toHaveCSS("min-height", "44px");
	await expect(noteEditor).toHaveCSS("resize", "none");
	const emptyEditorBox = await noteEditor.boundingBox();
	if (!emptyEditorBox) throw new Error("Missing note editor geometry.");
	await noteEditor.focus();
	await expect(noteEditor).toHaveCSS("min-height", "44px");
	await expect(noteEditor).toHaveCSS("outline-width", "1px");
	await expect(noteEditor).toHaveCSS("outline-color", "rgb(98, 107, 119)");
	await noteEditor.fill("one\ntwo\nthree\nfour");
	const expandedEditorBox = await noteEditor.boundingBox();
	if (!expandedEditorBox)
		throw new Error("Missing expanded editor geometry.");
	expect(expandedEditorBox.height).toBeGreaterThan(emptyEditorBox.height);
	await noteEditor.fill("");
	const shrunkenEditorBox = await noteEditor.boundingBox();
	if (!shrunkenEditorBox)
		throw new Error("Missing shrunken editor geometry.");
	expect(shrunkenEditorBox.height).toBeLessThan(expandedEditorBox.height);
	for (const [gender, color] of Object.entries({
		feminine: "rgb(230, 154, 157)",
		neuter: "rgb(163, 195, 159)",
		masculine: "rgb(170, 178, 216)",
	})) {
		await expect(
			midnight.locator(`[data-noun-gender="${gender}"]`).first(),
		).toHaveCSS("color", color);
	}
	const sourceContexts = midnight.locator(".source-contexts blockquote");
	const contextBars = midnight.locator(".source-context__bar");
	await expect(contextBars.nth(0)).toHaveCSS(
		"background-color",
		"rgb(56, 62, 71)",
	);
	await expect(contextBars.nth(1)).toHaveCSS(
		"background-color",
		"rgb(56, 62, 71)",
	);
	await contextBars.nth(0).hover();
	await expect(contextBars.nth(0)).toHaveCSS(
		"background-color",
		"rgb(230, 154, 157)",
	);
	await expect(contextBars.nth(1)).toHaveCSS(
		"background-color",
		"rgb(56, 62, 71)",
	);
	const attestedWord = sourceContexts
		.nth(0)
		.getByRole("button", { name: "Dämmerung, feminine noun" });
	await attestedWord.hover();
	await expect(attestedWord).toHaveCSS("text-decoration-line", "none");
	await expect(contextBars.nth(0)).toHaveCSS(
		"background-color",
		"rgb(230, 154, 157)",
	);
	await expect(contextBars.nth(1)).toHaveCSS(
		"background-color",
		"rgb(56, 62, 71)",
	);

	await expect(midnight.locator('[data-number="plural"]').first()).toHaveCSS(
		"color",
		"rgb(230, 215, 154)",
	);
	await expect(
		midnight.getByRole("button", { name: "Dämmer, verb stem" }),
	).toHaveCSS("color", "rgb(142, 180, 240)");
	await expect(
		midnight.getByRole("button", {
			name: "ung, feminine noun-forming suffix",
			exact: true,
		}),
	).toHaveCSS("color", "rgb(230, 154, 157)");

	const stageBox = await midnight
		.locator(".notes-prototype__stage")
		.boundingBox();
	const sheetBox = await midnight
		.locator(".notes-prototype__sheet")
		.boundingBox();
	if (!stageBox || !sheetBox) throw new Error("Missing Sheet geometry.");
	expect(sheetBox.width).toBeLessThan(stageBox.width - 20);
	await expect(
		midnight.locator(".notes-prototype__sheet-handle"),
	).toHaveCount(2);
	const handle = midnight.getByRole("button", {
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
	const preview = page.locator('[data-card-preview="midnight"]');
	await expect(preview).toBeVisible();
	await expect(preview).toContainText(
		"Die Dämmerung legte sich langsam über den See",
	);
	await expect(midnight.locator(".notes-prototype__stage")).toHaveAttribute(
		"data-dragging",
		"true",
	);
	await expect(handle).toHaveCSS("opacity", "0.12");
	await page.mouse.up();
	await expect(preview).toHaveCount(0);
});
