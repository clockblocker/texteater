/// <reference lib="dom" />
import { expect, type Locator, type Page, test } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 1100 } });

async function startDrag(page: Page, card: Locator, dx: number, dy: number) {
	const heading = await card.locator("[data-heading]").boundingBox();
	if (!heading) throw new Error("Missing heading geometry");
	const x = heading.x + heading.width / 2;
	const y = heading.y + heading.height / 2;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x + dx, y + dy, { steps: 5 });
}

/** A Cover is handled by its Heading: drag from its free middle, clear of its ← button. */
async function startHeadingDrag(
	page: Page,
	sheet: Locator,
	dx: number,
	dy: number,
) {
	const bar = await sheet.locator("[data-heading]").boundingBox();
	if (!bar) throw new Error("Missing cover heading geometry");
	const x = bar.x + bar.width * 0.6;
	const y = bar.y + bar.height / 2;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x + dx, y + dy, { steps: 5 });
}

async function openSheet(page: Page, frame: Locator) {
	await startDrag(page, frame.locator('[data-place="open"]'), 0, -120);
	await page.mouse.up();
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(1);
}

async function cardState(frame: Locator) {
	return frame.locator('[data-form="card"]').evaluateAll((cards) =>
		cards.map((card) => ({
			label: card.getAttribute("aria-label"),
			place: card.getAttribute("data-place"),
			text: card.textContent,
		})),
	);
}

async function headingSamples(card: Locator) {
	return card.evaluate(async (element) => {
		const heading = element.querySelector("[data-heading]");
		if (!heading) throw new Error("Missing heading");
		const samples: number[] = [];
		for (let index = 0; index < 12; index++) {
			await new Promise<void>((resolve) =>
				requestAnimationFrame(() => resolve()),
			);
			const cardBox = element.getBoundingClientRect();
			const scale =
				cardBox.height / (element as HTMLElement).offsetHeight;
			samples.push(
				(heading.getBoundingClientRect().top - cardBox.top) / scale,
			);
		}
		return samples;
	});
}

/**
 * Every frame of a Card's return: how far it still is from the slot it
 * left, and whether the Deck has closed over it yet. Start it before the
 * release and await it after.
 */
async function returnSamples(card: Locator, home: { x: number; y: number }) {
	return card.evaluate(async (element, at) => {
		const samples: { t: number; d: number; z: number }[] = [];
		const start = performance.now();
		while (performance.now() - start < 700) {
			await new Promise<void>((resolve) =>
				requestAnimationFrame(() => resolve()),
			);
			const box = element.getBoundingClientRect();
			samples.push({
				t: performance.now() - start,
				d: Math.hypot(box.x - at.x, box.y - at.y),
				z: Number(getComputedStyle(element).zIndex),
			});
		}
		return samples;
	}, home);
}

/** When the Card arrived, and when — and where — the Deck closed over it. */
function arrival(samples: { t: number; d: number; z: number }[]) {
	const home = samples.find((sample) => sample.d <= 8);
	const closed = samples.find((sample) => sample.z < 40);
	return {
		homeAt: home?.t ?? null,
		closedAt: closed?.t ?? null,
		closedFrom: closed?.d ?? null,
	};
}

async function selectedScale(specimen: Locator) {
	return specimen
		.locator('[data-place="open"]')
		.evaluate(
			(card) =>
				card.getBoundingClientRect().width /
				(card as HTMLElement).offsetWidth,
		);
}

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
		await first.locator("[data-heading]").click();
		await expect(first).toHaveAttribute("data-place", "open");
		const headingOffsets = await headingSamples(
			frame.locator(`[aria-label="${previousLabel}"]`),
		);
		// Changing selected cards must not slide the old heading through its body.
		expect(
			Math.max(...headingOffsets) - Math.min(...headingOffsets),
		).toBeLessThan(1);

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
		await specimen
			.locator('[data-form="card"]')
			.first()
			.locator("[data-heading]")
			.click();
		await expect(
			specimen.locator('[data-form="card"]').first(),
		).toHaveAttribute("data-place", "open");
		const samples = await headingSamples(
			specimen.locator(`[data-card-id="${previousId}"]`),
		);
		const travel = Math.max(...samples) - Math.min(...samples);
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

