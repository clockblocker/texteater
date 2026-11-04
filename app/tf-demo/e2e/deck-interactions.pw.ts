/// <reference lib="dom" />
import { expect, type Locator, type Page, test } from "@playwright/test";

/**
 * The Deck interactions prototype: every variant behind the inspector's
 * switch, and in B and D a drag that closes the Deck and one that opens
 * the Card. Releases are slow, so none of them reads as a flick.
 */

test.use({ viewport: { width: 1600, height: 1000 } });

const VARIANTS = ["B · Table", "D · Swipe actions"];

const inspector = (page: Page) =>
	page.getByRole("complementary", { name: "Inspector" });
const frame = (page: Page) => page.locator("[data-deck-frame]");
const front = (page: Page) => frame(page).locator("[data-card-id]").last();

async function chooseVariant(page: Page, name: string) {
	await inspector(page).getByRole("button", { name, exact: true }).click();
}

/** Presses `card` near its top, moves to `to` slowly, rests, and lets go. */
async function carry(
	page: Page,
	card: Locator,
	to: (start: { x: number; y: number }) => Promise<{ x: number; y: number }>,
) {
	const box = await card.boundingBox();
	if (!box) throw new Error("Missing card geometry");
	const start = { x: box.x + box.width / 2, y: box.y + 24 };
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(start.x + 10, start.y + 10, { steps: 2 });
	const end = await to(start);
	await page.mouse.move(end.x, end.y, { steps: 25 });
	await page.waitForTimeout(150);
	await page.mouse.up();
}

/** The middle of a B target, once a carried Card has shown it. */
async function targetCentre(page: Page, target: "tray" | "pad") {
	const box = await frame(page)
		.locator(`[data-target="${target}"]`)
		.last()
		.boundingBox();
	if (!box) throw new Error(`Missing ${target} geometry`);
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function redeal(page: Page) {
	await inspector(page).getByRole("button", { name: "Re-deal" }).click();
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
}

test.beforeEach(async ({ page }) => {
	await page.goto("/playground/deck-interactions");
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
});

test("every variant deals the Deck, with nothing but Cards at rest", async ({
	page,
}) => {
	for (const name of VARIANTS) {
		await chooseVariant(page, name);
		await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
		await expect(frame(page)).not.toContainText("Readouts");
	}
});

test("B: the tray closes the Deck, the pad opens the Card", async ({
	page,
}) => {
	await chooseVariant(page, "B · Table");
	await carry(page, front(page), () => targetCentre(page, "tray"));
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(0);
	await expect(
		inspector(page).locator('[data-readout="last release"]'),
	).toHaveText("dismiss · tray");
	await redeal(page);
	await carry(page, front(page), () => targetCentre(page, "pad"));
	await expect(frame(page).locator("[data-expanded]")).toHaveCount(1);
});

test("the Card in hand never goes transparent", async ({ page }) => {
	for (const name of VARIANTS) {
		await chooseVariant(page, name);
		const card = front(page);
		const box = await card.boundingBox();
		if (!box) throw new Error("Missing card geometry");
		await page.mouse.move(box.x + box.width / 2, box.y + 24);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width / 2 - 140, box.y + 60, {
			steps: 20,
		});
		await expect(card).toHaveCSS("opacity", "1");
		await page.mouse.up();
		await redeal(page);
	}
});

/** Presses `card` near its top and moves past the slop: the Card is in hand. */
async function lift(page: Page, card: Locator) {
	const box = await card.boundingBox();
	if (!box) throw new Error("Missing card geometry");
	const start = { x: box.x + box.width / 2, y: box.y + 24 };
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(start.x + 10, start.y + 10, { steps: 2 });
	return start;
}

