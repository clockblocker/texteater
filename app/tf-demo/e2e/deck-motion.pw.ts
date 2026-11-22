/// <reference lib="dom" />
import { expect, type Page, test } from "@playwright/test";
import { SPLITS_PARKED } from "../src/workspace/compass/splits";
import {
	armFrames,
	arrival,
	headingTravel,
	openSheet,
	startDrag,
	startHeadingDrag,
} from "./support/deck";

/**
 * The deck's motion on the real renderer: a change of selection, the lean,
 * reduced motion, and how a Card goes home. Gestures read as
 * swipes, throws and lifts are in `deck-gestures.pw.ts`.
 */

test.use({ viewport: { width: 1600, height: 1100 } });

/** The deck-models frame with a Deck of four dealt from its Scroll. */
async function openDeck(page: Page) {
	await page.goto("/playground/deck-models");
	const frame = page.locator("[data-deck-frame]");
	await frame.locator('[data-word="noch"]').click();
	await expect(frame.locator('[data-form="card"]')).toHaveCount(4);
	return frame;
}

test("selection, release and pointer cancellation use the real deck", async ({
	page,
}) => {
	const frame = await openDeck(page);
	const cards = frame.locator('[data-form="card"]');
	const first = cards.first();
	const previous = frame.locator('[data-place="open"]');
	const previousLabel = await previous.getAttribute("aria-label");
	if (!previousLabel) throw new Error("Missing selected card label");
	const frames = await armFrames(
		frame.locator(`[aria-label="${previousLabel}"]`),
		300,
	);
	await first.locator("[data-heading]").click();
	await expect(first).toHaveAttribute("data-place", "open");
	// Changing selected cards must not slide the old heading through its body.
	expect(headingTravel(await frames())).toBeLessThan(1);

	await startDrag(page, first, -110, 0);
	await expect(first).toHaveAttribute("data-arm", "sweep");
	await frame.dispatchEvent("pointercancel", {
		pointerId: 1,
		bubbles: true,
	});
	await page.mouse.up();
	await expect(frame.locator("[data-held]")).toHaveCount(0);
	await expect(cards).toHaveCount(4);

	/* a swipe left sweeps the whole Deck: there is no per-Card removal */
	await startDrag(page, first, -110, 0);
	await page.mouse.up();
	await expect(frame.locator("[data-held]")).toHaveCount(0);
	await expect(cards).toHaveCount(0);
});

test("a free drag shows the real edge target and splits a pane on release", async ({
	page,
}) => {
	test.skip(SPLITS_PARKED, "Splits are parked (tf-demo ADR 0013)");
	const frame = await openDeck(page);
	const box = await frame.boundingBox();
	if (!box) throw new Error("Missing deck geometry");
	await startDrag(page, frame.locator('[data-place="open"]'), 30, 0);
	await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2, {
		steps: 10,
	});
	await expect(
		frame.locator('[data-edge="right"][data-active="true"]'),
	).toBeVisible();
	await page.mouse.up();
	/* the dropped Card is the new Pane's Ground: a Floating Pane, closed by X */
	await expect(frame.locator("[data-deck-pane]")).toHaveCount(2);
	await expect(frame.locator('[data-pane-kind="floating"]')).toHaveCount(1);
	await expect(frame.locator('[data-form="ground"]')).toHaveCount(2);
	await expect(frame.locator('[data-form="card"]')).toHaveCount(3);
	await frame.getByRole("button", { name: "Close pane" }).click();
	await expect(frame.locator("[data-deck-pane]")).toHaveCount(1);
	await expect(frame.locator('[data-form="card"]')).toHaveCount(4);
});

