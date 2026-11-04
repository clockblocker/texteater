/// <reference lib="dom" />
import { expect, type Page, test } from "@playwright/test";
import {
	type Stroke,
	stampedGesture,
	startDrag,
	strokes,
} from "./support/deck";

/**
 * How the deck reads a gesture: the workbench's scenarios, the swipe that
 * sweeps a Deck, a Card taken up or torn loose, its three drop zones, a
 * throw, a double-click and the Ground line. The deck's motion is in
 * `deck-motion.pw.ts`.
 */

test.use({ viewport: { width: 1600, height: 1100 } });

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
	await stampedGesture(page, x, y, strokes(3, 0, -40 / 3, 16), 16);
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
	/* off the swipe's axis, short of the expand zone: the Card is in
	   hand, the Deck is not */
	await page.mouse.move(x - 60, y + 70, { steps: 8 });
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
						box.y + box.height / 2 - (y + 70),
					)
				: Number.POSITIVE_INFINITY;
		})
		.toBeLessThan(4);
	await page.keyboard.press("Escape");
	await page.mouse.up();
	await expect(frame.locator("[data-held]")).toHaveCount(0);
	await expect(cards).toHaveCount(4);
});

/** Deals `noch`'s Deck on the deck-models page and presses its open Card's Heading. */
async function dealAndGesture(
	page: Page,
	path: readonly Stroke[],
	releaseMs: number,
) {
	const frame = page.locator("[data-deck-frame]");
	await frame.locator('[data-word="noch"]').click();
	await expect(frame.locator('[data-form="card"]')).toHaveCount(4);
	const heading = await frame
		.locator('[data-place="open"] [data-heading]')
		.boundingBox();
	if (!heading) throw new Error("Missing heading geometry");
	await stampedGesture(
		page,
		heading.x + heading.width / 2,
		heading.y + heading.height / 2,
		path,
		releaseMs,
	);
	await expect(frame.locator("[data-held]")).toHaveCount(0);
}

test("a flick either way along the line sweeps the deck, and a flick up opens", async ({
	page,
}) => {
	await page.goto("/playground/deck-models");
	const frame = page.locator("[data-deck-frame]");
	const cards = frame.locator('[data-form="card"]');
	const panes = frame.locator("[data-deck-pane]");
	/* flicked left, it sweeps, though the throw drifts well off its axis */
	await dealAndGesture(page, strokes(6, -70, 12, 16), 16);
	await expect(cards).toHaveCount(0);
	await expect(panes).toHaveCount(1);
	/* flicked right, the whole Deck goes too */
	await dealAndGesture(page, strokes(6, 70, 0, 16), 16);
	await expect(cards).toHaveCount(0);
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(0);
	/* thrown up, it opens */
	await dealAndGesture(page, strokes(4, 0, -30, 16), 16);
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(1);
});

for (const [name, dx, dy] of [
	["left", -40, 0],
	["far left", -100, 0],
	["right", 40, 0],
	["up", 0, -40],
	["down", 0, 40],
] as const)
	test(`a slow drag ${name} past the line drops the card in its zone`, async ({
		page,
	}) => {
		await page.goto("/playground/deck-models");
		const frame = page.locator("[data-deck-frame]");
		/* carried slowly and held still before the release: no throw */
		await dealAndGesture(page, strokes(4, dx, dy, 40), 300);
		/* left or down the Deck is swept; right or up the Card is a Cover
		   over it, which hides it */
		await expect(frame.locator('[data-form="card"]')).toHaveCount(0);
		await expect(frame.locator('[data-form="sheet"]')).toHaveCount(
			dx < 0 || dy > 0 ? 0 : 1,
		);
	});

test("each zone shows itself before the release, and short of every line the card goes back", async ({
	page,
}) => {
	await page.goto("/playground/deck-models");
	const frame = page.locator("[data-deck-frame]");
	await frame.locator('[data-word="noch"]').click();
	const card = frame.locator('[data-place="open"]');
	const ghost = frame.locator('[data-form="sheet"][data-preview]');
	const red = frame.locator('[data-form="card"][data-past="true"]');
	const heading = await card.locator("[data-heading]").boundingBox();
	if (!heading) throw new Error("Missing heading geometry");
	const x = heading.x + heading.width / 2;
	const y = heading.y + heading.height / 2;
	const carry = async (dx: number, dy: number) => {
		for (let step = 1; step <= 10; step++) {
			await page.mouse.move(x + (dx * step) / 10, y + (dy * step) / 10);
			await page.waitForTimeout(20);
		}
		await page.waitForTimeout(150);
	};
	await page.mouse.move(x, y);
	await page.mouse.down();
	/* right past the line: the expand zone, the Cover it would open */
	await carry(140, 0);
	await expect(ghost).toHaveCount(1);
	await expect(red).toHaveCount(0);
	await expect(frame.locator('[data-held][data-fate="open"]')).toHaveCount(1);
	/* back near the Deck: nothing but the Card going back */
	await carry(30, 0);
	await expect(ghost).toHaveCount(0);
	await expect(frame.locator('[data-held][data-fate="rest"]')).toHaveCount(1);
	/* carried on left past the line: the dismiss zone, the whole Deck red */
	await carry(-140, 0);
	await expect(red).toHaveCount(4);
	await expect(ghost).toHaveCount(0);
	/* down past the line is the dismiss zone too */
	await carry(0, 140);
	await expect(red).toHaveCount(4);
	await expect(ghost).toHaveCount(0);
	/* up past the line is the expand zone */
	await carry(0, -140);
	await expect(ghost).toHaveCount(1);
	await expect(red).toHaveCount(0);
	/* back short of every line and let go: the Card is on its Deck again */
	await carry(-20, 0);
	await expect(red).toHaveCount(0);
	await page.mouse.up();
	await expect(frame.locator("[data-held]")).toHaveCount(0);
	await expect(frame.locator('[data-form="card"]')).toHaveCount(4);
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(0);
});

test("a double-click expands a card; a single click only brings it to the front", async ({
	page,
}) => {
	await page.goto("/playground/deck-models");
	const frame = page.locator("[data-deck-frame]");
	await frame.locator('[data-word="noch"]').click();
	const cards = frame.locator('[data-form="card"]');
	await expect(cards).toHaveCount(4);
	const behind = cards.first().locator("[data-heading]");
	await behind.click();
	await expect(cards.first()).toHaveAttribute("data-place", "open");
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(0);
	await page.waitForTimeout(600);
	await cards.last().locator("[data-heading]").dblclick();
	await expect(frame.locator('[data-form="sheet"]')).toHaveCount(1);
	await expect(cards).toHaveCount(0);
});

test("the ground line steps down and back up, and a link pushes a cover that closes", async ({
	page,
}) => {
	await page.goto("/playground/deck-models");
	const frame = page.locator("[data-deck-frame]");
	const pane = frame.locator('[data-deck-pane="root"]');
	await expect(pane).toHaveAttribute("data-pane-kind", "rooted");
	await expect(frame.locator('[data-form="ground"]')).toHaveCount(1);
	/* ← on the Ground: Scroll › Library › Menu, and back up by tapping */
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
	/* a word deals a Deck that belongs to the Scroll; a Cover from a link
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
	/* a dismissive click on the Scroll sweeps its Deck */
	await frame
		.locator('[data-form="ground"]')
		.click({ position: { x: 20, y: 300 } });
	await expect(frame.locator('[data-form="card"]')).toHaveCount(0);
});