/** The Card's rotation in degrees, read from its computed transform. */
function rotation(card: Locator) {
	return card.evaluate((element) => {
		const matrix = new DOMMatrixReadOnly(
			getComputedStyle(element).transform,
		);
		return (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;
	});
}

/** Samples where `card`'s middle is, every frame for `ms`, as a share of the frame's width. */
function farthestOut(card: Locator, ms: number) {
	return card.evaluate(
		(element, duration) =>
			new Promise<number>((resolve) => {
				const frameBox = element
					.closest("[data-deck-frame]")
					?.getBoundingClientRect();
				if (!frameBox) return resolve(Number.POSITIVE_INFINITY);
				let worst = 0;
				const end = performance.now() + duration;
				const step = () => {
					const box = element.getBoundingClientRect();
					const middle = box.left + box.width / 2;
					const out = Math.max(
						frameBox.left - middle,
						middle - frameBox.right,
						0,
					);
					worst = Math.max(worst, out / frameBox.width);
					if (performance.now() < end) requestAnimationFrame(step);
					else resolve(worst);
				};
				requestAnimationFrame(step);
			}),
		ms,
	);
}

test("B: a Card just lifted lights nothing and wears no stamp", async ({
	page,
}) => {
	await chooseVariant(page, "B · Table");
	await lift(page, front(page));
	await expect(frame(page).locator('[data-target="pad"]')).toBeVisible();
	await page.waitForTimeout(200);
	await expect(frame(page).locator("[data-target][data-active]")).toHaveCount(
		0,
	);
	await expect(frame(page).locator("[data-stamp]")).toHaveCount(0);
	await page.mouse.up();
});

test("B: only the target under the hand lights, and the release does what it shows", async ({
	page,
}) => {
	await chooseVariant(page, "B · Table");
	const start = await lift(page, front(page));
	const pad = await targetCentre(page, "pad");
	await page.mouse.move((start.x + pad.x) / 2, (start.y + pad.y) / 2, {
		steps: 12,
	});
	await expect(frame(page).locator("[data-target][data-active]")).toHaveCount(
		0,
	);
	await page.mouse.move(pad.x, pad.y, { steps: 12 });
	await expect(
		frame(page).locator('[data-target="pad"][data-active]'),
	).toHaveCount(1);
	await expect(frame(page).locator('[data-stamp="expand"]')).toHaveCount(1);
	await page.mouse.up();
	await expect(frame(page).locator("[data-expanded]")).toHaveCount(1);
});

test("B: a Card dropped over nothing comes home without leaving the frame", async ({
	page,
}) => {
	await chooseVariant(page, "B · Table");
	const card = front(page);
	const id = await card.getAttribute("data-card-id");
	const start = await lift(page, card);
	await page.mouse.move(start.x + 420, start.y + 260, { steps: 20 });
	await page.waitForTimeout(150);
	const home = frame(page).locator(`[data-card-id="${id ?? ""}"]`);
	const sample = farthestOut(home, 900);
	await page.mouse.up();
	expect(await sample).toBe(0);
	await expect(
		inspector(page).locator('[data-readout="last release"]'),
	).toHaveText("back · nothing");
});

test("B: the lean relaxes once the hand rests", async ({ page }) => {
	await chooseVariant(page, "B · Table");
	const card = front(page);
	const start = await lift(page, card);
	await page.mouse.move(start.x + 260, start.y + 20, { steps: 6 });
	await page.waitForTimeout(600);
	expect(Math.abs(await rotation(card))).toBeLessThan(0.5);
	await page.mouse.up();
});

const panel = (page: Page) => frame(page).locator("[data-panel]");
const lastRelease = (page: Page) =>
	inspector(page).locator('[data-readout="last release"]');

/** Presses `card` and pulls it by (dx, dy) slowly, then rests: no flick. */
async function pull(page: Page, card: Locator, dx: number, dy: number) {
	const box = await card.boundingBox();
	if (!box) throw new Error("Missing card geometry");
	const start = { x: box.x + box.width / 2, y: box.y + 16 };
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(start.x + dx, start.y + dy, { steps: 30 });
	await page.waitForTimeout(150);
	return start;
}

test("D: short of the detent the action shows, and a release puts the Card back", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	await pull(page, front(page), -60, 0);
	await expect(panel(page)).toHaveAttribute("data-panel", "dismiss");
	await expect(panel(page)).not.toHaveAttribute("data-armed");
	await page.mouse.up();
	await expect(lastRelease(page)).toHaveText(/^back · short/);
	await expect(panel(page)).toHaveCount(0);
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
});

