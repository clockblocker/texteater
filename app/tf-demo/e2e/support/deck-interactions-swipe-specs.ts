/// <reference lib="dom" />
import { expect, test } from "@playwright/test";
import { chooseVariant } from "./deck-interactions";
import {
	DIRECTIONS,
	direct,
	movesOf,
	sweep,
	sweepGrowing,
	WAYS,
} from "./deck-interactions-swipe";

/**
 * The Deck interactions spec's swipe checks in each writing direction,
 * declared into it by `swipeDirectionSpecs`: every Card takes every swipe,
 * and the panel fits the swiped Card and holds its icon still.
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
				[end]: "expand armed, opens",
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
