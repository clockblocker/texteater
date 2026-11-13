/// <reference lib="dom" />
import { expect, test } from "@playwright/test";
import {
	chooseVariant,
	frame,
	landed,
	panel,
	redeal,
	reduceMotion,
} from "./deck-interactions";
import {
	DIRECTIONS,
	direct,
	movesOf,
	panelPath,
	sweep,
	sweepGrowing,
	UPS,
	WAYS,
} from "./deck-interactions-swipe";
import { record } from "./deck-interactions-tap";

/**
 * The Deck interactions spec's swipe checks in each writing direction,
 * declared into it by `swipeDirectionSpecs`: every Card takes every swipe,
 * and the panel fits the swiped Card and holds its icon still. The spec's
 * screen is wide, so inline-end opens the Card in the other Pane.
 */
export function swipeDirectionSpecs() {
	for (const to of DIRECTIONS) {
		test(`D in ${to}: every Card in the Deck takes the front Card's swipes`, async ({
			page,
		}) => {
			test.setTimeout(90_000);
			await chooseVariant(page, "D · Swipe actions");
			await direct(page, to);
			const front = await movesOf(page, 3);
			const [start, end] =
				to === "LTR" ? ["left", "right"] : ["right", "left"];
			expect(front).toEqual({
				[start]: "dismiss armed, closes",
				[end]: "other-pane armed, opens",
				up: "expand armed, opens",
				down: "dismiss armed, closes",
			});
			for (const lead of [0, 1, 2])
				expect(await movesOf(page, lead), `Card ${lead}`).toEqual(
					front,
				);
		});

		test(`D in ${to}: the panel is the swiped Card's shown box less its border, held and moving, at any scale`, async ({
			page,
		}) => {
			test.setTimeout(45_000);
			await chooseVariant(page, "D · Swipe actions");
			await direct(page, to);
			for (const [lead, x, y] of WAYS) {
				const seen = await sweep(page, lead, x, y);
				expect(seen.frames, `Card ${lead}`).toBeGreaterThan(30);
				expect(seen.fit, `Card ${lead}`).toBeLessThanOrEqual(0.5);
			}
			const growing = await sweepGrowing(page);
			expect(growing.frames).toBeGreaterThan(10);
			expect(growing.fit).toBeLessThanOrEqual(0.5);
		});

		test(`D in ${to}: once the panel is full its icon and label stay put while the Card travels on`, async ({
			page,
		}) => {
			test.setTimeout(45_000);
			await chooseVariant(page, "D · Swipe actions");
			await direct(page, to);
			for (const [lead, x, y] of WAYS) {
				const seen = await sweep(page, lead, x, y);
				expect(seen.still, `Card ${lead}`).toBeGreaterThan(5);
				expect(seen.travel, `Card ${lead}`).toBeGreaterThan(100);
				expect(seen.drift, `Card ${lead}`).toBeLessThanOrEqual(0.5);
			}
		});
	}
}

/**
 * D's drag up, toward Open, declared into the spec by `swipeUpSpecs`, in a
 * browser that reports reduced motion, as the user's does, with the
 * inspector's Reduced motion off and on. On the front Card and one behind
 * it, every way `UPS` drags, frame by frame: the panel shows only what the
 * hand uncovers, under the Card and the Cards in front of it; its colour
 * floods only once it arms; and once the hand lets go it only ever shows
 * less of itself: the Card coming home or opening into the Cover covers
 * it, and nothing uncovers it.
 */
export function swipeUpSpecs() {
	for (const reduced of [false, true])
		test(`D${reduced ? ", reduced" : ""}: dragged up, the Open panel shows only what the hand uncovers, under the Cards in front, and once let go only ever less of it`, async ({
			page,
		}) => {
			test.setTimeout(90_000);
			await page.emulateMedia({ reducedMotion: "reduce" });
			await chooseVariant(page, "D · Swipe actions");
			if (reduced) await reduceMotion(page);
			const open = frame(page).locator("[data-expanded]");
			for (const lead of [3, 1])
				for (const [way, drag] of Object.entries(UPS)) {
					await page.mouse.move(5, 5);
					await landed(page);
					const id =
						(await frame(page)
							.locator("[data-card-id]")
							.nth(lead)
							.getAttribute("data-card-id")) ?? "";
					const done = await record(page, 1500);
					await drag(page, id);
					const seen = panelPath(await done());
					const at = `${way}, Card ${lead}`;
					expect.soft(seen.frames, at).toBeGreaterThan(5);
					expect.soft(seen.grew, at).toBeLessThanOrEqual(1);
					expect.soft(seen.under, at).toBe(0);
					expect.soft(seen.flooded, at).toBe(0);
					await expect.soft(panel(page), at).toHaveCount(0);
					if ((await open.count()) > 0) {
						await frame(page)
							.getByRole("button", { name: "Close" })
							.click();
						await expect(open).toHaveCount(0);
					}
					await redeal(page);
				}
		});
}