test("D: past the detent the panel arms, and the release does what it shows", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	await pull(page, front(page), -150, 0);
	await expect(panel(page)).toHaveAttribute("data-armed", "true");
	await page.mouse.up();
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(0);
	await expect(lastRelease(page)).toHaveText(/^dismiss · detent/);
	await redeal(page);
	await pull(page, front(page), 0, -150);
	await expect(panel(page)).toHaveAttribute("data-panel", "expand");
	await expect(panel(page)).toHaveAttribute("data-armed", "true");
	await page.mouse.up();
	await expect(frame(page).locator("[data-expanded]")).toHaveCount(1);
});

test("D: pulled back under the detent, the panel disarms and the Card returns", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	const start = await pull(page, front(page), -150, 0);
	await expect(panel(page)).toHaveAttribute("data-armed", "true");
	await page.mouse.move(start.x - 60, start.y, { steps: 30 });
	await page.waitForTimeout(150);
	await expect(panel(page)).not.toHaveAttribute("data-armed");
	await page.mouse.up();
	await expect(lastRelease(page)).toHaveText(/^back · short/);
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
});

test("D: in RTL, inline-start is on the right", async ({ page }) => {
	await chooseVariant(page, "D · Swipe actions");
	await inspector(page)
		.getByRole("button", { name: "RTL", exact: true })
		.click();
	await pull(page, front(page), 150, 0);
	await expect(panel(page)).toHaveAttribute("data-panel", "dismiss");
	await page.mouse.up();
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(0);
});

test("D: a Card from behind slides out under the Cards in front of it", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	const back = frame(page).locator("[data-card-id]").first();
	const z = await back.evaluate(
		(element) => getComputedStyle(element).zIndex,
	);
	await pull(page, back, -80, 0);
	await expect(back).toHaveCSS("z-index", z);
	await expect(panel(page)).toHaveAttribute("data-panel", "dismiss");
	await page.mouse.up();
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
});

test("D: toward Close deck the rest of the Deck folds in at once, and back out on a cancel", async ({
	page,
}) => {
	await chooseVariant(page, "D · Swipe actions");
	const cards = frame(page).locator("[data-card-id]");
	const centres = () =>
		cards.evaluateAll((elements) =>
			elements.map((element) => {
				const box = element.getBoundingClientRect();
				return {
					u: box.left + box.width / 2,
					v: box.top + box.height / 2,
				};
			}),
		);
	const rest = await centres();
	/* the share of the way each Card behind has gone from its slot to the swiped one */
	const shares = async () => {
		const now = await centres();
		const lead = now.at(-1);
		if (!lead) throw new Error("Missing the swiped Card");
		return now.slice(0, -1).map((card, index) => {
			const slot = rest[index];
			if (!slot) throw new Error("Missing a slot");
			const to = { u: lead.u - slot.u, v: lead.v - slot.v };
			return (
				((card.u - slot.u) * to.u + (card.v - slot.v) * to.v) /
				(to.u * to.u + to.v * to.v)
			);
		});
	};
	const start = await pull(page, front(page), -48, 0);
	const half = await shares();
	expect(Math.max(...half) - Math.min(...half)).toBeLessThan(0.01);
	for (const share of half) expect(share).toBeCloseTo(0.5, 1);
	await page.mouse.move(start.x - 150, start.y, { steps: 30 });
	await page.waitForTimeout(150);
	for (const share of await shares()) expect(share).toBeCloseTo(1, 2);
	await page.mouse.move(start.x - 40, start.y, { steps: 30 });
	await page.waitForTimeout(150);
	await page.mouse.up();
	await expect(lastRelease(page)).toHaveText(/^back · short/);
	await expect
		.poll(async () => Math.max(...(await shares()).map(Math.abs)))
		.toBeLessThan(0.01);
});
