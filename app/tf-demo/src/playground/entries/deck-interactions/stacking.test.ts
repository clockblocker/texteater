import { describe, expect, test } from "bun:test";
import { deckSlots, Z } from "compass";
import { OPEN_SCALE } from "@/presentation/deck-geometry";
import { pileSlotsAt } from "./layout";
import { BASE_Z, OPEN_RISE, openAtOf, placeOf, restZOf } from "./stacking";

const ids = (count: number) =>
	Array.from({ length: count }, (_, index) => `c${index}`);

describe("the open Card", () => {
	test("is the one `front` names, or the last when it names none", () => {
		const order = ids(4);
		expect(openAtOf(order, "c1")).toBe(1);
		expect(openAtOf(order, null)).toBe(3);
		expect(openAtOf(order, "gone")).toBe(3);
	});
});

describe("the stacking at rest", () => {
	for (const count of [1, 2, 4, 12, 25])
		for (let openAt = 0; openAt < count; openAt++)
			test(`${count} Cards, open at ${openAt}: the open Card is over every other, z falls off by one per slot from it on both sides down to the base, and no Card is under the base`, () => {
				const zs = ids(count).map((_, index) => restZOf(index, openAt));
				const open = zs[openAt] ?? Number.NaN;
				expect(open).toBe(BASE_Z + OPEN_RISE);
				zs.forEach((z, index) => {
					if (index !== openAt) expect(z).toBeLessThan(open);
					expect(z).toBeGreaterThanOrEqual(BASE_Z);
					const distance = Math.abs(index - openAt);
					expect(z).toBe(BASE_Z + Math.max(0, OPEN_RISE - distance));
					/* nearer the open Card is never lower */
					const nearer = index < openAt ? index + 1 : index - 1;
					if (index !== openAt)
						expect(zs[nearer] ?? 0).toBeGreaterThanOrEqual(z);
				});
			});

	test("is tf-demo's: the z and place `deckSlots` gives every Card, for every open Card", () => {
		const order = ids(6);
		/* deckSlots takes Cards in rank, the last drawn first */
		const cards = [...order].reverse().map((id) => ({ id, subject: null }));
		for (const front of [null, ...order]) {
			const openAt = openAtOf(order, front);
			const app = deckSlots(cards, front, OPEN_SCALE);
			expect(app.map((slot) => slot.card.id)).toEqual(order);
			expect(order.map((_, index) => restZOf(index, openAt))).toEqual(
				app.map((slot) => slot.z),
			);
			expect(order.map((_, index) => placeOf(index, openAt))).toEqual(
				app.map((slot) => slot.place),
			);
		}
		expect(BASE_Z).toBe(Z.deck);
	});
});

describe("the pile's slots", () => {
	const frame = { w: 1200, h: 900 };
	test("only the open Card has the open scale, and every slot's box and drawn top stay put whichever Card is open", () => {
		const count = 4;
		const dealt = pileSlotsAt(frame, count, count - 1, 16);
		for (let openAt = 0; openAt < count; openAt++) {
			const slots = pileSlotsAt(frame, count, openAt, 16);
			slots.forEach((slot, index) => {
				const was = dealt[index];
				if (!was) throw new Error(`No slot ${index}`);
				expect(slot.s).toBe(index === openAt ? OPEN_SCALE : 1);
				expect(slot.u).toBe(was.u);
				expect(slot.w).toBe(was.w);
				expect(slot.h).toBe(was.h);
				/* scaled about its centre, its top edge is where the slot has it */
				const top = (s: number, v: number, h: number) =>
					v - ((s - 1) * h) / 2;
				expect(top(slot.s, slot.v, slot.h)).toBeCloseTo(
					top(was.s, was.v, was.h),
					9,
				);
			});
		}
	});

	test("dealt, the last Card is open", () => {
		const slots = pileSlotsAt(frame, 3, 2, 16);
		expect(slots.map((slot) => slot.s)).toEqual([1, 1, OPEN_SCALE]);
	});
});
