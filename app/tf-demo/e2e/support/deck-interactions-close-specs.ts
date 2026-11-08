/// <reference lib="dom" />
import { expect, type Page, test } from "@playwright/test";
import {
	chooseVariant,
	frame,
	inspector,
	landed,
	reduceMotion,
	setKnob,
} from "./deck-interactions";
import {
	besideOf,
	byId,
	cardAt,
	closeButton,
	distancesTo,
	dropFrom,
	knobValue,
	offOrderFrom,
	openCover,
	overlapsAny,
	underBefore,
	worstGrowth,
} from "./deck-interactions-close";
import {
	landing,
	movesFrom,
	offBy,
	record,
	restsAs,
	type Shown,
	shown,
	tailOf,
	tapAt,
	trackOf,
	worstJump,
} from "./deck-interactions-tap";

/**
 * The Deck interactions spec's Cover close, declared into it by
 * `closeSpecs`: a Card closed from the Cover goes back into its place as
 * deck-of-cards' shuffle moves a Card, out beside the Deck, lifted, and in
 * under the Cards in front of it, restacking only where it overlaps none.
 * The front Card goes straight in. Reduced, it dissolves. Judged frame by
 * frame, in B and D, in both writing directions, and interrupted.
 */

const VARIANTS = {
	B: "B · Table",
	D: "D · Swipe actions",
} as const;
type Variant = keyof typeof VARIANTS;

const GAP = "Close clear gap";

/**
 * Opens a variant in a writing direction, reduced or not, the pointer off
 * the Deck. B's hover fan and lift are off: they are a move of their own.
 */
async function open(page: Page, variant: Variant, rtl = false, reduce = false) {
	await chooseVariant(page, VARIANTS[variant]);
	if (rtl)
		await inspector(page)
			.getByRole("button", { name: "RTL", exact: true })
			.click();
	if (reduce) await reduceMotion(page);
	if (variant === "B") {
		await setKnob(page, "Hover fan", 0);
		await setKnob(page, "Hover lift", 0);
	}
	await page.mouse.move(5, 5);
	await landed(page);
}

/** Lands, then checks the Deck rests in `order` exactly, stacked so, every Card solid. */
async function expectRest(page: Page, rest: Shown[], order: string[]) {
	await landed(page);
	const now = restsAs(await shown(page), rest, order);
	expect(now.dom).toEqual(order);
	expect(now.stacking).toEqual(order);
	expect(now.off).toBeLessThanOrEqual(0.01);
	await expect(frame(page).locator("[data-expanded]")).toHaveCount(0);
}

/** Opens Card `lead` into the Cover, closes it with its ×, and judges the close frame by frame. */
async function closeAndJudge(
	page: Page,
	variant: Variant,
	lead: number,
	reduce: boolean,
) {
	const rest = await shown(page);
	const ids = rest.map((own) => own.id);
	const id = ids[lead] ?? "";
	const slot = rest[lead];
	if (!slot) throw new Error(`No Card ${lead}`);
	const front = lead === ids.length - 1;
	const gap = await knobValue(page, GAP);
	await openCover(page, variant, lead);
	const cover = (await shown(page)).find((own) => own.id === id);
	if (!cover) throw new Error("No Cover");
	const done = await record(page, 1000);
	await closeButton(page).click();
	await page.mouse.move(5, 5);
	const frames = await done();
	const track = trackOf(frames, id);
	/* no other Card moves */
	for (const other of ids)
		if (other !== id) expect.soft(movesFrom(frames, other)).toBe(-1);
	const drop = dropFrom(frames, id);
	if (reduce) {
		/* it shows at the Cover or at its slot, never between, and goes
		   from one to the other, restacking, only while hidden */
		for (const at of track)
			expect
				.soft(Math.min(offBy(at, cover), offBy(at, slot)))
				.toBeLessThanOrEqual(0.01);
		const switched = track.findIndex((at) => offBy(at, slot) <= 0.01);
		expect.soft(switched).toBeGreaterThan(0);
		for (const at of [track[switched - 1], track[switched]])
			expect.soft(at?.o ?? 1).toBeLessThanOrEqual(0.25);
		if (!front) expect.soft(drop).toBe(switched);
	} else {
		/* no box ever jumps */
		expect.soft(worstJump(frames, 1)).toBeLessThanOrEqual(0);
		/* it closes in on where each leg takes it, never turning away */
		const toSlot = distancesTo(frames, id, slot);
		if (front) expect.soft(worstGrowth(toSlot)).toBeLessThanOrEqual(0.05);
		else {
			const toBeside = distancesTo(frames, id, besideOf(rest, lead, gap));
			const turn = toBeside.indexOf(Math.min(...toBeside));
			expect.soft(toBeside[turn]).toBeLessThanOrEqual(0.5);
			expect
				.soft(worstGrowth(toBeside, 0, turn))
				.toBeLessThanOrEqual(0.05);
			expect.soft(worstGrowth(toSlot, turn)).toBeLessThanOrEqual(0.05);
		}
		/* above every Card it overlaps until it restacks, and it
		   restacks where it overlaps none */
		expect
			.soft(underBefore(frames, id, drop < 0 ? frames.length : drop))
			.toBe(0);
		if (!front) {
			const at = frames[drop];
			expect.soft(drop).toBeGreaterThan(0);
			expect.soft(at && overlapsAny(at, id)).toBe(false);
		}
	}
	/* from its restack on, the Deck is stacked in its order; at rest exactly */
	if (!front) expect.soft(offOrderFrom(frames, ids, drop)).toBe(0);
	const land = landing(frames);
	expect.soft(land.stacking).toEqual(ids);
	expect.soft(offOrderFrom(frames, ids, land.at)).toBe(0);
	expect.soft(land.drift).toBeLessThanOrEqual(0.01);
	const last = frames.at(-1);
	if (!last) throw new Error("Nothing sampled");
	expect.soft(restsAs(last.cards, rest, ids).off).toBeLessThanOrEqual(0.01);
	expect.soft(last.cards.every((own) => own.o === 1)).toBe(true);
	await expectRest(page, rest, ids);
}

