/// <reference lib="dom" />
import { expect, type Locator, test } from "@playwright/test";
import { SPLITS_PARKED } from "../src/workspace/compass/splits";
import {
	armFrames,
	arrival,
	cardState,
	headingTravel,
	openSheet,
	selectedScale,
	startDrag,
	startHeadingDrag,
} from "./support/deck";

/**
 * The deck's motion on the real renderer: the workbench's specimens and
 * variants, reduced motion, and how a Card goes home. Gestures read as
 * swipes, throws and lifts are in `deck-gestures.pw.ts`.
 */

test.use({ viewport: { width: 1600, height: 1100 } });

for (const surface of ["deck-models", "animation-workbench/swap"]) {
	test(`${surface}: selection, release and pointer cancellation use the real deck`, async ({
		page,
	}) => {
		await page.goto(`/playground/${surface}`);
		const frame = page.locator("[data-deck-frame]");
		if (surface === "deck-models") {
			await frame.locator('[data-word="noch"]').click();
		}
		const cards = frame.locator('[data-form="card"]');
		await expect(cards).toHaveCount(4);
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
		if (surface === "deck-models")
			await expect(first).toHaveAttribute("data-arm", "sweep");
		else await expect(first).not.toHaveAttribute("data-arm");
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
		await expect(cards).toHaveCount(surface === "deck-models" ? 0 : 4);
	});
}

test("workbench baseline has the live deck's content and selected-card state", async ({
	page,
}) => {
	await page.goto("/playground/deck-models");
	await page.locator('[data-word="noch"]').click();
	const live = await cardState(page.locator("[data-deck-frame]"));
	await page.goto("/playground/animation-workbench/swap");
	await expect
		.poll(() => cardState(page.locator('[data-specimen="baseline"]')))
		.toEqual(live);
});

test("injected parameters change the candidate renderer while baseline and Escape stay isolated", async ({
	page,
}) => {
	await page.goto("/playground/animation-workbench/swap");
	await page
		.getByRole("button", { name: "Show controls", exact: true })
		.click();
	await page
		.getByRole("button", { name: "Create variant", exact: true })
		.click();
	const baseline = page.locator('[data-specimen="baseline"]');
	const candidate = page.locator('[data-specimen="candidate"]');
	const scale = (specimen: Locator) =>
		specimen
			.locator('[data-place="open"]')
			.evaluate(
				(card) =>
					card.getBoundingClientRect().width /
					(card as HTMLElement).offsetWidth,
			);
	await expect.poll(() => scale(baseline)).toBeCloseTo(1.05, 2);
	await page
		.getByRole("spinbutton", { name: "Selected scale", exact: true })
		.fill("1.15");
	await expect.poll(() => scale(candidate)).toBeCloseTo(1.15, 2);
	await expect.poll(() => scale(baseline)).toBeCloseTo(1.05, 2);
	await page
		.getByRole("button", { name: "Hide controls", exact: true })
		.click();
	await candidate
		.locator('[data-form="card"]')
		.first()
		.locator("[data-heading]")
		.click();
	await page.keyboard.press("Escape");
	await expect(candidate.locator('[data-form="card"]')).toHaveCount(4);
	await expect(baseline.locator('[data-form="card"]')).toHaveCount(4);
});

test("sheet morph permits collapse but isolates the bar lift", async ({
	page,
}) => {
	await page.goto("/playground/animation-workbench/sheet-morph");
	const frame = page.locator("[data-deck-frame]");
	await openSheet(page, frame);
	const sheet = frame.locator('[data-form="sheet"]');
	const pane = await sheet.getAttribute("data-pane");
	/* the Note's own Heading is never a Sheet's handle */
	await startDrag(page, sheet, -110, 0);
	await expect(frame.locator("[data-held]")).toHaveCount(0);
	await page.mouse.up();
	/* and the bar is, but only when the scenario allows a lift */
	await startHeadingDrag(page, sheet, -110, 0);
	await expect(frame.locator("[data-held]")).toHaveCount(0);
	await page.mouse.up();
	await expect(sheet).toHaveCount(1);
	await expect(sheet).toHaveAttribute("data-pane", pane ?? "");
	/* the Cover hides the Deck it was lifted from; ← reveals it again */
	await expect(frame.locator('[data-form="card"]')).toHaveCount(0);
	await frame.getByRole("button", { name: "Collapse back to card" }).click();
	await expect(sheet).toHaveCount(0);
	await expect(frame.locator('[data-form="card"]')).toHaveCount(4);
});

