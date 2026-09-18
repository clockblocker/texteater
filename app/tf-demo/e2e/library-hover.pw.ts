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
		.getByRole("button", {
			name: /Der Aufstieg und Abstieg waren gestern anstrengend\./,
		})
		.click();
	await expect(
		page.getByRole("article", { name: "Text", exact: true }),
	).toBeVisible();
	// Restore the trace's five-Sheet Library stack beside a Text Sheet.
	// Only setup uses storage; every interaction under test is browser mouse input.
	await page.evaluate(() => {
		const saved = JSON.parse(
			localStorage.getItem("tf-demo.workspace.v2") ?? "null",
		);
		const text = saved?.presentations.find(
			(item: { subject: { kind: string } }) =>
				item.subject.kind === "Text",
		)?.subject;
		if (!text)
			throw new Error("Text did not persist for the hover fixture.");
		localStorage.setItem(
			"tf-demo.workspace.v2",
			JSON.stringify({
				version: 2,
				layout: {
					kind: "Split",
					id: "split-55",
					axis: "horizontal",
					children: [
						{ kind: "Pane", id: "pane-1" },
						{ kind: "Pane", id: "pane-54" },
					],
				},
				panes: {
					"pane-1": {
						id: "pane-1",
						presentationIds: [
							"presentation-2",
							"presentation-3",
							"presentation-4",
							"presentation-5",
							"presentation-6",
						],
					},
					"pane-54": {
						id: "pane-54",
						presentationIds: ["presentation-7"],
					},
				},
				presentations: [2, 3, 4, 5, 6, 7].map((id) => ({
					id: `presentation-${id}`,
					subject:
						id === 2 || id === 4 || id === 6
							? { kind: "Library" }
							: text,
					locked: id === 2 || id === 7,
				})),
				layers: {},
				candidateKeyByPresentationId: {},
				activePaneId: "pane-1",
				nextId: 56,
			}),
		);
	});
	await page.reload();
	await expect(page.locator("[data-workspace-pane]")).toHaveCount(2);
	const library = page.locator(
		'section[aria-labelledby="library-title"]:visible',
	);
	const cards = library.getByRole("button");
	await expect(cards.first()).toBeVisible();
	await page.mouse.move(80, 750);
	await expect(cards.locator(":scope:hover")).toHaveCount(0);
	// Let the normal 150 ms hover-out transition finish before recording idle colors.
	await page.waitForTimeout(200);
	// Verify the recorded coordinates hit the intended surfaces before replaying.
	const surfaces = await page.evaluate(() => ({
		startsOnCard: Boolean(
			document
				.elementFromPoint(770, 407)
				?.closest('section[aria-labelledby="library-title"] button'),
		),
		divider:
			document
				.elementFromPoint(896, 381)
				?.closest('[role="separator"]') !== null,
		clickIsBackground: document
			.elementFromPoint(885, 436)
			?.classList.contains("overflow-y-auto"),
	}));
	expect(surfaces).toEqual({
		startsOnCard: true,
		divider: true,
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
	for (const input of recordedInput) {
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
