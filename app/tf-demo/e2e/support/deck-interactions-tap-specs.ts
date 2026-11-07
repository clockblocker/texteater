/// <reference lib="dom" />
import { expect, type Page, test } from "@playwright/test";
import {
	chooseVariant,
	frame,
	inspector,
	landed,
	pull,
	redeal,
	reduceMotion,
	setKnob,
} from "./deck-interactions";
import {
	choose,
	landing,
	movesFrom,
	pathOf,
	record,
	restacksFrom,
	restsAs,
	type Shown,
	shown,
	stackingOf,
	tailOf,
	tapAt,
	topFrom,
	trackOf,
	worstJump,
} from "./deck-interactions-tap";

/**
 * The Deck interactions spec's taps, declared into it by `tapSpecs`: a tap
 * on a Card behind the front one plays deck-of-cards' shuffle, in B and
 * D, in both writing directions, reduced, interrupted and retargeted.
 */

const VARIANTS = [
	["B", "B · Table"],
	["D", "D · Swipe actions"],
] as const;
type Variant = (typeof VARIANTS)[number][0];

const card = (page: Page, index: number) =>
	frame(page).locator("[data-card-id]").nth(index);
const byId = (page: Page, id: string) =>
	frame(page).locator(`[data-card-id="${id}"]`);

/**
 * Opens a variant in a writing direction, the pointer off the Deck. B's
 * hover fan and lift are off: they are a move of their own, and the path
 * checks judge the shuffle alone.
 */
async function open(page: Page, variant: Variant, rtl = false) {
	const name = VARIANTS.find(([key]) => key === variant)?.[1] ?? "";
	await chooseVariant(page, name);
	if (rtl)
		await inspector(page)
			.getByRole("button", { name: "RTL", exact: true })
			.click();
	if (variant === "B") {
		await setKnob(page, "Hover fan", 0);
		await setKnob(page, "Hover lift", 0);
	}
	await page.mouse.move(5, 5);
	await landed(page);
}

/** The order a tap on `id` makes: `id` to the front. */
function fronted(ids: readonly string[], id: string) {
	return [...ids.filter((other) => other !== id), id];
}

/** Lands, then checks the Deck rests in `order` exactly, stacked so. */
async function expectRest(page: Page, rest: Shown[], order: string[]) {
	await landed(page);
	const now = restsAs(await shown(page), rest, order);
	expect(now.dom).toEqual(order);
	expect(now.stacking).toEqual(order);
	expect(now.off).toBeLessThanOrEqual(0.01);
}

/** Taps Card `lead` and judges the whole shuffle, frame by frame. */
async function tapAndJudge(page: Page, lead: number) {
	const rest = await shown(page);
	const ids = rest.map((own) => own.id);
	const id = ids[lead] ?? "";
	const order = fronted(ids, id);
	const done = await record(page, 900);
	await tapAt(page, await tailOf(card(page, lead)));
	await page.mouse.move(5, 5);
	const frames = await done();
	/* out sideways, half a Card toward inline-end, and back, never past */
	const path = pathOf(frames, id);
	const width = rest[lead]?.w ?? 0;
	expect(path.peak).toBeGreaterThan(0.49 * width);
	expect(path.peak).toBeLessThan(0.51 * width);
	expect(path.outThenIn).toBe(true);
	expect(path.least).toBeGreaterThanOrEqual(-0.01);
	expect(Math.abs(path.out.at(-1) ?? 1)).toBeLessThanOrEqual(0.01);
	/* restacked on top in the frame its second leg starts: until then it
	   only went sideways, and it starts down in that frame or the next */
	const top = topFrom(frames, id);
	expect(top).toBeGreaterThan(0);
	expect(path.dropsFrom - top).toBeGreaterThanOrEqual(0);
	expect(path.dropsFrom - top).toBeLessThanOrEqual(1);
	expect(path.out[top] ?? 0).toBeGreaterThan(0.99 * path.peak);
	/* the Cards in front of it restack no later than they move; the
	   ones behind it never move */
	for (const other of ids.slice(lead + 1)) {
		const moves = movesFrom(frames, other);
		expect(moves).toBeGreaterThan(0);
		expect(moves).toBeGreaterThanOrEqual(restacksFrom(frames, other));
	}
	for (const other of ids.slice(0, lead))
		expect(movesFrom(frames, other)).toBe(-1);
	expect(worstJump(frames, 1)).toBeLessThanOrEqual(0);
	/* it lands at rest exactly, stacked in the new order from that frame */
	const land = landing(frames);
	expect(land.stacking).toEqual(order);
	expect(land.drift).toBeLessThanOrEqual(0.01);
	const last = frames.at(-1);
	if (!last) throw new Error("Nothing sampled");
	expect(restsAs(last.cards, rest, order).off).toBeLessThanOrEqual(0.01);
	await expectRest(page, rest, order);
}