test("a free drag shows the real edge target and splits a pane on release", async ({
	page,
}) => {
	test.skip(SPLITS_PARKED, "Splits are parked (tf-demo ADR 0013)");
	await page.goto("/playground/animation-workbench/drop-zones");
	const frame = page.locator("[data-deck-frame]");
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

test("a heading movement variant animates the actual heading while the baseline remains instant", async ({
	page,
}) => {
	await page.goto("/playground/animation-workbench/swap");
	await page
		.getByRole("button", { name: "Show controls", exact: true })
		.click();
	await page
		.getByRole("button", { name: "Create variant", exact: true })
		.click();
	await page
		.getByRole("spinbutton", { name: "Heading movement", exact: true })
		.fill("600");
	await page
		.getByRole("button", { name: "Hide controls", exact: true })
		.click();
	for (const kind of ["candidate", "baseline"]) {
		const specimen = page.locator(`[data-specimen="${kind}"]`);
		const previousId = await specimen
			.locator('[data-place="open"]')
			.getAttribute("data-card-id");
		/* armed before the click, so a slow click cannot eat the movement */
		const frames = await armFrames(
			specimen.locator(`[data-card-id="${previousId}"]`),
			700,
		);
		await specimen
			.locator('[data-form="card"]')
			.first()
			.locator("[data-heading]")
			.click();
		await expect(
			specimen.locator('[data-form="card"]').first(),
		).toHaveAttribute("data-place", "open");
		const travel = headingTravel(await frames());
		if (kind === "candidate") expect(travel).toBeGreaterThan(20);
		else expect(travel).toBeLessThan(1);
	}
});

test("a named variant survives reload and restores its effect on the real renderer", async ({
	page,
}) => {
	await page.goto("/playground/animation-workbench/swap");
	await page
		.getByRole("button", { name: "Show controls", exact: true })
		.click();
	await page
		.getByRole("button", { name: "Create variant", exact: true })
		.click();
	await page
		.getByRole("textbox", { name: "Variant name" })
		.fill("Larger selection");
	await page
		.getByRole("spinbutton", { name: "Selected scale", exact: true })
		.fill("1.18");
	await expect
		.poll(() => selectedScale(page.locator('[data-specimen="candidate"]')))
		.toBeCloseTo(1.18, 2);
	await page.reload();
	await page
		.getByRole("button", { name: "Show controls", exact: true })
		.click();
	await page
		.getByRole("combobox", { name: "Version" })
		.selectOption({ label: "Larger selection" });
	await expect(
		page.getByRole("spinbutton", { name: "Selected scale", exact: true }),
	).toHaveValue("1.18");
	await expect
		.poll(() => selectedScale(page.locator('[data-specimen="candidate"]')))
		.toBeCloseTo(1.18, 2);
	await expect
		.poll(() => selectedScale(page.locator('[data-specimen="baseline"]')))
		.toBeCloseTo(1.05, 2);
});

test("system reduced motion suppresses drag tilt in both specimens", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("/playground/animation-workbench/sweep");
	await page
		.getByRole("button", { name: "Show controls", exact: true })
		.click();
	await page
		.getByRole("button", { name: "Create variant", exact: true })
		.click();
	await page
		.getByRole("button", { name: "Hide controls", exact: true })
		.click();
	for (const kind of ["baseline", "candidate"]) {
		const specimen = page.locator(`[data-specimen="${kind}"]`);
		const card = specimen.locator('[data-place="open"]');
		await startDrag(page, card, -60, 0);
		await expect(card).toHaveAttribute("data-arm", "sweep");
		const rotation = await card.evaluate((element) => {
			const matrix = new DOMMatrixReadOnly(
				getComputedStyle(element).transform,
			);
			return Math.atan2(matrix.b, matrix.a);
		});
		expect(rotation).toBeCloseTo(0, 3);
		await page.keyboard.press("Escape");
		await page.mouse.up();
		await expect(specimen.locator("[data-held]")).toHaveCount(0);
	}
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
	await page.goto("/playground/animation-workbench/snap-back");
	const card = page.locator('[data-deck-frame] [data-place="open"]');
	const box = await card.boundingBox();
	if (!box) throw new Error("Missing card geometry");
	await startDrag(page, card, 180, 60);
	const frames = await armFrames(card, 700);
	await page.mouse.up();
	/* the Card gets its resting z back while it is still far from home,
	   so it travels the last of its way under the Deck */
	const { closedFrom, closedAt } = arrival(await frames(), box);
	expect(closedFrom).toBeGreaterThan(50);
	expect(closedAt).toBeLessThan(60);
});

test("a returning card does not cross its slot, however it was let go", async ({
	page,
}) => {
	await page.goto("/playground/animation-workbench/snap-back");
	const frame = page.locator("[data-deck-frame]");
	const card = frame.locator('[data-place="open"]');
	const home = await card.boundingBox();
	if (!home) throw new Error("Missing card geometry");
	/* let go a long way out: the distance a spring with any bounce left
	   in it rides past the slot before coming back */
	await startDrag(page, card, 260, 130);
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
	await page.goto("/playground/animation-workbench/sheet-lift");
	const frame = page.locator("[data-deck-frame]");
	const sheet = frame.locator('[data-form="sheet"]');
	const id = await sheet.getAttribute("data-card-id");
	const note = frame.locator(`article[data-card-id="${id ?? ""}"]`);
	/* lift it by its bar and let go without going anywhere: the Note is
	   in the hand, and its slot is a whole Sheet's height away */
	await startHeadingDrag(page, sheet, 3, 3);
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
	await page.goto("/playground/animation-workbench/snap-back");
	const frame = page.locator("[data-deck-frame]");
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
	await page.mouse.up();
	await expect(frame.locator("[data-held]")).toHaveCount(0);
	/* and home is home: nothing is left to fall into place once the
	   gesture has torn down */
	await expect
		.poll(async () => (await card.boundingBox())?.y ?? null)
		.toBeCloseTo(atRest.y, 0);
});