/** The angle `element` is turned to, in degrees. */
function turn(element: Element) {
	const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
	return (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;
}

test("a card carried sideways leans the way it goes, either way, and a swiped deck leans with it", async ({
	page,
}) => {
	await page.goto("/playground/deck-models");
	const frame = page.locator("[data-deck-frame]");
	await frame.locator('[data-word="noch"]').click();
	const card = frame.locator('[data-place="open"]');
	/* left: the whole Deck swipes, turned counter-clockwise */
	await startDrag(page, card, -100, 0);
	await expect.poll(() => card.evaluate(turn)).toBeLessThan(-3);
	const others = frame.locator('[data-form="card"]:not([data-place="open"])');
	for (const other of await others.all())
		expect(await other.evaluate(turn)).toBeLessThan(-1);
	await page.keyboard.press("Escape");
	await page.mouse.up();
	await expect(frame.locator("[data-held]")).toHaveCount(0);
	/* right: the Card in hand, turned clockwise */
	await startDrag(page, card, 100, 0);
	await expect.poll(() => card.evaluate(turn)).toBeGreaterThan(3);
	await page.keyboard.press("Escape");
	await page.mouse.up();
	await expect(frame.locator("[data-held]")).toHaveCount(0);
	await expect.poll(() => card.evaluate(turn)).toBeCloseTo(0, 1);
});

test("under reduced motion nothing leans, and every zone still does what it shows", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	const frame = page.locator("[data-deck-frame]");
	const cards = frame.locator('[data-form="card"]');
	const sheets = frame.locator('[data-form="sheet"]');
	for (const [dx, dy] of [
		[-160, 0],
		[160, 0],
		[0, -140],
		[0, 140],
	] as const) {
		await page.goto("/playground/deck-models");
		await frame.locator('[data-word="noch"]').click();
		await expect(cards).toHaveCount(4);
		await startDrag(page, frame.locator('[data-place="open"]'), dx, dy);
		await page.waitForTimeout(150);
		const held = frame.locator("[data-held]:not([data-preview])");
		expect(await held.evaluate(turn)).toBeCloseTo(0, 3);
		await page.mouse.up();
		await expect(frame.locator("[data-held]")).toHaveCount(0);
		/* left or down the Deck is swept; right or up the Card is a Cover */
		await expect(cards).toHaveCount(0);
		await expect(sheets).toHaveCount(dx < 0 || dy > 0 ? 0 : 1);
	}
});

test("the deck closes over a returning card at the release", async ({
	page,
}) => {
	const frame = await openDeck(page);
	const card = frame.locator('[data-place="open"]');
	const box = await card.boundingBox();
	if (!box) throw new Error("Missing card geometry");
	/* short of every zone's line, and held still so the release is no
	   flick: it sends the Card home */
	await startDrag(page, card, 70, 30);
	await page.waitForTimeout(200);
	const frames = await armFrames(card, 700);
	await page.mouse.up();
	/* the Card gets its resting z back while it is still far from home,
	   so it travels the last of its way under the Deck */
	const { closedFrom, closedAt } = arrival(await frames(), box);
	expect(closedFrom).toBeGreaterThan(Math.hypot(70, 30) / 3);
	expect(closedAt).toBeLessThan(60);
});

test("a returning card does not cross its slot, however it was let go", async ({
	page,
}) => {
	const frame = await openDeck(page);
	const card = frame.locator('[data-place="open"]');
	const home = await card.boundingBox();
	if (!home) throw new Error("Missing card geometry");
	/* let go as far out as a release still sends it home, short of every
	   zone's line: a spring with any bounce left in it rides past the
	   slot before coming back. Held still, so the release is no flick. */
	await startDrag(page, card, 70, 30);
	await page.waitForTimeout(200);
	const frames = await armFrames(card, 700);
	await page.mouse.up();
	const taken = (await frames())
		.filter((frame) => frame.t >= 0)
		.map((frame) => ({ dx: frame.x - home.x, dy: frame.y - home.y }));
	/* it arrives and stops. A Card that crosses its slot and comes back
	   reads as a thing that missed, and the Deck is a stack it has to
	   line up with. */
	expect(Math.min(...taken.map((sample) => sample.dx))).toBeGreaterThan(-1);
	expect(Math.min(...taken.map((sample) => sample.dy))).toBeGreaterThan(-1);
	expect(taken.at(-1)?.dx).toBeCloseTo(0, 0);
	expect(taken.at(-1)?.dy).toBeCloseTo(0, 0);
});