test("the deck closes over a returning card at the release", async ({
	page,
}) => {
	await page.goto("/playground/animation-workbench/snap-back");
	const card = page.locator('[data-deck-frame] [data-place="open"]');
	const box = await card.boundingBox();
	if (!box) throw new Error("Missing card geometry");
	await startDrag(page, card, 180, 60);
	const samples = returnSamples(card, box);
	await page.mouse.up();
	/* the Card gets its resting z back while it is still far from home,
	   so it travels the last of its way under the Deck */
	const { closedFrom, closedAt } = arrival(await samples);
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
	const samples = card.evaluate(async (element, at) => {
		const taken: { dx: number; dy: number }[] = [];
		const start = performance.now();
		while (performance.now() - start < 700) {
			await new Promise<void>((resolve) =>
				requestAnimationFrame(() => resolve()),
			);
			const box = element.getBoundingClientRect();
			taken.push({ dx: box.x - at.x, dy: box.y - at.y });
		}
		return taken;
	}, home);
	await page.mouse.up();
	const taken = await samples;
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
	const samples = note.evaluate(async (element) => {
		const taken: { y: number; held: boolean }[] = [];
		const start = performance.now();
		while (performance.now() - start < 900) {
			await new Promise<void>((resolve) =>
				requestAnimationFrame(() => resolve()),
			);
			taken.push({
				y: element.getBoundingClientRect().y,
				held: element.dataset.held === "true",
			});
		}
		return taken;
	});
	await page.mouse.up();
	const taken = await samples;
	const lastHeld = taken.map((sample) => sample.held).lastIndexOf(true);
	expect(lastHeld).toBeGreaterThan(0);
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
	const inHand = await card.boundingBox();
	if (!inHand) throw new Error("Missing held geometry");
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

for (const scenario of ["swap", "snap-back"]) {
	test(`${scenario} excludes removal, expansion, drop targets and dismissal`, async ({
		page,
	}) => {
		await page.goto(`/playground/animation-workbench/${scenario}`);
		const frame = page.locator("[data-deck-frame]");
		const card = frame.locator('[data-place="open"]');
		for (const [dx, dy] of [
			[-140, 0],
			[0, -140],
			[280, 0],
			[0, 180],
		] as const) {
			await startDrag(page, card, dx, dy);
			await expect(frame.locator("[data-arm]")).toHaveCount(0);
			await expect(frame.locator('[data-active="true"]')).toHaveCount(0);
			await page.mouse.up();
			await expect(frame.locator("[data-held]")).toHaveCount(0);
			await expect(frame.locator('[data-form="card"]')).toHaveCount(4);
			await expect(frame.locator('[data-form="sheet"]')).toHaveCount(0);
			await expect(frame.locator("[data-deck-pane]")).toHaveCount(1);
		}
		await page.keyboard.press("Escape");
		await frame.click({ position: { x: 10, y: 10 } });
		await expect(frame.locator('[data-form="card"]')).toHaveCount(4);
		for (const link of await card
			.locator('[data-block="links"] button')
			.all())
			await expect(link).toBeDisabled();
	});
}
test("sweep scenario sweeps the whole deck but cannot expand", async ({
	page,
}) => {
	await page.goto("/playground/animation-workbench/sweep");
	const frame = page.locator("[data-deck-frame]");
	await startDrag(page, frame.locator('[data-place="open"]'), 0, -140);
	await page.mouse.up();
	await expect(frame.locator("[data-held]")).toHaveCount(0);
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(0);
	await startDrag(page, frame.locator('[data-place="open"]'), -140, 0);
	await expect(frame.locator('[data-arm="sweep"]')).toHaveCount(1);
	await page.mouse.up();
	await expect(frame.locator('[data-form="card"]')).toHaveCount(0);
});

test("a swipe moves the whole deck, turns it at the line and springs it back together", async ({
	page,
}) => {
	await page.goto("/playground/deck-models");
	const frame = page.locator("[data-deck-frame]");
	await frame.locator('[data-word="noch"]').click();
	const cards = frame.locator('[data-form="card"]');
	await expect(cards).toHaveCount(4);
	const lefts = () =>
		cards.evaluateAll((elements) =>
			elements.map((element) => element.getBoundingClientRect().x),
		);
	const rest = await lefts();
	const heading = await frame
		.locator('[data-place="open"] [data-heading]')
		.boundingBox();
	if (!heading) throw new Error("Missing heading geometry");
	const x = heading.x + heading.width / 2;
	const y = heading.y + heading.height / 2;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x - 60, y, { steps: 5 });
	/* every Card moves, not only the one in hand, and none is red yet */
	await expect(frame.locator("[data-swiping]")).toHaveCount(4);
	await expect
		.poll(async () =>
			(await lefts()).filter(
				(left, index) => left < (rest[index] ?? 0) - 20,
			),
		)
		.toHaveLength(4);
	await expect(frame.locator('[data-swiping][data-past="true"]')).toHaveCount(
		0,
	);
	/* past the line the whole Deck says so; back inside it, it takes it back */
	await page.mouse.move(x - 160, y, { steps: 5 });
	await expect(frame.locator('[data-swiping][data-past="true"]')).toHaveCount(
		4,
	);
	await page.mouse.move(x - 30, y, { steps: 5 });
	await expect(frame.locator('[data-swiping][data-past="true"]')).toHaveCount(
		0,
	);
	await expect(frame.locator('[data-arm="sweep"]')).toHaveCount(1);
	/* let go short of the line: the Deck is whole again, every Card home */
	await page.mouse.up();
	await expect(frame.locator("[data-swiping]")).toHaveCount(0);
	await expect(cards).toHaveCount(4);
	await expect
		.poll(async () =>
			(await lefts()).every(
				(left, index) => Math.abs(left - (rest[index] ?? 0)) < 1,
			),
		)
		.toBe(true);
});

test("a card taken up shows its Cover at once, and a release does what was shown", async ({
	page,
}) => {
	await page.goto("/playground/deck-models");
	const frame = page.locator("[data-deck-frame]");
	await frame.locator('[data-word="noch"]').click();
	const card = frame.locator('[data-place="open"]');
	const ghost = frame.locator('[data-form="sheet"][data-preview]');
	const heading = await card.locator("[data-heading]").boundingBox();
	if (!heading) throw new Error("Missing heading geometry");
	const x = heading.x + heading.width / 2;
	const y = heading.y + heading.height / 2;
	await page.mouse.move(x, y);
	await page.mouse.down();
	/* slowly up past the line: the ghost Cover, and no label, no wait */
	for (let step = 1; step <= 12; step++) {
		await page.mouse.move(x, y - step * 10);
		await page.waitForTimeout(20);
	}
	await expect(ghost).toHaveCount(1);
	await expect(frame.locator('[data-held][data-fate="open"]')).toHaveCount(1);
	/* back down onto the Deck: the ghost goes and the Card will rest */
	for (let step = 11; step >= 0; step--) {
		await page.mouse.move(x, y - step * 10);
		await page.waitForTimeout(20);
	}
	await page.waitForTimeout(150);
	await expect(ghost).toHaveCount(0);
	await expect(frame.locator('[data-held][data-fate="rest"]')).toHaveCount(1);
	await page.mouse.up();
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(0);
	await expect(frame.locator('[data-form="card"]')).toHaveCount(4);

	/* a short flick up is read where it was heading: it opens */
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x, y - 40, { steps: 3 });
	await page.mouse.up();
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(1);
});

