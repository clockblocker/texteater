/// <reference lib="dom" />
import { performance } from "node:perf_hooks";
import { expect, test } from "@playwright/test";
import recordedInput from "./fixtures/library-background-click.json" with {
	type: "json",
};

declare global {
	interface Window {
		__libraryHoverEvents?: {
			t: number;
			type: string;
			x?: number;
			y?: number;
			target: string;
		}[];
	}
}

const STORAGE_KEY = "tf-demo.workspace.compass.v1";

/** Where the recorded trace starts, crosses the Pane divider, and clicks. */
const RECORDED = {
	start: { x: 770, y: 407 },
	divider: { x: 896 },
	click: { x: 885, y: 436 },
};

test.afterEach(async ({ page }, testInfo) => {
	const events = await page
		.evaluate(() => window.__libraryHoverEvents ?? [])
		.catch(() => []);
	await testInfo.attach("received-pointer-events", {
		body: JSON.stringify(events),
		contentType: "application/json",
	});
});

test.use({
	viewport: { width: 1745, height: 982 },
	deviceScaleFactor: 2.2,
	contextOptions: { reducedMotion: "reduce" },
	channel: process.env.TF_DEMO_E2E_CHANNEL,
});

test("Library hover responds immediately after the recorded background click", async ({
	page,
}, testInfo) => {
	test.setTimeout(30_000);
	await page.goto("/");
	await page
		.locator('section[aria-labelledby="library-title"] button')
		.first()
		.click();
	await expect(page.locator('[data-slot="text-reader"]')).toBeVisible();
	// Restore the trace's layout, the Library beside a Text, in two Panes.
	// Only setup uses storage; every interaction under test is browser mouse input.
	await page.evaluate((key) => {
		const saved = JSON.parse(localStorage.getItem(key) ?? "null");
		const ground = saved?.layout?.line?.at(-1);
		if (ground?.kind !== "Sheet")
			throw new Error("Text did not persist for the hover fixture.");
		localStorage.setItem(
			key,
			JSON.stringify({
				layout: {
					kind: "Split",
					id: "split-55",
					direction: "horizontal",
					children: [
						{
							kind: "Pane",
							id: "pane-1",
							line: [
								{ id: "sheet-2", kind: "Menu", deck: null },
								{
									id: "sheet-3",
									kind: "MenuItem",
									item: "library",
									deck: null,
								},
							],
							covers: [],
						},
						{
							kind: "Pane",
							id: "pane-54",
							line: [{ ...ground, id: "sheet-53" }],
							covers: [],
						},
					],
				},
				activePaneId: "pane-1",
				nextId: 56,
			}),
		);
	}, STORAGE_KEY);
	await page.reload();
	await expect(page.locator("[data-deck-pane]")).toHaveCount(2);
	const library = page.locator(
		'section[aria-labelledby="library-title"]:visible',
	);
	const cards = library.getByRole("button");
	await expect(cards.first()).toBeVisible();
	await page.mouse.move(80, 750);
	await expect(cards.locator(":scope:hover")).toHaveCount(0);
	// Let the normal 150 ms hover-out transition finish before recording idle colors.
	await page.waitForTimeout(200);
	// The trace was recorded on another layout. Move it so the divider it
	// crossed is this one, and it starts on a Library card's row.
	const divider = await page.locator('[role="separator"]').boundingBox();
	const firstCard = await cards.first().boundingBox();
	if (!divider || !firstCard) throw new Error("Missing divider or card.");
	const shift = {
		x: divider.x + divider.width / 2 - RECORDED.divider.x,
		y: firstCard.y + firstCard.height / 2 - RECORDED.start.y,
	};
	const moved = recordedInput.map((input) => ({
		...input,
		x: input.x + shift.x,
		y: input.y + shift.y,
	}));
	// Verify the moved coordinates hit the intended surfaces before replaying.
	// The divider lies under the Text Pane's Ground, which the Compass draws
	// over the Panes; the trace crosses it by construction, and resizing
	// finds it by position rather than by what is on top.
	const surfaces = await page.evaluate(
		({ start, click }) => ({
			startsOnCard: Boolean(
				document
					.elementFromPoint(start.x, start.y)
					?.closest(
						'section[aria-labelledby="library-title"] button',
					),
			),
			clickIsBackground: document
				.elementFromPoint(click.x, click.y)
				?.classList.contains("overflow-y-auto"),
		}),
		{
			start: {
				x: RECORDED.start.x + shift.x,
				y: RECORDED.start.y + shift.y,
			},
			click: {
				x: RECORDED.click.x + shift.x,
				y: RECORDED.click.y + shift.y,
			},
		},
	);
	expect(surfaces).toEqual({
		startsOnCard: true,
		clickIsBackground: true,
	});
	const targets = await cards.evaluateAll((elements) =>
		elements.slice(0, 4).map((element) => {
			const box = element.getBoundingClientRect();
			return {
				x: box.x + box.width / 2,
				y: box.y + box.height / 2,
				idleBackground: getComputedStyle(element).backgroundColor,
			};
		}),
	);

	await page.evaluate(() => {
		window.__libraryHoverEvents = [];
		for (const type of [
			"pointermove",
			"pointerdown",
			"pointerup",
			"pointerleave",
			"pointerover",
			"blur",
			"focus",
		]) {
			window.addEventListener(
				type,
				(event) => {
					window.__libraryHoverEvents?.push({
						t: performance.now(),
						type,
						...(event instanceof MouseEvent
							? { x: event.clientX, y: event.clientY }
							: {}),
						target:
							event.target instanceof Element
								? `${event.target.tagName}.${event.target.getAttribute("class")}`
								: event.target === document
									? "document"
									: "window",
					});
				},
				{ capture: true, passive: true },
			);
		}
	});
	// Actual mouse input from tf-demo-mouse-2026-09-18T05-34-31.096Z.json.
	const start = performance.now();
	for (const input of moved) {
		const remaining = input.at - (performance.now() - start);
		if (remaining > 0)
			await new Promise((resolve) => setTimeout(resolve, remaining));
		if (input.type === "pointermove")
			await page.mouse.move(input.x, input.y);
		else if (input.type === "pointerdown") await page.mouse.down();
		else if (input.type === "pointerup") await page.mouse.up();
	}
	const afterClick = await page.evaluate(() => ({
		documentHovered: document.documentElement.matches(":hover"),
		focused: document.hasFocus(),
	}));
	await testInfo.attach("immediately-after-click", {
		body: JSON.stringify(afterClick),
		contentType: "application/json",
	});
	expect(afterClick).toEqual({ documentHovered: true, focused: true });

	// The trace cannot replay missing physical movements. Supply them explicitly,
	// without locator.hover() actionability waits or retrying hover assertions.
	for (const [index, target] of targets.entries()) {
		await page.mouse.move(target.x, target.y);
		const samples = await cards
			.nth(index)
			.evaluate(async (element, point) => {
				const start = performance.now();
				const samples = [];
				do {
					samples.push({
						t: performance.now(),
						elapsed: performance.now() - start,
						hover: element.matches(":hover"),
						focused: document.hasFocus(),
						documentHovered:
							document.documentElement.matches(":hover"),
						receivesPointer: element.contains(
							document.elementFromPoint(point.x, point.y),
						),
						background: getComputedStyle(element).backgroundColor,
					});
					await new Promise<void>((resolve) =>
						requestAnimationFrame(() => resolve()),
					);
				} while (performance.now() - start < 250);
				return samples;
			}, target);
		await testInfo.attach(`card-${index}-hover`, {
			body: JSON.stringify(samples),
			contentType: "application/json",
		});
		expect(samples[0]).toMatchObject({
			hover: true,
			receivesPointer: true,
		});
		expect(
			samples.every((sample) => sample.hover && sample.receivesPointer),
		).toBe(true);
		expect(samples.at(-1)?.background).not.toBe(target.idleBackground);
	}
});
