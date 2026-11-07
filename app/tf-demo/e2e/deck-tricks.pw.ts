/// <reference lib="dom" />
import { expect, type Page, test } from "@playwright/test";
import { startFrameLog, stopFrameLog } from "./support/frames";
import { changesAfterDrop, jumps } from "./support/invariants";
import { stackingOffModel } from "./support/stacking";
import { atRest, inspector, offSlot } from "./support/tabletop";
import {
	expectTricks,
	logTricks,
	openDeck as openDeckIn,
	press,
	type Setting,
	settle,
	TRICKS,
	type TrickButton,
} from "./support/tabletop-tricks";

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
			.filter((child) => {
				const box = child.getBoundingClientRect();
				return (
					getComputedStyle(child).visibility !== "hidden" &&
					box.width * box.height > 0
				);
			})
			.map((child) =>
				child.matches("[data-tabletop-region]")
					? "felt"
					: child.querySelector("[data-tabletop-body]")
						? "card"
						: child.tagName,
			),
	);
	expect(new Set(shown)).toEqual(new Set(["felt", "card"]));
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
	const seat = top.locator("xpath=ancestor::*[@data-tabletop-seat]");
	expect(
		await seat.evaluate((el) =>
			(el as HTMLElement).style.getPropertyValue("--rest-z"),
		),
	).toBe("52");
	expect(await stackingOffModel(page)).toEqual([]);
});

/* #1322: a Card let go where it shows stays exactly there, in its pose,
   with the hand's speed thrown away: no box, rotation or scale change after
   the release, in either writing direction; the Deck's other Cards never
   jump or change their stacking against it. */
for (const dir of ["LTR", "RTL"] as const)
	test(`${dir}: a Card dropped in place, still moving, changes nothing after the release`, async ({
		page,
	}) => {
		test.setTimeout(40_000);
		await openDeck(page);
		if (dir === "RTL")
			await inspector(page)
				.getByRole("group", { name: "Direction" })
				.getByRole("button", { name: dir, exact: true })
				.click();
		await settled(page);
		await play(page, "Fan");
		await settled(page);
		/* the top Card, fanned furthest, at 130° */
		const id = "0_1";
		const card = page.locator(`[data-tabletop-body="${id}"]`);
		const box = await card.boundingBox();
		if (!box) throw new Error("no Card");
		const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
		const ids = [id, "0_2", "0_3"];
		await startFrameLog(page, { ids });
		await page.mouse.move(from.x, from.y);
		await page.mouse.down();
		for (let step = 1; step <= 10; step++)
			await page.mouse.move(from.x + step * 14, from.y + step * 9);
		/* let go while the hand still moves */
		await page.mouse.up();
		await page.waitForTimeout(700);
		const frames = await stopFrameLog(page);
		expect.soft(changesAfterDrop(frames, id)).toEqual([]);
		expect.soft(jumps(frames, ids)).toEqual([]);
		await settled(page);
		expect.soft(await stackingOffModel(page)).toEqual([]);
	});

/* #1322: what the reader sees of queued and composed tricks, frame by
   frame, in a plain browser and in T3's preview (reduced motion asked for
   by the page, the entry's knob off): no Card shows anywhere it hasn't
   travelled to or drops out of sight for a frame, nothing but the Table
   moves a Card, and every press waits for the trick before it to land. */
for (const setting of ["browser", "preview"] as const satisfies Setting[])
	test(`${setting}: Shuffle, By suit and Poker, composed of queued tricks, hold every frame invariant`, async ({
		page,
	}) => {
		test.setTimeout(90_000);
		await openDeckIn(page, setting);
		await press(page, "Flip");
		await settle(page);
		for (const name of ["Shuffle", "By suit", "Poker"] as const) {
			const { frames, ids } = await logTricks(page, [name]);
			expectTricks(frames, ids, `${setting} ${name}`);
		}
	});

/** How often each button is pressed in a row, and how far into its trick another press comes. */
const PRESSES: Record<TrickButton, { times: number; mid: number }> = {
	Intro: { times: 2, mid: 1200 },
	Flip: { times: 4, mid: 150 },
	Shuffle: { times: 3, mid: 400 },
	"By suit": { times: 2, mid: 1000 },
	Fan: { times: 3, mid: 300 },
	Poker: { times: 2, mid: 1000 },
	Sort: { times: 3, mid: 600 },
};

for (const half of [TRICKS.slice(0, 4), TRICKS.slice(4)])
	test(`preview: ${half.join(", ")} pressed rapidly queue each press behind the last`, async ({
		page,
	}) => {
		test.setTimeout(120_000);
		await openDeckIn(page, "preview");
		for (const name of half) {
			const { frames, ids } = await logTricks(
				page,
				Array.from({ length: PRESSES[name].times }, () => name),
			);
			expectTricks(frames, ids, `${name} ×${PRESSES[name].times}`);
		}
	});

test("preview: a press in the middle of each trick waits for it to land", async ({
	page,
}) => {
	test.setTimeout(120_000);
	await openDeckIn(page, "preview");
	for (const [index, name] of TRICKS.entries()) {
		const next = TRICKS[(index + 1) % TRICKS.length] ?? "Fan";
		const { frames, ids } = await logTricks(page, [
			name,
			PRESSES[name].mid,
			next,
		]);
		expectTricks(frames, ids, `${name}, then ${next} mid-trick`);
	}
});

test("preview: Fan pressed straight after the Intro deals, then fans", async ({
	page,
}) => {
	test.setTimeout(60_000);
	await openDeckIn(page, "preview");
	const { frames, ids } = await logTricks(page, ["Intro", "Fan"]);
	expectTricks(frames, ids, "Intro, then Fan");
	expect(
		new Set(
			Object.values(frames.at(-1)?.bodies ?? {}).map(
				(card) => card.rotate,
			),
		).size,
	).toBe(52);
});
