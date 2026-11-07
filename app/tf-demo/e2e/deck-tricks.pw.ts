/// <reference lib="dom" />
import { expect, type Page, test } from "@playwright/test";
import { atRest, inspector, offSlot } from "./support/tabletop";

/**
 * deck-of-cards' tricks on the tabletop battery: the felt is a Region and
 * each of the 52 Cards a Body resting in its Slot there. The inspector's
 * buttons queue each trick behind the one before, as the library does; the
 * entry opens with the intro and a sort, about 3.5 s.
 */

test.use({ viewport: { width: 1440, height: 900 } });

const CARDS = "[data-tabletop] [data-tabletop-body]";

async function openDeck(page: Page) {
	await page.goto("/playground/deck-tricks");
	await expect(page.locator(CARDS)).toHaveCount(52);
}

const play = (page: Page, name: string) =>
	inspector(page).getByRole("button", { name, exact: true }).click();

/** Each Card's centre, px from the felt's centre, its rotation and its side. */
function cardsOnFelt(page: Page) {
	return page.evaluate(() => {
		const felt = document
			.querySelector("[data-tabletop-region]")
			?.getBoundingClientRect();
		if (!felt) throw new Error("no felt");
		const cards: Record<
			string,
			{ x: number; y: number; rotate: number; side: string }
		> = {};
		for (const body of document.querySelectorAll<HTMLElement>(
			"[data-tabletop-body]",
		)) {
			const box = body.getBoundingClientRect();
			cards[body.dataset.tabletopBody ?? "?"] = {
				x: box.left + box.width / 2 - (felt.left + felt.width / 2),
				y: box.top + box.height / 2 - (felt.top + felt.height / 2),
				rotate: Number.parseFloat(getComputedStyle(body).rotate) || 0,
				side:
					body.querySelector<HTMLElement>("[data-tabletop-shell]")
						?.dataset.side ?? "",
			};
		}
		return cards;
	});
}

async function settled(page: Page, timeout = 10_000) {
	await expect.poll(() => atRest(page), { timeout }).toBe(true);
	expect(await offSlot(page)).toEqual([]);
}

test("Fan spreads all 52 Cards from −130° to 130°, as deck-of-cards does", async ({
	page,
}) => {
	await openDeck(page);
	await play(page, "Fan");
	// The king of diamonds, sorted to the bottom, fans furthest left.
	await expect
		.poll(async () => (await cardsOnFelt(page))["3_13"]?.rotate, {
			timeout: 10_000,
		})
		.toBe(-130);
	await settled(page);
	const cards = await cardsOnFelt(page);
	expect(cards["0_1"]?.rotate).toBe(130);
	expect(new Set(Object.values(cards).map((card) => card.rotate)).size).toBe(
		52,
	);
});

test("the surface shows only the felt and the Cards", async ({ page }) => {
	await openDeck(page);
	const surface = page.locator("[data-tabletop]");
	await expect(surface.locator("[data-tabletop-region]")).toHaveCount(1);
	await expect(surface.getByRole("button")).toHaveCount(0);
	await expect(surface).not.toContainText("Fan");
	const shown = await surface.evaluate((root) =>
		[...root.children]
			.filter((child) => getComputedStyle(child).visibility !== "hidden")
			.map((child) =>
				child.matches("[data-tabletop-region]")
					? "felt"
					: child.querySelector("[data-tabletop-body]")
						? "card"
						: child.tagName,
			),
	);
	expect(new Set(shown)).toEqual(new Set(["STYLE", "felt", "card"]));
});

/** The angle a Card's shell shows mid-turn, from its written transform; null at rest. */
function turnAngle(page: Page, id: string) {
	return page.evaluate((id) => {
		const shell = document.querySelector<HTMLElement>(
			`[data-tabletop-body="${id}"] [data-tabletop-shell]`,
		);
		const turning = /rotateY\((-?[\d.]+)deg\)/.exec(
			shell?.style.transform ?? "",
		);
		return turning ? Number(turning[1]) : null;
	}, id);
}

test("Flip turns every Card over in 3D, through the angles between", async ({
	page,
}) => {
	await openDeck(page);
	const card = page.locator('[data-tabletop-body="2_5"]');
	const shell = card.locator("[data-tabletop-shell]");
	// The intro leaves the Deck face down; Flip turns it face up.
	await play(page, "Flip");
	await expect(shell).toHaveAttribute("data-side", "front", {
		timeout: 10_000,
	});
	await settled(page);
	await expect(shell).toHaveCSS("transform-style", "preserve-3d");
	await expect(card.locator('[data-tabletop-face="back"]')).toHaveCSS(
		"backface-visibility",
		"hidden",
	);

	// Slowed four times, the next Flip is caught mid-turn on its way face down.
	await inspector(page).getByRole("button", { name: "0.25×" }).click();
	await play(page, "Flip");
	await expect
		.poll(
			async () => {
				const angle = await turnAngle(page, "2_5");
				return angle !== null && angle > 20 && angle < 160;
			},
			{ timeout: 5_000, intervals: [16] },
		)
		.toBe(true);
	await expect(shell).toHaveAttribute("data-side", "back");
	await settled(page);
});

test("Poker turns the Deck down, shuffles it twice and deals five face up in a row", async ({
	page,
}) => {
	await openDeck(page);
	await play(page, "Flip");
	await play(page, "Poker");
	await expect
		.poll(
			async () =>
				Object.values(await cardsOnFelt(page)).filter(
					(card) => card.side === "front",
				).length,
			{ timeout: 12_000 },
		)
		.toBe(5);
	await settled(page);
	const dealt = Object.values(await cardsOnFelt(page))
		.filter((card) => card.side === "front")
		.sort((a, b) => a.x - b.x);
	for (const [index, x] of [-143, -73, -3, 67, 137].entries()) {
		expect(dealt[index]?.x).toBeCloseTo(x, 0);
		expect(dealt[index]?.y).toBeCloseTo(-110, 0);
	}
});

test("By suit sorts the Deck, then lays it out in a row per suit", async ({
	page,
}) => {
	await openDeck(page);
	await play(page, "By suit");
	await expect
		.poll(async () => (await cardsOnFelt(page))["3_13"]?.y, {
			timeout: 12_000,
		})
		.toBeCloseTo(138, 0);
	await settled(page);
	const cards = await cardsOnFelt(page);
	expect(cards["1_5"]?.x).toBeCloseTo(-14, 0);
	expect(cards["1_5"]?.y).toBeCloseTo(-46, 0);
});

test("a Card dragged off the Deck stays where it is put, over the others", async ({
	page,
}) => {
	await openDeck(page);
	await settled(page);
	const top = page.locator('[data-tabletop-body="0_1"]');
	const box = await top.boundingBox();
	if (!box) throw new Error("no Card");
	const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
	await page.mouse.move(from.x, from.y);
	await page.mouse.down();
	await page.mouse.move(from.x + 90, from.y + 60, { steps: 8 });
	await page.mouse.move(from.x + 180, from.y + 120, { steps: 8 });
	await page.waitForTimeout(120);
	await page.mouse.up();
	await settled(page);
	const moved = await top.boundingBox();
	expect(moved?.x).toBeCloseTo(box.x + 180, 0);
	expect(moved?.y).toBeCloseTo(box.y + 120, 0);
	await expect(
		top.locator("xpath=ancestor::*[@data-tabletop-seat]"),
	).toHaveCSS("z-index", "52");
});