test("a lifted sheet goes home in one motion, not two", async ({ page }) => {
	const frame = await openDeck(page);
	await openSheet(page, frame);
	const sheet = frame.locator('[data-form="sheet"]');
	const id = await sheet.getAttribute("data-card-id");
	const note = frame.locator(`article[data-card-id="${id ?? ""}"]`);
	/* lift it by its bar past slop and let go without going anywhere: the Note
	   is in the hand, and its slot is a whole Sheet's height away */
	await startHeadingDrag(page, sheet, 12, 12);
	await expect(note).toHaveAttribute("data-held", "true");
	const frames = await armFrames(note, 900);
	await page.mouse.up();
	const taken = await frames();
	const lastHeld = taken.map((sample) => sample.held).lastIndexOf(true);
	expect(lastHeld).toBeGreaterThanOrEqual(0);
	const after = taken.slice(lastHeld + 1).map((sample) => sample.y);
	expect(after.length).toBeGreaterThan(0);
	/* the travel belongs to the gesture: by the time the drag state tears
	   down there is nothing left to do. The Note used to settle in the
	   hand, wait the timeout out and only then drop to the Deck, which
	   put its whole journey on the far side of this line. */
	expect(Math.max(...after) - Math.min(...after)).toBeLessThan(3);
});

test("a held card is drawn where it rests, whatever its resting scale", async ({
	page,
}) => {
	const frame = await openDeck(page);
	/* the open Card rests at OPEN_SCALE, so it is the one a change of
	   transform-origin between rest and hand would move */
	const card = frame.locator('[data-place="open"]');
	const atRest = await card.boundingBox();
	if (!atRest) throw new Error("Missing card geometry");
	await startDrag(page, card, 160, 40);
	/* the box it is drawn at, its lean aside: the lean turns it about its
	   origin, which is no change of place */
	const inHand = await card.evaluate((element) => {
		const style = (element as HTMLElement).style;
		const transform = style.transform;
		style.transform = transform.replace(/rotate\([^)]*\)/, "");
		const box = element.getBoundingClientRect();
		style.transform = transform;
		return box;
	});
	/* the Card follows the pointer and does nothing else: a drag offset,
	   not a drag offset plus whatever a change of origin is worth */
	expect(inHand.x - atRest.x).toBeCloseTo(160, 0);
	expect(inHand.y - atRest.y).toBeCloseTo(40, 0);
	/* it is in the expand zone there, so Escape is what sends it home */
	await page.keyboard.press("Escape");
	await page.mouse.up();
	await expect(frame.locator("[data-held]")).toHaveCount(0);
	/* and home is home: nothing is left to fall into place once the
	   gesture has torn down */
	await expect
		.poll(async () => (await card.boundingBox())?.y ?? null)
		.toBeCloseTo(atRest.y, 0);
});

test("under reduced motion, card/cover transitions skip intermediate drag hops and snap cleanly", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	const frame = await openDeck(page);
	const openCard = frame.locator('[data-place="open"]');
	const cardAtRest = await openCard.boundingBox();
	if (!cardAtRest) throw new Error("Missing card geometry");

	/* Dragging a Card up under reduced motion keeps it anchored in its Deck
	   slot with no ghost-cover hop, then snaps straight to the Cover on release. */
	await startDrag(page, openCard, 0, -120);
	await expect(openCard).toHaveAttribute("data-held", "true");
	await expect(openCard).toHaveAttribute("data-fate", "open");
	await expect(frame.locator("[data-preview]")).toHaveCount(0);
	const draggedBox = await openCard.boundingBox();
	if (!draggedBox) throw new Error("Missing dragged card geometry");
	expect(Math.abs(draggedBox.y - cardAtRest.y)).toBeLessThan(1);
	await page.mouse.up();
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(1);

	/* Collapsing via ← snaps width, height, and --note-morph back to the Card. */
	await frame.getByRole("button", { name: "Collapse back to card" }).click();
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(0);
	await expect(openCard).toBeVisible();
	const afterBack = await openCard.evaluate((element) => {
		const rect = element.getBoundingClientRect();
		const surface = element.firstElementChild as HTMLElement | null;
		const morph = surface
			? getComputedStyle(surface).getPropertyValue("--note-morph").trim()
			: "";
		return {
			width: Math.round(rect.width),
			height: Math.round(rect.height),
			morph: Number.parseFloat(morph),
		};
	});
	expect(afterBack.width).toBeCloseTo(cardAtRest.width, -1);
	expect(afterBack.height).toBeCloseTo(cardAtRest.height, -1);
	expect(afterBack.morph).toBe(0);

	/* Dragging a Cover heading past slop in a single-pane reduced-motion layout
	   collapses straight back to the Deck without hopping through a floating hand card. */
	await openSheet(page, frame);
	const sheet = frame.locator('[data-form="sheet"]');
	await startHeadingDrag(page, sheet, 20, 20);
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(0);
	await expect(frame.locator("[data-held]")).toHaveCount(0);
	await expect(frame.locator('[data-form="card"]')).toHaveCount(4);
	await page.mouse.up();
	await expect(frame.locator('[data-form="card"]')).toHaveCount(4);
});

