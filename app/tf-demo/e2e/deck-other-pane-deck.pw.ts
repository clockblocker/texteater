/// <reference lib="dom" />
import { expect, type Page, test } from "@playwright/test";
import { frame, inspector, landed, pull } from "./support/deck-interactions";
import { byId, cardAt, openCover } from "./support/deck-interactions-close";
import {
	movesFrom,
	offBy,
	record,
	restingAs,
	type Shown,
	shown,
	tailOf,
	tapAt,
	trackOf,
} from "./support/deck-interactions-tap";
import {
	expectRest,
	inside,
	openAside,
	paneBox,
} from "./support/deck-other-pane";

/**
 * D with a Card open in the other Pane (#1350): it goes home the way it
 * went there, in one straight glide that shrinks it as it travels; the
 * rest of the Deck stays free to be swiped, tapped and opened meanwhile;
 * and a Card open over the Deck hides every other Card on it, but not the
 * one in the other Pane.
 */

test.use({ viewport: { width: 1600, height: 1000 } });

test.beforeEach(async ({ page }) => {
	await page.goto("/playground/deck-interactions");
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
	await page.mouse.move(5, 5);
	await landed(page);
});

const aside = (page: Page) => frame(page).locator("[data-aside]");
const cover = (page: Page) =>
	frame(page).locator("[data-expanded]:not([data-aside])");
const closeOf = (page: Page, id: string) =>
	byId(page, id).getByRole("button", { name: "Close", exact: true });

/** Each Card's own opacity by id, once the Deck has landed. */
async function opacities(page: Page) {
	await page.mouse.move(5, 5);
	await landed(page);
	return Object.fromEntries(
		(await shown(page)).map((own) => [own.id, own.o]),
	);
}

/** Lands, then expects the Card at each place in the Deck where `rest` had one, to half a px, whichever Card it is now. */
async function expectSlots(page: Page, rest: readonly Shown[]) {
	await page.mouse.move(5, 5);
	await landed(page);
	(await shown(page)).forEach((card, index) => {
		const slot = rest[index];
		if (!slot) throw new Error(`No Card ${index}`);
		expect(offBy(card, slot)).toBeLessThanOrEqual(0.5);
	});
}

for (const rtl of [false, true])
	test(`D wide${rtl ? " in RTL" : ""}: from the other Pane a Card behind the front one goes home in one straight glide, shrinking from its first frame, under the Cards in front all the way, as it went there`, async ({
		page,
	}) => {
		if (rtl)
			await inspector(page)
				.getByRole("button", { name: "RTL", exact: true })
				.click();
		await page.mouse.move(5, 5);
		await landed(page);
		const rest = await shown(page);
		const ids = rest.map((own) => own.id);
		const lead = 1;
		const id = ids[lead] ?? "";
		const slot = rest[lead];
		if (!slot) throw new Error(`No Card ${lead}`);
		await openAside(page, rtl ? -150 : 150, cardAt(page, lead));
		const from = (await shown(page)).find((own) => own.id === id);
		if (!from) throw new Error("No Card in the other Pane");
		const done = await record(page, 1200);
		await closeOf(page, id).click();
		await page.mouse.move(5, 5);
		const frames = await done();
		const track = trackOf(frames, id);
		const moves = movesFrom(frames, id);
		const first = track[moves];
		if (moves < 1 || !first) throw new Error("It never moved");
		/* no leg carries it whole: it shrinks from its first frame */
		expect(first.w).toBeLessThan(from.w - 0.01);
		expect(first.h).toBeLessThan(from.h - 0.01);
		const way = { u: slot.u - from.u, v: slot.v - from.v };
		const length = Math.hypot(way.u, way.v);
		const ahead = ids.slice(lead + 1);
		for (let i = moves; i < track.length; i++) {
			const at = track[i];
			const before = track[i - 1];
			const sample = frames[i];
			if (!at || !before || !sample) continue;
			/* only ever toward its slot, along the line there */
			expect(Math.abs(at.u - slot.u)).toBeLessThanOrEqual(
				Math.abs(before.u - slot.u) + 0.5,
			);
			expect(
				Math.hypot(at.u - slot.u, at.v - slot.v),
			).toBeLessThanOrEqual(
				Math.hypot(before.u - slot.u, before.v - slot.v) + 0.5,
			);
			expect(
				Math.abs((at.u - from.u) * way.v - (at.v - from.v) * way.u) /
					length,
			).toBeLessThanOrEqual(1.5);
			expect(at.w).toBeLessThanOrEqual(before.w + 0.5);
			expect(at.h).toBeLessThanOrEqual(before.h + 0.5);
			/* in its place in the stacking from the start */
			for (const card of sample.cards)
				if (ahead.includes(card.id)) expect(at.z).toBeLessThan(card.z);
		}
		for (const other of ids)
			if (other !== id) expect(movesFrom(frames, other)).toBe(-1);
		await expectRest(page, rest);
	});