export function tapSpecs() {
	for (const [variant] of VARIANTS)
		for (const rtl of [false, true])
			test(`${variant} in ${rtl ? "RTL" : "LTR"}: a tap on a Card behind the front one shuffles it to the front: out sideways, on top as it comes back, into the front slot, no Card jumping, at rest stacked in the new order`, async ({
				page,
			}) => {
				await open(page, variant, rtl);
				await tapAndJudge(page, 0);
				await redeal(page);
				await page.mouse.move(5, 5);
				await landed(page);
				await tapAndJudge(page, 2);
			});

	for (const [variant] of VARIANTS) {
		test(`${variant}: under reduced motion a tap dissolves the Cards into their new places, none travelling`, async ({
			page,
		}) => {
			await open(page, variant);
			await reduceMotion(page);
			const rest = await shown(page);
			const ids = rest.map((own) => own.id);
			const id = ids[0] ?? "";
			const order = fronted(ids, id);
			const done = await record(page, 600);
			await tapAt(page, await tailOf(card(page, 0)));
			await page.mouse.move(5, 5);
			const frames = await done();
			/* every Card shows at its old place or its new one, nowhere between */
			for (const own of ids) {
				const from = rest[ids.indexOf(own)];
				const to = rest[order.indexOf(own)];
				for (const at of trackOf(frames, own)) {
					const off = (slot: Shown | undefined) =>
						slot ? Math.hypot(at.u - slot.u, at.v - slot.v) : 1;
					expect(Math.min(off(from), off(to))).toBeLessThanOrEqual(
						0.01,
					);
				}
			}
			/* the tapped Card restacks while hidden */
			const tapped = trackOf(frames, id);
			const top = topFrom(frames, id);
			expect(tapped[top]?.o ?? 1).toBeLessThanOrEqual(0.25);
			expect(Math.min(...tapped.map((at) => at.o))).toBeLessThan(0.2);
			const last = frames.at(-1);
			expect(last?.cards.every((own) => own.o === 1)).toBe(true);
			await expectRest(page, rest, order);
		});

		test(`${variant}: a double-tap on a Card behind the front one still opens it`, async ({
			page,
		}) => {
			await open(page, variant);
			const id = (await card(page, 0).getAttribute("data-card-id")) ?? "";
			const at = await tailOf(card(page, 0));
			await tapAt(page, at);
			await page.waitForTimeout(80);
			await tapAt(page, at);
			await expect(
				frame(page).locator("[data-expanded]"),
			).toHaveAttribute("data-card-id", id);
		});

		test(`${variant}: a tap on the front Card moves and restacks nothing`, async ({
			page,
		}) => {
			await open(page, variant);
			const rest = await shown(page);
			const ids = rest.map((own) => own.id);
			const done = await record(page, 500);
			await tapAt(page, await tailOf(card(page, 3)));
			await page.mouse.move(5, 5);
			const frames = await done();
			for (const own of ids) {
				const from = rest[ids.indexOf(own)];
				for (const at of trackOf(frames, own)) {
					expect(
						Math.hypot(
							at.u - (from?.u ?? 0),
							at.v - (from?.v ?? 0),
						),
					).toBeLessThanOrEqual(0.01);
					expect(at.z).toBe(from?.z);
				}
			}
			await expectRest(page, rest, ids);
		});

		test(`${variant}: a second tap mid-shuffle takes the Cards on from where they show`, async ({
			page,
		}) => {
			await open(page, variant);
			const rest = await shown(page);
			const ids = rest.map((own) => own.id);
			const first = fronted(ids, ids[0] ?? "");
			const order = fronted(first, first[0] ?? "");
			const done = await record(page, 1200);
			await tapAt(page, await tailOf(card(page, 0)));
			await page.waitForTimeout(100);
			await tapAt(page, await tailOf(byId(page, first[0] ?? "")));
			await page.mouse.move(5, 5);
			const frames = await done();
			expect(worstJump(frames, 1)).toBeLessThanOrEqual(0);
			const land = landing(frames);
			expect(land.stacking).toEqual(order);
			expect(land.drift).toBeLessThanOrEqual(0.01);
			await expectRest(page, rest, order);
		});

		test(`${variant}: a Card taken by the hand mid-shuffle goes on from where it shows`, async ({
			page,
		}) => {
			await open(page, variant);
			const rest = await shown(page);
			const ids = rest.map((own) => own.id);
			const id = ids[0] ?? "";
			const order = fronted(ids, id);
			const done = await record(page, 1600);
			await tapAt(page, await tailOf(card(page, 0)));
			/* in its second leg: on top, coming into the front slot */
			await page.waitForTimeout(260);
			if (variant === "B") {
				const at = await tailOf(byId(page, id));
				await page.mouse.move(at.x, at.y);
				await page.mouse.down();
				await page.mouse.move(at.x + 80, at.y + 50, { steps: 10 });
				await page.waitForTimeout(200);
			} else await pull(page, byId(page, id), -60, 0);
			await page.mouse.up();
			const frames = await done();
			expect(worstJump(frames, 1)).toBeLessThanOrEqual(0);
			await expectRest(page, rest, order);
		});
	}

	test("off restacks at once and lets the reflow take the Card to the front, never sideways", async ({
		page,
	}) => {
		await open(page, "D");
		await choose(page, "Tap shuffle pull-out", "off");
		const rest = await shown(page);
		const ids = rest.map((own) => own.id);
		const id = ids[0] ?? "";
		const done = await record(page, 900);
		await tapAt(page, await tailOf(card(page, 0)));
		const frames = await done();
		const start = trackOf(frames, id)[0];
		for (const at of trackOf(frames, id))
			expect(Math.abs(at.u - (start?.u ?? 0))).toBeLessThanOrEqual(0.5);
		const last = frames.at(-1);
		expect(stackingOf(last?.cards ?? [])).toEqual(fronted(ids, id));
		await expectRest(page, rest, fronted(ids, id));
	});
}