test("cover heading tap keeps cover open, drag shrinks monotonically, and Escape collapses it", async ({
	page,
}) => {
	const frame = await openDeck(page);
	await openSheet(page, frame);
	const sheet = frame.locator('[data-form="sheet"]');
	const heading = sheet.locator("[data-heading]");
	const box = await heading.boundingBox();
	if (!box) throw new Error("Missing cover heading geometry");

	/* A plain click (within slop) on the Cover heading must not tear it off. */
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.mouse.move(
		box.x + box.width / 2 + 3,
		box.y + box.height / 2 + 2,
	);
	await page.mouse.up();
	await expect(sheet).toHaveCount(1);

	/* Dragging past slop lifts the Cover without squashing it down to the
	   88px heading bar height before growing back into a Card. */
	const id = await sheet.getAttribute("data-card-id");
	const note = frame.locator(`article[data-card-id="${id ?? ""}"]`);
	const frames = await armFrames(note, 450);
	await startHeadingDrag(page, sheet, 24, 24);
	await expect(note).toHaveAttribute("data-held", "true");
	const taken = await frames();
	const minHeight = Math.min(...taken.map((sample) => sample.height));
	expect(minHeight).toBeGreaterThan(220);
	await page.mouse.up();
	await expect(frame.locator("[data-held]")).toHaveCount(0);

	/* Escape collapses an open Cover back to its Card. */
	await openSheet(page, frame);
	await expect(sheet).toHaveCount(1);
	await page.keyboard.press("Escape");
	await expect(sheet).toHaveCount(0);
	await expect(frame.locator('[data-form="card"]')).toHaveCount(4);
});

test("an open card paints one unified surface and single hairline border", async ({
	page,
}) => {
	await page.goto("/playground/deck-models");
	const frame = page.locator("[data-deck-frame]");
	await frame.locator('[data-word="Dämmerung"]').first().click();
	const card = frame.locator('[data-place="open"]');
	await expect(card.locator("[data-note-presentation]")).toBeVisible();
	const visual = await card.evaluate((element) => {
		const boxStyle = getComputedStyle(element);
		const noteSurface = element.querySelector<HTMLElement>(
			"[data-note-presentation]",
		);
		if (!noteSurface) throw new Error("Missing NoteSurface element");
		const surfaceStyle = getComputedStyle(noteSurface);
		return {
			boxBg: boxStyle.backgroundColor,
			surfaceBg: surfaceStyle.backgroundColor,
			borderTopWidth: boxStyle.borderTopWidth,
			borderTopColor: boxStyle.borderTopColor,
			shadow: boxStyle.boxShadow,
		};
	});
	/* Body background matches the elevated Card surface (no darker inner seam). */
	expect(visual.surfaceBg).toBe(visual.boxBg);
	/* Single real 1px border (non-transparent), no stacked outer 0 0 0 1px ring. */
	expect(visual.borderTopWidth).toBe("1px");
	expect(visual.borderTopColor).not.toBe("rgba(0, 0, 0, 0)");
	expect(visual.shadow).not.toContain("0px 0px 0px 1px");
});
