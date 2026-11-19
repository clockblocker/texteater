/// <reference lib="dom" />
import { expect, type Page, test } from "@playwright/test";
import {
	chooseVariant,
	frame,
	inspector,
	landed,
	redeal,
	reduceMotion,
} from "./deck-interactions";
import {
	offRest,
	onTop,
	record,
	restingAs,
	type Sample,
	type Shown,
	shown,
	stripOf,
	tapAt,
} from "./deck-interactions-tap";

/**
 * The Deck interactions spec's taps, declared into it by `tapSpecs`: a tap
 * opens a Card in its Deck as tf-demo's does, a state and not a move. The
 * order never changes and every Card keeps its slot; from the first frame
 * after the tap the tapped Card has the open scale and is over every
 * other, the rest stacked by their distance from it, none travelling or
 * fading. In D, in both writing directions and reduced.
 */

const card = (page: Page, index: number) =>
	frame(page).locator("[data-card-id]").nth(index);

/** Opens D in a writing direction, reduced or not, the pointer off the Deck. */
async function open(page: Page, rtl = false, reduce = false) {
	await chooseVariant(page, "D · Swipe actions");
	if (rtl)
		await inspector(page)
			.getByRole("button", { name: "RTL", exact: true })
			.click();
	if (reduce) await reduceMotion(page);
	await page.mouse.move(5, 5);
	await landed(page);
}

/** Expects `cards` to rest exactly as `rest` has them: in place, stacked, solid. */
function expectAt(cards: readonly Shown[], rest: readonly Shown[], at: string) {
	const now = offRest(cards, rest);
	expect(now.dom, at).toEqual(rest.map((own) => own.id));
	expect(now.off, at).toBeLessThanOrEqual(0.01);
	expect(now.stacked, at).toBe(true);
}

/** The frames from the first after the hand let go of its first press. */
function afterTap(frames: readonly Sample[]) {
	const from = frames.findIndex(
		(sample) => sample.presses > 0 && !sample.down,
	);
	expect(from).toBeGreaterThanOrEqual(0);
	return { before: frames.slice(0, from), after: frames.slice(from) };
}

/**
 * With the Card at `from` open, taps Card `lead` in the strip of it that
 * shows and judges every frame: before the hand lets go the Deck rests as
 * it did, and from the first frame after, exactly as it rests with `lead`
 * open, `lead` over every other Card. Then the Deck stays so.
 */
async function tapAndJudge(
	page: Page,
	dealt: readonly Shown[],
	from: number,
	lead: number,
) {
	const was = restingAs(dealt, from);
	const now = restingAs(dealt, lead);
	const id = now[lead]?.id ?? "";
	expectAt(await shown(page), was, "before the tap");
	const done = await record(page, 400);
	await tapAt(page, await stripOf(card(page, lead)));
	await page.mouse.move(5, 5);
	const { before, after } = afterTap(await done());
	expect(after.length).toBeGreaterThan(5);
	before.forEach((sample, index) => {
		expectAt(sample.cards, was, `frame ${index}, hand down`);
	});
	after.forEach((sample, index) => {
		expectAt(sample.cards, now, `frame ${index} after the tap`);
		expect(onTop(sample, id), `frame ${index} after the tap`).toBe(true);
	});
	await expect(card(page, lead)).toHaveAttribute("data-place", "open");
	await landed(page);
	expectAt(await shown(page), now, "at rest");
}

export function tapSpecs() {
	for (const rtl of [false, true])
		for (const reduce of [false, true])
			test(`D in ${rtl ? "RTL" : "LTR"}${reduce ? ", reduced" : ""}: a tap opens a Card at once and in its place: from the first frame after it the tapped Card has the open scale and the top of the stack, z falling off by distance from it, and no Card moves, restacks out of turn or fades`, async ({
				page,
			}) => {
				await open(page, rtl, reduce);
				const dealt = await shown(page);
				expect(dealt).toHaveLength(4);
				/* above the open Card, then one folded below it, then the
				   last, below, then back to one above */
				await tapAndJudge(page, dealt, 3, 0);
				await tapAndJudge(page, dealt, 0, 2);
				await tapAndJudge(page, dealt, 2, 3);
				await tapAndJudge(page, dealt, 3, 1);
			});

	test("D: a double-tap on a Card other than the open one still opens it", async ({
		page,
	}) => {
		await open(page);
		const id = (await card(page, 0).getAttribute("data-card-id")) ?? "";
		const at = await stripOf(card(page, 0));
		await tapAt(page, at);
		await page.waitForTimeout(80);
		await tapAt(page, at);
		await expect(frame(page).locator("[data-expanded]")).toHaveAttribute(
			"data-card-id",
			id,
		);
	});

	test("D: a tap on the open Card moves and restacks nothing", async ({
		page,
	}) => {
		await open(page);
		const dealt = await shown(page);
		const rest = restingAs(dealt, 3);
		const done = await record(page, 400);
		await tapAt(page, await stripOf(card(page, 3)));
		await page.mouse.move(5, 5);
		const frames = await done();
		frames.forEach((sample, index) => {
			expectAt(sample.cards, rest, `frame ${index}`);
		});
		await landed(page);
		expectAt(await shown(page), rest, "at rest");
	});

	test("D: Re-deal opens the dealt Card again, the last", async ({
		page,
	}) => {
		await open(page);
		const dealt = await shown(page);
		await tapAt(page, await stripOf(card(page, 1)));
		await expect(card(page, 1)).toHaveAttribute("data-place", "open");
		await redeal(page);
		await page.mouse.move(5, 5);
		await landed(page);
		await expect(card(page, 3)).toHaveAttribute("data-place", "open");
		expectAt(await shown(page), restingAs(dealt, 3), "re-dealt");
	});
}
