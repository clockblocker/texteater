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
			await expect(first).toHaveAttribute("data-arm", "remove");
		else await expect(first).not.toHaveAttribute("data-arm");
		await frame.dispatchEvent("pointercancel", {
			pointerId: 1,
			bubbles: true,
		});
		await page.mouse.up();
		await expect(frame.locator("[data-held]")).toHaveCount(0);
		await expect(cards).toHaveCount(4);

		await startDrag(page, first, -110, 0);
		await page.mouse.up();
		await expect(frame.locator("[data-held]")).toHaveCount(0);
		await expect(cards).toHaveCount(surface === "deck-models" ? 3 : 4);
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

test("sheet morph permits collapse but isolates heading lift", async ({
	page,
}) => {
	await page.goto("/playground/animation-workbench/sheet-morph");
	const frame = page.locator("[data-deck-frame]");
	await openSheet(page, frame);
	const sheet = frame.locator('[data-form="sheet"]');
	const pane = await sheet.getAttribute("data-pane");
	await startDrag(page, sheet, -110, 0);
	await expect(frame.locator("[data-held]")).toHaveCount(0);
	await page.mouse.up();
	await expect(sheet).toHaveCount(1);
	await expect(sheet).toHaveAttribute("data-pane", pane ?? "");
	await expect(frame.locator('[data-form="card"]')).toHaveCount(3);
	await frame.getByRole("button", { name: "Collapse back to card" }).click();
	await expect(sheet).toHaveCount(0);
	await expect(frame.locator('[data-form="card"]')).toHaveCount(4);
});

test("a real margin hold lifts the sheet and pointer cancellation restores it", async ({
	page,
}) => {
	await page.goto("/playground/animation-workbench/sheet-lift");
	const frame = page.locator("[data-deck-frame]");
	const margin = frame.locator('[data-sheet-margin="left"]');
	const box = await margin.boundingBox();
	if (!box) throw new Error("Missing sheet margin geometry");
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await expect(frame.locator('[data-holding="true"]')).toHaveCount(1);
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(0);
	await expect(frame.locator('[data-form="card"]')).toHaveCount(4);
	await frame.dispatchEvent("pointercancel", { pointerId: 1, bubbles: true });
	await page.mouse.up();
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(1);
	await expect(frame.locator('[data-form="card"]')).toHaveCount(3);
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
	await expect(frame.locator("[data-deck-pane]")).toHaveCount(2);
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(1);
	await frame.getByRole("button", { name: "Collapse back to card" }).click();
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
	await page.goto("/playground/animation-workbench/remove");
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
		await expect(card).toHaveAttribute("data-arm", "remove");
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
test("remove scenario uses the real removal but cannot expand", async ({
	page,
}) => {
	await page.goto("/playground/animation-workbench/remove");
	const frame = page.locator("[data-deck-frame]");
	await startDrag(page, frame.locator('[data-place="open"]'), 0, -140);
	await page.mouse.up();
	await expect(frame.locator("[data-held]")).toHaveCount(0);
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(0);
	await startDrag(page, frame.locator('[data-place="open"]'), -140, 0);
	await expect(frame.locator('[data-arm="remove"]')).toHaveCount(1);
	await page.mouse.up();
	await expect(frame.locator('[data-form="card"]')).toHaveCount(3);
});
