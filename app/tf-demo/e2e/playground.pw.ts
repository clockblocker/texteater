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

test("the notes study lists every German Unit Reading route", async ({
	page,
}) => {
	await page.goto("/playground/notes-study");

	await expect(
		page.getByRole("heading", { name: "Every note has a shelf." }),
	).toBeVisible();
	await expect(page.locator(".note-shelf")).toHaveCount(3);
	await expect(page.locator(".note-shelf li")).toHaveCount(33);
	await expect(
		page.locator('.note-shelf[aria-labelledby="note-shelf-Lexeme"] li'),
	).toHaveCount(17);
	await expect(
		page.locator('.note-shelf[aria-labelledby="note-shelf-Phraseme"] li'),
	).toHaveCount(5);
	await expect(
		page.locator('.note-shelf[aria-labelledby="note-shelf-Morpheme"] li'),
	).toHaveCount(11);

	await page.locator('a[href="/playground/notes-study/Daemmerung"]').click();
	await expect(page).toHaveURL(/\/playground\/notes-study\/Daemmerung$/);
	await expect(
		page.locator('[data-note-fixture="Daemmerung"]'),
	).toBeVisible();
});

test("verb form labels do not overlap their values", async ({ page }) => {
	await page.setViewportSize({ width: 820, height: 586 });
	await page.goto("/playground/notes-study/Anrufen");

	const formRows = page
		.locator('[data-note-fixture="Anrufen"]')
		.locator(".note-section--forms dl > div");
	await expect(formRows).toHaveCount(5);
	await page.evaluate(() => {
		const browser = globalThis as unknown as {
			readonly document: {
				readonly fonts: { readonly ready: PromiseLike<unknown> };
			};
		};
		return browser.document.fonts.ready;
	});

	const collisions = await formRows.evaluateAll((rows) =>
		rows.flatMap((row) => {
			const label = row.querySelector("dt");
			const value = row.querySelector("dd");
			if (!label || !value) return [];

			const labelRange = label.ownerDocument.createRange();
			labelRange.selectNodeContents(label);
			const overlap =
				labelRange.getBoundingClientRect().right -
				value.getBoundingClientRect().left;
			return overlap > 0
				? [{ label: label.textContent?.trim(), overlap }]
				: [];
		}),
	);
	expect(collisions).toEqual([]);
});