test("D: a Card open over the Deck hides every other Card on it, and they come back as it closes", async ({
	page,
}) => {
	const ids = (await shown(page)).map((own) => own.id);
	await openCover(page, 2);
	expect(await opacities(page)).toEqual({
		[ids[0] ?? ""]: 0,
		[ids[1] ?? ""]: 0,
		[ids[2] ?? ""]: 1,
		[ids[3] ?? ""]: 0,
	});
	await closeOf(page, ids[2] ?? "").click();
	await expect(cover(page)).toHaveCount(0);
	expect(Object.values(await opacities(page))).toEqual([1, 1, 1, 1]);
});

test("D wide: with a Card in the other Pane the rest of the Deck still opens over it, up or by a double-tap, hiding every Card on it but not that one, and a swipe of another into the other Pane sends the first home", async ({
	page,
}) => {
	test.setTimeout(60_000);
	const rest = await shown(page);
	const ids = rest.map((own) => own.id);
	const [back = "", second = "", third = "", top = ""] = ids;
	await openAside(page, 150);
	const there = (await shown(page)).find((own) => own.id === top);
	if (!there) throw new Error("No Card in the other Pane");
	/** The Card in the other Pane is still there, as it was, and shows. */
	const stays = async () => {
		await expect(aside(page)).toHaveAttribute("data-card-id", top);
		const now = (await shown(page)).find((own) => own.id === top);
		expect(now && offBy(now, there)).toBeLessThanOrEqual(0.5);
		expect(now?.o).toBe(1);
	};

	/* up, then Escape, which closes the Cover over the Deck first */
	await pull(page, cardAt(page, 1), 0, -150);
	await page.mouse.up();
	await expect(cover(page)).toHaveAttribute("data-card-id", second);
	expect(await opacities(page)).toEqual({
		[back]: 0,
		[second]: 1,
		[third]: 0,
		[top]: 1,
	});
	await stays();
	await page.keyboard.press("Escape");
	await expect(cover(page)).toHaveCount(0);
	/* the Escape was the Cover's: the Inspector stays */
	await expect(inspector(page)).toBeVisible();
	expect(Object.values(await opacities(page))).toEqual([1, 1, 1, 1]);
	await stays();

	/* a double-tap on a Card other than the open one, which its first tap
	   opens in the Deck, at once and in its place, while the one in the
	   other Pane keeps its place there */
	const at = await tailOf(byId(page, third));
	await tapAt(page, at);
	await page.waitForTimeout(60);
	await tapAt(page, at);
	await expect(cover(page)).toHaveAttribute("data-card-id", third);
	expect(await opacities(page)).toEqual({
		[back]: 0,
		[second]: 0,
		[third]: 1,
		[top]: 1,
	});
	await stays();
	await closeOf(page, third).click();
	await expect(cover(page)).toHaveCount(0);
	expect(Object.values(await opacities(page))).toEqual([1, 1, 1, 1]);
	await stays();

	/* the back Card into the other Pane: the one there goes home */
	await openAside(page, 150, byId(page, back));
	await expect(aside(page)).toHaveAttribute("data-card-id", back);
	const now = await shown(page);
	const moved = now.find((own) => own.id === back);
	expect(moved && inside(moved, await paneBox(page))).toBe(true);
	/* the double-tapped Card is the open one now */
	const opened = restingAs(rest, ids.indexOf(third));
	now.forEach((card, index) => {
		const slot = opened[index];
		if (card.id !== back && slot)
			expect(offBy(card, slot)).toBeLessThanOrEqual(0.5);
	});

	/* closed while a Card is open over the Deck, it goes home there and
	   is hidden with the rest of it */
	await pull(page, byId(page, second), 0, -150);
	await page.mouse.up();
	await expect(cover(page)).toHaveAttribute("data-card-id", second);
	await closeOf(page, back).click();
	await expect(aside(page)).toHaveCount(0);
	expect((await opacities(page))[back]).toBe(0);
	await page.keyboard.press("Escape");
	await expect(cover(page)).toHaveCount(0);
	expect(Object.values(await opacities(page))).toEqual([1, 1, 1, 1]);
	await expectSlots(page, opened);
});
