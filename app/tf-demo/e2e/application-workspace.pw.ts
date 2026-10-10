/// <reference lib="dom" />
import { expect, type Locator, type Page, test } from "@playwright/test";

/**
 * The main app on the Compass renderer (tf-demo ADR 0003, 0008): one URL,
 * a Rooted Pane whose Ground line runs Menu › Library › Text, Decks dealt
 * by a click, Covers pushed by Links, and Workspace Persistence.
 *
 * The Deck tests click words of a stored Text whose occurrences are already
 * attested, so a click presents the stored route and runs no resolution.
 */

const BANKEN_TEXT =
	/^Die Banken sind geöffnet\. Morgen bleiben sie geschlossen\./;

test.use({ viewport: { width: 1600, height: 1000 } });

function frame(page: Page): Locator {
	return page.locator("[data-deck-frame]");
}

function rootedPane(page: Page): Locator {
	return frame(page).locator('[data-pane-kind="rooted"]');
}

/** The Rooted Pane's Ground, drawn over the Panes like every Note. */
function rootedGround(page: Page): Locator {
	return frame(page).locator('[data-form="ground"][data-pane="pane-1"]');
}

function trail(page: Page): Locator {
	return rootedPane(page).getByRole("navigation", { name: "Trail" });
}

function cards(page: Page): Locator {
	return frame(page).locator('[data-form="card"]');
}

function covers(page: Page): Locator {
	return frame(page).locator('[data-form="sheet"]');
}

function word(scope: Locator, text: string): Locator {
	return scope
		.locator('[data-slot="reader-segment"]')
		.filter({ hasText: new RegExp(`^${text}$`) });
}

/** The Library's stored Text, opened as the Rooted Pane's Ground. */
async function openBanken(page: Page) {
	await page.goto("/");
	await page.getByRole("button", { name: BANKEN_TEXT }).click();
	await expect(trail(page)).toContainText("Die Banken sind geöffnet.");
	const reader = rootedGround(page).locator('[data-slot="text-reader"]');
	await expect(reader).toBeVisible();
	return reader;
}

/**
 * A click on "Banken" deals its stored route, front first: the Reading, the
 * Lemma when it holds more than one stored Reading, the Surface (plural) and
 * the Attestation (`Die Banken`). Only the Lemma depends on what the local
 * backend has resolved, so the Deck holds three or four Cards; the count
 * dealt is returned for the steps that follow.
 */
async function dealBanken(page: Page): Promise<number> {
	const reader = rootedGround(page).locator('[data-slot="text-reader"]');
	await word(reader, "Banken").click();
	await expect(
		frame(page).locator('[data-form="card"] [data-attestation-title]'),
	).toHaveCount(1);
	const dealt = await cards(page).count();
	expect([3, 4]).toContain(dealt);
	await expect(word(reader, "Banken")).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	return dealt;
}

test("one URL: the Library is the Ground's first selection and Settings sits beside it", async ({
	page,
}) => {
	await page.goto("/library");
	await expect(page).toHaveURL("/");
	await expect(trail(page)).toHaveText(/Menu\s*›\s*Library/i);
	await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
	/* the sidebar keeps only the development Playground link */
	await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(
		0,
	);

	await rootedPane(page)
		.getByRole("button", { name: "Back to Menu" })
		.click();
	await expect(trail(page)).toHaveText(/^Menu$/i);
	const menu = rootedPane(page).locator("[data-ground-item]");
	await expect(menu).toHaveText(["Library", "Settings"]);

	await menu.filter({ hasText: "Settings" }).click();
	await expect(trail(page)).toHaveText(/Menu\s*›\s*Settings/i);
	await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
	await expect(page).toHaveURL("/");

	await rootedPane(page)
		.getByRole("button", { name: "Back to Menu" })
		.click();
	await menu.filter({ hasText: "Library" }).click();
	await expect(
		page.getByRole("button", { name: "Add a text" }),
	).toBeVisible();
});