test("a card pulled off a swipe tears loose: the deck goes home and the card follows the hand", async ({
	page,
}) => {
	await page.goto("/playground/deck-models");
	const frame = page.locator("[data-deck-frame]");
	await frame.locator('[data-word="noch"]').click();
	const cards = frame.locator('[data-form="card"]');
	await expect(cards).toHaveCount(4);
	const lefts = () =>
		cards.evaluateAll((elements) =>
			elements.map((element) => element.getBoundingClientRect().x),
		);
	const rest = await lefts();
	const lead = frame.locator('[data-place="open"]');
	const heading = await lead.locator("[data-heading]").boundingBox();
	if (!heading) throw new Error("Missing heading geometry");
	const x = heading.x + heading.width / 2;
	const y = heading.y + heading.height / 2;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x - 60, y, { steps: 5 });
	await expect(frame.locator("[data-swiping]")).toHaveCount(4);
	/* well off the swipe's axis: the Card is in hand, the Deck is not */
	await page.mouse.move(x - 60, y + 160, { steps: 8 });
	await expect(frame.locator("[data-swiping]")).toHaveCount(0);
	await expect(frame.locator("[data-held]")).toHaveCount(1);
	await expect(frame.locator("[data-arm]")).toHaveCount(0);
	await expect
		.poll(async () =>
			(await lefts()).filter(
				(left, index) => Math.abs(left - (rest[index] ?? 0)) < 1,
			),
		)
		.toHaveLength(3);
	/* the Card closes the rubber band's gap and rides under the hand */
	await expect
		.poll(async () => {
			const box = await lead.locator("[data-heading]").boundingBox();
			return box
				? Math.hypot(
						box.x + box.width / 2 - (x - 60),
						box.y + box.height / 2 - (y + 160),
					)
				: Number.POSITIVE_INFINITY;
		})
		.toBeLessThan(4);
	await page.keyboard.press("Escape");
	await page.mouse.up();
	await expect(frame.locator("[data-held]")).toHaveCount(0);
	await expect(cards).toHaveCount(4);
});

