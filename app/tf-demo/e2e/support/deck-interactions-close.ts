/// <reference lib="dom" />
import { expect, type Page } from "@playwright/test";
import { frame, inspector, landed, pull } from "./deck-interactions";
import {
	offBy,
	type Sample,
	type Shown,
	stackingOf,
	trackOf,
} from "./deck-interactions-tap";

/**
 * The Cover's close for the Deck interactions spec: opening a Card into
 * the Cover as a hand does, where the close's first leg takes it, and
 * how a recorded close went, frame by frame. Boxes are `Shown`'s: drawn,
 * in logical px.
 */

export const cardAt = (page: Page, index: number) =>
	frame(page).locator("[data-card-id]").nth(index);
export const byId = (page: Page, id: string) =>
	frame(page).locator(`[data-card-id="${id}"]`);
export const closeButton = (page: Page) =>
	frame(page).getByRole("button", { name: "Close", exact: true });

/**
 * Opens Card `lead` (back to front) into the Cover as a hand does: it
 * swipes it up past the threshold. Resolves once it rests there, the
 * pointer off the Deck.
 */
export async function openCover(page: Page, lead: number) {
	await pull(page, cardAt(page, lead), 0, -150);
	await page.mouse.up();
	await expect(frame(page).locator("[data-expanded]")).toHaveCount(1);
	await page.mouse.move(5, 5);
	await landed(page);
}

/** A range knob's value as the inspector shows it. */
export async function knobValue(page: Page, label: string) {
	return Number(
		await inspector(page)
			.getByRole("slider", { name: label, exact: true })
			.inputValue(),
	);
}

/** Whether two drawn boxes overlap by more than touching. */
function overlaps(a: Shown, b: Shown) {
	return (
		Math.abs(a.u - b.u) < (a.w + b.w) / 2 &&
		Math.abs(a.v - b.v) < (a.h + b.h) / 2
	);
}

/** Whether Card `id` overlaps any other Card in `sample`. */
export function overlapsAny(sample: Sample, id: string) {
	const own = sample.cards.find((card) => card.id === id);
	return (
		own !== undefined &&
		sample.cards.some((card) => card.id !== id && overlaps(own, card))
	);
}

/**
 * Where the close's first leg takes Card `lead` of the Deck resting at
 * `rest`: its slot's box, moved toward inline-end until it is `gap` px
 * clear of every other Card.
 */
export function besideOf(
	rest: readonly Shown[],
	lead: number,
	gap: number,
): Shown {
	const slot = rest[lead];
	if (!slot) throw new Error(`No Card ${lead}`);
	const edge = Math.max(
		...rest
			.filter((_, index) => index !== lead)
			.map((card) => card.u + card.w / 2),
	);
	return { ...slot, u: edge + gap + slot.w / 2 };
}

/** Each frame's distance from Card `id` to `to`, as `offBy` reads it. */
export function distancesTo(samples: readonly Sample[], id: string, to: Shown) {
	return trackOf(samples, id).map((card) => offBy(card, to));
}

/** The most `distances` grows from one frame to the next, from `from` to `to` (inclusive). */
export function worstGrowth(
	distances: readonly number[],
	from = 0,
	to = distances.length - 1,
) {
	let worst = 0;
	for (let index = from + 1; index <= to; index++)
		worst = Math.max(
			worst,
			(distances[index] ?? 0) - (distances[index - 1] ?? 0),
		);
	return worst;
}

/** The first frame in which Card `id` is not stacked over every other Card, or -1. */
export function dropFrom(samples: readonly Sample[], id: string) {
	return samples.findIndex(
		(sample) => stackingOf(sample.cards).at(-1) !== id,
	);
}

/** Frames before `until` in which Card `id` is stacked under a Card it overlaps. */
export function underBefore(
	samples: readonly Sample[],
	id: string,
	until: number,
) {
	return samples.slice(0, until).filter((sample) => {
		const own = sample.cards.find((card) => card.id === id);
		return (
			own !== undefined &&
			sample.cards.some(
				(card) =>
					card.id !== id && overlaps(own, card) && card.z >= own.z,
			)
		);
	}).length;
}

/** Frames from `from` on whose stacking, back to front, is not `order`. */
export function offOrderFrom(
	samples: readonly Sample[],
	order: readonly string[],
	from: number,
) {
	return samples
		.slice(Math.max(0, from))
		.filter((sample) => stackingOf(sample.cards).join() !== order.join())
		.length;
}
