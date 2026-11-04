/// <reference lib="dom" />
import { expect, type Locator, type Page, test } from "@playwright/test";

/**
 * The main app's workspace as its specs see it: the Rooted Pane, its
 * Ground, Covers and dealt Cards, and the Banken Scroll the Deck specs
 * click. Once its occurrences are attested, a click presents the stored
 * route and runs no resolution; on a fresh backend the first run pays for
 * intake and one resolution.
 */

const BANKEN_TEXT = "Die Banken sind geöffnet. Morgen bleiben sie geschlossen.";

export function frame(page: Page): Locator {
	return page.locator("[data-deck-frame]");
}

export function rootedPane(page: Page): Locator {
	return frame(page).locator('[data-pane-kind="rooted"]');
}

/** The Rooted Pane's Ground, drawn over the Panes like every Note. */
export function rootedGround(page: Page): Locator {
	return frame(page).locator('[data-form="ground"][data-pane="pane-1"]');
}

export function trail(page: Page): Locator {
	return rootedPane(page).getByRole("navigation", { name: "Trail" });
}

export function cards(page: Page): Locator {
	return frame(page).locator('[data-form="card"]');
}

export function covers(page: Page): Locator {
	return frame(page).locator('[data-form="sheet"]');
}

export function word(scope: Locator, text: string): Locator {
	return scope
		.locator('[data-slot="reader-segment"]')
		.filter({ hasText: new RegExp(`^${text}$`) });
}

/**
 * The Banken Scroll, opened as the Rooted Pane's Ground. The local backend
 * is long-lived, so other stored Scrolls may start with the same words;
 * submitting the text through "Add a text" opens the one Scroll stored under
 * its submission key, with no intake run, and stores it on a fresh backend.
 */
export async function openBanken(page: Page) {
	/* a fresh backend runs intake here and a resolution on the first click */
	test.setTimeout(90_000);
	await page.goto("/");
	await page.getByRole("button", { name: "Add a text" }).click();
	const dialog = page.getByRole("dialog", { name: "Add a text" });
	await dialog
		.getByLabel("German text, or a link to an article")
		.fill(BANKEN_TEXT);
	await dialog.getByRole("button", { name: "Analyze text" }).click();
	await expect(dialog).toHaveCount(0, { timeout: 60_000 });
	await expect(trail(page)).toContainText("Die Banken sind geöffnet.");
	const reader = rootedGround(page).locator('[data-slot="text-reader"]');
	await expect(reader).toBeVisible();
	return reader;
}

/** The Note kinds of the dealt Cards, back to front, `?` for one still loading. */
function dealtKinds(page: Page): Promise<string> {
	return cards(page).evaluateAll((elements) =>
		elements
			.map(
				(card) =>
					card
						.querySelector("[data-note-kind]")
						?.getAttribute("data-note-kind") ?? "?",
			)
			.join(" "),
	);
}

function dealtCard(page: Page, kind: string): Locator {
	return cards(page).filter({
		has: page.locator(`[data-note-kind="${kind}"]`),
	});
}

/**
 * A click on "Banken" deals its story (tf-demo ADR 0011), back to front: the
 * Attestation, since `Die Banken` has two members; the Surface, since plural
 * `Banken` is not its Lemma's Grundform; the Lemma only when `Bank` holds more
 * than one stored Reading, which turns on what the local backend has
 * resolved; and the Reading. The count dealt is returned for the steps that
 * follow.
 */
export async function dealBanken(page: Page): Promise<number> {
	const reader = rootedGround(page).locator('[data-slot="text-reader"]');
	await word(reader, "Banken").click();
	await expect
		.poll(() => dealtKinds(page), { timeout: 60_000 })
		.toMatch(/^Attestation Surface (Lemma )?Reading$/);
	await expect(
		dealtCard(page, "Attestation").locator("[data-attestation-title]"),
	).toHaveText("Die Banken");
	await expect(
		dealtCard(page, "Surface").locator("[data-heading]"),
	).toContainText("plural of");
	const dealt = (await dealtKinds(page)).split(" ").length;
	if (dealt === 4)
		await expect(
			dealtCard(page, "Lemma").locator("[data-heading]"),
		).toContainText(/\b([2-9]|\d{2,}) readings/);
	await expect(
		dealtCard(page, "Reading").locator("[data-heading]"),
	).toContainText("Bank");
	await expect(word(reader, "Banken")).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	return dealt;
}