export function closeSpecs() {
	for (const rtl of [false, true])
		for (const reduce of [false, true])
			test(`D in ${rtl ? "RTL" : "LTR"}${reduce ? ", reduced" : ""}: a Card behind the front one closes from the Cover into its place${reduce ? " as a dissolve" : ", out beside the Deck and in under the Cards in front, restacking clear of them all"}; the front Card goes straight in`, async ({
				page,
			}) => {
				await open(page, "D", rtl, reduce);
				await closeAndJudge(page, "D", 2, reduce);
				await closeAndJudge(page, "D", 3, reduce);
			});

	test("B shares the close: a Card behind the front one goes out beside the Deck and in under the Cards in front; the front Card goes straight in", async ({
		page,
	}) => {
		await open(page, "B");
		await closeAndJudge(page, "B", 1, false);
		await closeAndJudge(page, "B", 3, false);
	});

	test("D: a tap on a closing Card takes it on from where it shows, to the front", async ({
		page,
	}) => {
		await open(page, "D");
		const rest = await shown(page);
		const ids = rest.map((own) => own.id);
		const id = ids[2] ?? "";
		await openCover(page, "D", 2);
		const done = await record(page, 1500);
		await closeButton(page).click();
		await page.waitForTimeout(150);
		const box = await byId(page, id).boundingBox();
		if (!box) throw new Error("Missing card geometry");
		await tapAt(page, {
			x: box.x + box.width / 2,
			y: box.y + box.height / 2,
		});
		await page.mouse.move(5, 5);
		const frames = await done();
		expect(worstJump(frames, 1)).toBeLessThanOrEqual(0);
		const order = [...ids.filter((other) => other !== id), id];
		const land = landing(frames);
		expect(land.stacking).toEqual(order);
		expect(land.drift).toBeLessThanOrEqual(0.01);
		await expectRest(page, rest, order);
	});

	test("D: a hand on another Card mid-close takes the closing Card on from where it shows, home", async ({
		page,
	}) => {
		await open(page, "D");
		const rest = await shown(page);
		const ids = rest.map((own) => own.id);
		const id = ids[2] ?? "";
		const gap = await knobValue(page, GAP);
		await openCover(page, "D", 2);
		const done = await record(page, 1500);
		await closeButton(page).click();
		await page.waitForTimeout(150);
		/* the back Card's strip at its inline-start end, which the
		   closing Card has left by then */
		const at = await tailOf(cardAt(page, 0), 0.1);
		await page.mouse.move(at.x, at.y);
		await page.mouse.down();
		await page.mouse.move(at.x - 60, at.y, { steps: 20 });
		await expect(cardAt(page, 0)).toHaveAttribute("data-held", "true");
		await page.waitForTimeout(100);
		await page.mouse.up();
		await page.mouse.move(5, 5);
		const frames = await done();
		/* taken before it was out beside the Deck */
		expect(
			Math.min(...distancesTo(frames, id, besideOf(rest, 2, gap))),
		).toBeGreaterThan(1);
		expect(worstJump(frames, 1)).toBeLessThanOrEqual(0);
		await expectRest(page, rest, ids);
	});

	test("D: a double-tap on a closing Card opens it again from where it shows", async ({
		page,
	}) => {
		await open(page, "D");
		const rest = await shown(page);
		const id = rest.at(-1)?.id ?? "";
		await openCover(page, "D", 3);
		const cover = (await shown(page)).find((own) => own.id === id);
		const done = await record(page, 1500);
		await closeButton(page).click();
		await page.waitForTimeout(120);
		const box = await byId(page, id).boundingBox();
		if (!box) throw new Error("Missing card geometry");
		const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
		await tapAt(page, at);
		await page.waitForTimeout(60);
		await tapAt(page, at);
		await page.mouse.move(5, 5);
		await expect(frame(page).locator("[data-expanded]")).toHaveAttribute(
			"data-card-id",
			id,
		);
		const frames = await done();
		expect(worstJump(frames, 1)).toBeLessThanOrEqual(0);
		const last = trackOf(frames, id).at(-1);
		expect(last && cover ? offBy(last, cover) : 1).toBeLessThanOrEqual(
			0.01,
		);
	});

	test("D: Escape while a Card opens closes it from where it shows", async ({
		page,
	}) => {
		await open(page, "D");
		const rest = await shown(page);
		const ids = rest.map((own) => own.id);
		const at = await tailOf(cardAt(page, 3));
		await tapAt(page, at);
		await page.waitForTimeout(60);
		const done = await record(page, 1200);
		await tapAt(page, at);
		await expect(frame(page).locator("[data-expanded]")).toHaveCount(1);
		await page.mouse.move(5, 5);
		await page.waitForTimeout(100);
		await page.keyboard.press("Escape");
		const frames = await done();
		expect(worstJump(frames, 1)).toBeLessThanOrEqual(0);
		const land = landing(frames);
		expect(land.stacking).toEqual(ids);
		expect(land.drift).toBeLessThanOrEqual(0.01);
		await expectRest(page, rest, ids);
	});
}