test("a throw is read by its direction: left sweeps, right goes home, up opens; a slow long drag left lets go", async ({
	page,
}) => {
	await page.goto("/playground/deck-models");
	const frame = page.locator("[data-deck-frame]");
	const cards = frame.locator('[data-form="card"]');
	const panes = frame.locator("[data-deck-pane]");
	const gesture = async (path: readonly [number, number, number][]) => {
		await frame.locator('[data-word="noch"]').click();
		await expect(cards).toHaveCount(4);
		const heading = await frame
			.locator('[data-place="open"] [data-heading]')
			.boundingBox();
		if (!heading) throw new Error("Missing heading geometry");
		const x = heading.x + heading.width / 2;
		const y = heading.y + heading.height / 2;
		await page.mouse.move(x, y);
		await page.mouse.down();
		for (const [dx, dy, wait] of path) {
			await page.mouse.move(x + dx, y + dy);
			await page.waitForTimeout(wait);
		}
		await page.mouse.up();
		await expect(frame.locator("[data-held]")).toHaveCount(0);
	};
	const steps = (n: number, dx: number, dy: number, wait: number) =>
		Array.from(
			{ length: n },
			(_, i) =>
				[(i + 1) * dx, (i + 1) * dy, wait] as [number, number, number],
		);

	/* thrown left, it sweeps, though the throw drifts well off its axis */
	await gesture(steps(6, -70, 12, 8));
	await expect(cards).toHaveCount(0);
	await expect(panes).toHaveCount(1);
	/* thrown right, the Card goes back on its Deck, not into a new Pane */
	await gesture(steps(6, 70, 0, 8));
	await expect(cards).toHaveCount(4);
	await expect(panes).toHaveCount(1);
	await page.keyboard.press("Escape");
	await expect(cards).toHaveCount(0);
	/* thrown up, it opens */
	await gesture(steps(4, 0, -30, 8));
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(1);
	await page.goto("/playground/deck-models");
	/* carried slowly far left, the Card lets go of the swipe and is a
	   plain drag: dropped on the left, it is a new Pane */
	await gesture([...steps(50, -12, 0, 30), [-600, 0, 300]]);
	await expect(panes).toHaveCount(2);
	await expect(cards).toHaveCount(3);
});

test("the ground line steps down and back up, and a link pushes a cover that closes", async ({
	page,
}) => {
	await page.goto("/playground/deck-models");
	const frame = page.locator("[data-deck-frame]");
	const pane = frame.locator('[data-deck-pane="root"]');
	await expect(pane).toHaveAttribute("data-pane-kind", "rooted");
	await expect(frame.locator('[data-form="ground"]')).toHaveCount(1);
	/* ← on the Ground: Text › Library › Menu, and back up by tapping */
	await pane.getByRole("button", { name: "Back to Library" }).click();
	await expect(frame.locator('[data-form="ground"]')).toHaveCount(0);
	await pane.getByRole("button", { name: "Back to Menu" }).click();
	await expect(
		pane.getByRole("button", { name: "At the Menu" }),
	).toBeDisabled();
	await pane.locator('[data-ground-item="library"]').click();
	await pane.locator('[data-ground-item="brief"]').click();
	await expect(frame.locator('[data-form="ground"]')).toHaveCount(1);
	await expect(pane.locator("nav")).toContainText("Der Brief");
	/* a word deals a Deck that belongs to the Text; a Cover from a link
	   hides it and closes on ← because it never had a Card */
	await frame.locator('[data-word="Ende"]').click();
	await expect(frame.locator('[data-form="card"]')).toHaveCount(4);
	await startDrag(page, frame.locator('[data-place="open"]'), 0, -120);
	await page.mouse.up();
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(1);
	await frame
		.locator('[data-form="sheet"] [data-block="links"] button')
		.first()
		.click();
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(2);
	/* each Cover's Heading is its bar; only the top one's ← is live */
	await expect(
		frame.locator(
			'[data-form="sheet"] [data-heading] [data-heading-chrome="back"]',
		),
	).toHaveCount(2);
	await frame.getByRole("button", { name: "Close cover" }).click();
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(1);
	await frame.getByRole("button", { name: "Collapse back to card" }).click();
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(0);
	await expect(frame.locator('[data-form="card"]')).toHaveCount(4);
	/* a dismissive click on the Text sweeps its Deck */
	await frame
		.locator('[data-form="ground"]')
		.click({ position: { x: 20, y: 300 } });
	await expect(frame.locator('[data-form="card"]')).toHaveCount(0);
});
