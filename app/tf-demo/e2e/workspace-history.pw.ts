/// <reference lib="dom" />
import { expect, type Page, test } from "@playwright/test";
import {
	cards,
	covers,
	dealBanken,
	frame,
	openBanken,
	rootedGround,
	rootedPane,
	trail,
} from "./support/workspace";

/**
 * The browser's history walks the Pane's Sheet Stack (tf-demo ADR 0015):
 * the URL is its Address, Back does what ← does, Forward follows the Sheet
 * again with no Deck, and a reload or a pasted link opens the same Ground
 * line and Covers. Loading an Address never deals a Deck.
 */

test.use({ viewport: { width: 1600, height: 1000 } });

const SCROLL = /\/scroll\/[^/]+$/;
const READING = /\/scroll\/[^/]+\/reading\/[^/]+$/;
const SOURCE = /\/scroll\/[^/]+\/reading\/[^/]+\/source\/[^/]+\/[^/]+$/;

/** The Banken Scroll with its Deck, its Reading open as a Cover, and Go to source over that. */
async function toSource(page: Page): Promise<number> {
	await openBanken(page);
	await expect(page).toHaveURL(SCROLL);
	const dealt = await dealBanken(page);
	await expect(page).toHaveURL(SCROLL);
	await frame(page)
		.locator('[data-form="card"][data-place="open"]')
		.getByRole("button", { name: /as a Cover$/ })
		.focus();
	await page.keyboard.press("Enter");
	await expect(covers(page)).toHaveCount(1);
	await expect(page).toHaveURL(READING);
	await covers(page)
		.first()
		.getByRole("button", { name: "Banken, open in the source Text" })
		.click();
	await expect(covers(page)).toHaveCount(2);
	await expect(page).toHaveURL(SOURCE);
	return dealt;
}

test("browser Back does what ← does at every step, and Forward reopens a Sheet with no Deck", async ({
	page,
}) => {
	const dealt = await toSource(page);

	/* Back closes the Link's Cover, then collapses the Reading to its Card */
	await page.goBack();
	await expect(covers(page)).toHaveCount(1);
	await expect(page).toHaveURL(READING);
	await page.goBack();
	await expect(covers(page)).toHaveCount(0);
	await expect(cards(page)).toHaveCount(dealt);
	await expect(page).toHaveURL(SCROLL);

	/* Forward follows the Reading afresh: a Link Cover, no Deck of its own */
	await page.goForward();
	await expect(covers(page)).toHaveCount(1);
	await expect(page).toHaveURL(READING);
	await expect(cards(page)).toHaveCount(0);
	/* it is no Card of the Deck, so Back closes it rather than collapsing */
	await expect(
		covers(page).getByRole("button", { name: "Close cover" }),
	).toBeVisible();
	await page.goBack();
	await expect(covers(page)).toHaveCount(0);
	await expect(cards(page)).toHaveCount(dealt);

	/* on the Ground, Back steps one rung down and the Deck ends with it */
	await page.goBack();
	await expect(trail(page)).toHaveText(/Menu\s*›\s*Library/i);
	await expect(page).toHaveURL("/library");
	await expect(cards(page)).toHaveCount(0);
});

test("× goes back past every Cover, so the next Back steps down the line", async ({
	page,
}) => {
	await toSource(page);
	await covers(page)
		.last()
		.getByRole("button", { name: "Close every Cover" })
		.click();
	await expect(covers(page)).toHaveCount(0);
	await expect(page).toHaveURL(SCROLL);
	await page.goBack();
	await expect(page).toHaveURL("/library");
	await expect(trail(page)).toHaveText(/Menu\s*›\s*Library/i);
});

test("a reload keeps the line, the Covers and the Deck; a pasted link opens the same line and Covers with no Deck", async ({
	page,
	browser,
}) => {
	const dealt = await toSource(page);
	const address = page.url();

	await page.reload();
	await expect(page).toHaveURL(address);
	await expect(covers(page)).toHaveCount(2);
	await page.goBack();
	await page.goBack();
	await expect(covers(page)).toHaveCount(0);
	await expect(cards(page)).toHaveCount(dealt);

	const fresh = await browser.newContext({
		viewport: { width: 390, height: 844 },
	});
	try {
		const pasted = await fresh.newPage();
		await pasted.goto(address);
		await expect(pasted).toHaveURL(address);
		await expect(covers(pasted)).toHaveCount(2);
		await expect(trail(pasted)).toContainText("Die Banken sind geöffnet.");
		await expect(
			covers(pasted).last().locator('[data-slot="text-reader"]'),
		).toBeVisible();
		/* no Deck is dealt by loading an Address */
		await expect(cards(pasted)).toHaveCount(0);

		/* Back walks the pasted stack down as ← would */
		await pasted.goBack();
		await expect(covers(pasted)).toHaveCount(1);
		await pasted.goBack();
		await expect(covers(pasted)).toHaveCount(0);
		await expect(
			rootedGround(pasted).locator('[data-slot="text-reader"]'),
		).toBeVisible();
		await expect(cards(pasted)).toHaveCount(0);
		await pasted.goBack();
		await expect(pasted).toHaveURL("/library");
		await expect(rootedPane(pasted)).toHaveCount(1);
	} finally {
		await fresh.close();
	}
});

test("a stale id shows Not found, and Back still walks the line", async ({
	page,
}) => {
	await page.goto("/library/lemma/not-a-lemma");
	await expect(covers(page)).toHaveCount(1);
	await expect(covers(page)).toContainText(/not found/i);
	await page.goBack();
	await expect(covers(page)).toHaveCount(0);
	await expect(page).toHaveURL("/library");
});