test("a click deals a Deck on the Text, an edge drop makes a Floating Pane, and both survive a reload", async ({
	page,
}) => {
	await openBanken(page);
	const dealt = await dealBanken(page);

	/* lift the open Card, carry it up and onto the inline-end edge */
	const open = frame(page).locator('[data-form="card"][data-place="open"]');
	const heading = await open.locator("[data-heading]").boundingBox();
	const box = await frame(page).boundingBox();
	if (!heading || !box) throw new Error("Missing Card or frame geometry");
	await page.mouse.move(
		heading.x + heading.width / 2,
		heading.y + heading.height / 2,
	);
	await page.mouse.down();
	await page.mouse.move(heading.x + heading.width / 2, heading.y - 120, {
		steps: 8,
	});
	await expect(frame(page).locator("[data-held]")).toHaveCount(1);
	await page.mouse.move(box.x + box.width - 8, box.y + box.height / 3, {
		steps: 12,
	});
	await expect(
		frame(page).locator('[data-edge="right"][data-active="true"]'),
	).toHaveCount(1);
	await page.mouse.up();

	const floating = frame(page).locator('[data-pane-kind="floating"]');
	await expect(floating).toHaveCount(1);
	await expect(frame(page).locator("[data-held]")).toHaveCount(0);
	await expect(cards(page)).toHaveCount(dealt - 1);

	/* the layout, the Deck and its lit word come back after a reload */
	await page.reload();
	await expect(floating).toHaveCount(1);
	await expect(cards(page)).toHaveCount(dealt - 1);
	await expect(
		word(rootedGround(page).locator('[data-slot="text-reader"]'), "Banken"),
	).toHaveAttribute("aria-pressed", "true");

	/* X on the Floating Pane collapses its Ground back to its slot */
	await floating.getByRole("button", { name: "Close pane" }).click();
	await expect(floating).toHaveCount(0);
	await expect(cards(page)).toHaveCount(dealt);
});

test("Go to source pushes the Text as a Cover at its Sentence; Back retraces the Covers and leaves the Ground", async ({
	page,
}) => {
	await openBanken(page);
	const dealt = await dealBanken(page);

	/* the keyboard's Open: the Reading Card covers its Pane */
	await frame(page)
		.locator('[data-form="card"][data-place="open"]')
		.getByRole("button", { name: /as a Cover$/ })
		.focus();
	await page.keyboard.press("Enter");
	await expect(covers(page)).toHaveCount(1);
	const reading = covers(page).first();

	/* Go to source from its Source Context: a second Cover, the Text,
	   with the occurrence lit */
	await reading
		.getByRole("button", { name: /open in the source Text/ })
		.first()
		.click();
	await expect(covers(page)).toHaveCount(2);
	const source = covers(page).last();
	const sourceReader = source.locator('[data-slot="text-reader"]');
	await expect(sourceReader).toBeVisible();
	await expect(word(sourceReader, "Banken")).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	await expect(trail(page)).toContainText("Die Banken sind geöffnet.");

	/* Back closes the Link's Cover, then collapses the Reading to its Card */
	await source.getByRole("button", { name: "Close cover" }).click();
	await expect(covers(page)).toHaveCount(1);
	await covers(page)
		.first()
		.getByRole("button", { name: "Collapse back to card" })
		.click();
	await expect(covers(page)).toHaveCount(0);
	await expect(cards(page)).toHaveCount(dealt);
	await expect(
		rootedGround(page).locator('[data-slot="text-reader"]'),
	).toBeVisible();

	/* Escape sweeps the Deck; the Ground's Back steps down to the Library */
	await page.keyboard.press("Escape");
	await expect(cards(page)).toHaveCount(0);
	await rootedPane(page)
		.getByRole("button", { name: "Back to Library" })
		.click();
	await expect(trail(page)).toHaveText(/Menu\s*›\s*Library/i);
});

test("the Text's Segments stay hoverable after a dismissive click sweeps the Deck", async ({
	page,
}) => {
	const reader = await openBanken(page);
	await dealBanken(page);
	const pane = await rootedPane(page).boundingBox();
	if (!pane) throw new Error("Missing Pane geometry");
	await page.mouse.click(pane.x + 24, pane.y + pane.height * 0.75, {
		delay: 100,
	});
	await expect(cards(page)).toHaveCount(0);
	await expect(word(reader, "Banken")).toHaveAttribute(
		"aria-pressed",
		"false",
	);
	for (const text of ["Banken", "geöffnet", "Morgen", "geschlossen"]) {
		const segment = word(reader, text);
		const box = await segment.boundingBox();
		if (!box) throw new Error(`Missing geometry for ${text}`);
		const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
		await page.mouse.move(point.x, point.y, { steps: 6 });
		await expect
			.poll(() =>
				page.evaluate(({ x, y }) => {
					const target = document.elementFromPoint(x, y);
					return target ? getComputedStyle(target).cursor : null;
				}, point),
			)
			.toBe("pointer");
		await expect(segment).toHaveCSS("text-decoration-line", "underline");
	}
});