test("the Midnight reading note Sheet lifts into its purpose-built Card", async ({
	page,
}) => {
	await page.goto("/playground/notes-study/Daemmerung");

	await expect(
		page.getByRole("heading", { name: "German Reading notes" }),
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
	const synonymRelationMark = midnight.locator(
		'[data-relation="synonym"] .relation-mark',
	);
	await expect(midnight.locator(".relation-list > div")).toHaveCount(8);
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
	const notePalette = await midnight
		.locator(".lexical-note")
		.evaluate((note) => {
			const view = note.ownerDocument.defaultView;
			if (!view) throw new Error("Missing Reading Note window.");
			const styles = view.getComputedStyle(note);
			return {
				feminine: styles
					.getPropertyValue("--note-noun-feminine")
					.trim(),
				neuter: styles.getPropertyValue("--note-noun-neuter").trim(),
				masculine: styles
					.getPropertyValue("--note-noun-masculine")
					.trim(),
			};
		});
	expect(notePalette).toEqual({
		feminine: "#e69a9d",
		neuter: "#a3c39f",
		masculine: "#aab2d8",
	});
	const shadowWords = midnight.locator(
		".relation-list .linked-word[data-shadow-note]",
	);
	await expect(shadowWords).toHaveCount(5);
	expect(await shadowWords.allTextContents()).toEqual([
		"Zwielicht",
		"Sonnenuntergang",
		"Tageslicht",
		"Lichtzustand",
		"Tageslauf",
	]);
	for (const shadowWord of await shadowWords.all()) {
		await expect(shadowWord).toHaveCSS("color", "rgb(154, 167, 186)");
		await expect(shadowWord).toHaveAttribute("aria-label", /Unit Shadow/);
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
	const firstContextBox = await sourceContexts.nth(0).boundingBox();
	const firstContextGutter = await sourceContexts
		.nth(0)
		.evaluate((context) => {
			const view = context.ownerDocument.defaultView;
			if (!view) throw new Error("Missing Source Context window.");
			return Number.parseFloat(
				view.getComputedStyle(context).paddingLeft,
			);
		});
	if (!firstContextBox) throw new Error("Missing Source Context geometry.");
	const contextGutterPoint = {
		x: firstContextBox.x + firstContextGutter - 4,
		y: firstContextBox.y + firstContextBox.height / 2,
	};
	await page.mouse.move(contextGutterPoint.x, contextGutterPoint.y);
	await expect(contextBars.nth(0)).toHaveCSS(
		"background-color",
		"rgb(230, 154, 157)",
	);
	await expect(contextBars.nth(1)).toHaveCSS(
		"background-color",
		"rgb(56, 62, 71)",
	);
	await contextBars.nth(0).evaluate((bar) => {
		bar.addEventListener(
			"click",
			() => bar.setAttribute("data-gutter-clicked", "true"),
			{ once: true },
		);
	});
	await page.mouse.click(contextGutterPoint.x, contextGutterPoint.y);
	await expect(contextBars.nth(0)).toHaveAttribute(
		"data-gutter-clicked",
		"true",
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
	await expect(preview.locator(".relation-list > div")).toHaveCount(8);
	await expect(preview.locator(".note-section__label")).toHaveCount(0);
	await expect(preview.locator("[data-card-drag-surface]")).toHaveCount(2);
	const cardShadowWords = preview.locator(".linked-word[data-shadow-note]");
	await expect(cardShadowWords).toHaveCount(5);
	for (const shadowWord of await cardShadowWords.all()) {
		await expect(shadowWord).toHaveCSS("color", "rgb(154, 167, 186)");
	}
	await expect(preview).toContainText("Dämmer|ung");
	const cardTags = preview.locator(".lexical-note__footer span");
	await expect(cardTags.nth(0)).toHaveText("#Nomen");
	await expect(cardTags.nth(1)).toHaveText("#Feminin");
	expect(
		await preview.locator("button, a, textarea").count(),
	).toBeGreaterThan(0);
	await expect(preview).toHaveAttribute("inert", "");
	await expect(preview).toHaveCSS("pointer-events", "none");
	await expect(preview.locator(".lexical-note")).toHaveCSS(
		"overflow-y",
		"hidden",
	);
	const previewCardPresentation = await preview.evaluate((card) => {
		const view = card.ownerDocument.defaultView;
		const cardView = card.querySelector(".note-card-view");
		const note = card.querySelector(".lexical-note");
		const article = card.querySelector(".lexical-note__article");
		const section = card.querySelector(".note-section");
		const contexts = card.querySelector(".source-contexts");
		const context = contexts?.querySelector("blockquote");
		const layout = card.querySelector(".lexical-note__layout");
		const dividedSection = card.querySelector(".note-section--relations");
		if (
			!view ||
			!cardView ||
			!note ||
			!article ||
			!section ||
			!contexts ||
			!context ||
			!layout ||
			!dividedSection
		) {
			throw new Error("Missing drag Card presentation.");
		}
		const bounds = cardView.getBoundingClientRect();
		return {
			content: article.textContent,
			width: Number(bounds.width.toFixed(1)),
			height: Number(bounds.height.toFixed(1)),
			fontSize: view.getComputedStyle(note).fontSize,
			layout: view.getComputedStyle(layout).display,
			outerPadding: view.getComputedStyle(article).paddingTop,
			sectionGap: view.getComputedStyle(section).paddingTop,
			contextGap: view.getComputedStyle(contexts).gap,
			contextGutter: view.getComputedStyle(context).paddingLeft,
			cardEdgePadding: view.getComputedStyle(cardView).paddingTop,
			sectionDivider: view.getComputedStyle(dividedSection, "::before")
				.borderTopStyle,
		};
	});
	await expect(midnight.locator(".notes-prototype__stage")).toHaveAttribute(
		"data-dragging",
		"true",
	);
	await expect(handle).toHaveCSS("opacity", "0.12");
	await page.mouse.up();
	await expect(preview).toHaveCount(0);
	await expect(midnight.locator('[data-placed-card="midnight"]')).toHaveCount(
		0,
	);

	const cardLayer = midnight.locator('[data-card-layer-surface="midnight"]');
	await expect(cardLayer).toContainText("Drop Card here");
	const cardLayerBox = await cardLayer.boundingBox();
	const secondHandleBox = await handle.boundingBox();
	if (!cardLayerBox || !secondHandleBox) {
		throw new Error("Missing Card Layer drop geometry.");
	}
	await page.mouse.move(
		secondHandleBox.x + secondHandleBox.width / 2,
		secondHandleBox.y + 12,
	);
	await page.mouse.down();
	await page.mouse.move(
		cardLayerBox.x + cardLayerBox.width / 2,
		cardLayerBox.y + Math.min(150, cardLayerBox.height / 2),
		{ steps: 8 },
	);
	await expect(cardLayer).toHaveAttribute("data-drag-over", "true");
	await expect(preview).toBeVisible();
	await page.mouse.up();

	const placedCard = midnight.locator('[data-placed-card="midnight"]');
	await expect(preview).toHaveCount(0);
	await expect(placedCard).toBeVisible();
	await expect(cardLayer).toHaveAttribute("data-occupied", "true");
	await expect(cardLayer).toContainText("Card retained");
	await expect(placedCard.locator(".relation-list > div")).toHaveCount(8);
	await expect(placedCard.locator(".note-section__label")).toHaveCount(0);
	await expect(placedCard.locator("[data-card-drag-surface]")).toHaveCount(2);
	await expect(
		placedCard.locator(".note-section:not(.note-section--contexts)"),
	).toHaveCount(5);
	await expect(placedCard.locator(".lexical-note")).toHaveCSS(
		"font-size",
		"15.2px",
	);
	await expect(placedCard.locator(".lexical-note")).toHaveCSS(
		"overflow-y",
		"auto",
	);
	const placedCardDensity = await placedCard.evaluate((card) => {
		const view = card.ownerDocument.defaultView;
		if (!view) throw new Error("Missing settled Card window.");
		const note = card.querySelector(".lexical-note");
		const article = card.querySelector(".lexical-note__article");
		const section = card.querySelector(".note-section");
		const contexts = card.querySelector(".source-contexts");
		const context = contexts?.querySelector("blockquote");
		const layout = card.querySelector(".lexical-note__layout");
		const dividedSection = card.querySelector(".note-section--relations");
		const cardView = card.closest(".note-card-view");
		if (!note || !article || !section || !contexts || !context || !layout) {
			throw new Error("Missing settled Card content.");
		}
		if (!dividedSection || !cardView) {
			throw new Error("Missing settled Card presentation.");
		}
		const bounds = cardView.getBoundingClientRect();
		return {
			isScrollable: note.scrollHeight > note.clientHeight,
			content: article.textContent,
			width: Number(bounds.width.toFixed(1)),
			height: Number(bounds.height.toFixed(1)),
			fontSize: view.getComputedStyle(note).fontSize,
			layout: view.getComputedStyle(layout).display,
			outerPadding: Number.parseFloat(
				view.getComputedStyle(article).paddingTop,
			),
			sectionGap: Number.parseFloat(
				view.getComputedStyle(section).paddingTop,
			),
			contextGap: Number.parseFloat(view.getComputedStyle(contexts).gap),
			contextGutter: Number.parseFloat(
				view.getComputedStyle(context).paddingLeft,
			),
			cardEdgePadding: view.getComputedStyle(cardView).paddingTop,
			scrollbarWidth: view.getComputedStyle(note).scrollbarWidth,
			sectionDivider: view.getComputedStyle(dividedSection, "::before")
				.borderTopStyle,
		};
	});
	expect({
		content: placedCardDensity.content,
		width: placedCardDensity.width,
		height: placedCardDensity.height,
		fontSize: placedCardDensity.fontSize,
		layout: placedCardDensity.layout,
		outerPadding: `${placedCardDensity.outerPadding}px`,
		sectionGap: `${placedCardDensity.sectionGap}px`,
		contextGap: `${placedCardDensity.contextGap}px`,
		contextGutter: `${placedCardDensity.contextGutter}px`,
		cardEdgePadding: placedCardDensity.cardEdgePadding,
		sectionDivider: placedCardDensity.sectionDivider,
	}).toEqual(previewCardPresentation);
	expect(placedCardDensity).toEqual({
		isScrollable: true,
		content: previewCardPresentation.content,
		width: previewCardPresentation.width,
		height: previewCardPresentation.height,
		fontSize: "15.2px",
		layout: "block",
		outerPadding: 14.4,
		sectionGap: 11.2,
		contextGap: 11.2,
		contextGutter: 12,
		cardEdgePadding: "24px",
		scrollbarWidth: "thin",
		sectionDivider: "dashed",
	});
	await expect(
		placedCard
			.getByRole("button", { name: "Dämmerung, feminine noun" })
			.first(),
	).toBeVisible();

	await page.getByRole("button", { name: "Reset fixture" }).click();
	await expect(page.locator('[data-placed-card="midnight"]')).toHaveCount(0);
});
