/// <reference lib="dom" />
import { expect, type Page, test } from "@playwright/test";

/**
 * Card to Cover (#1311): a tap grows the front Card into its Cover. The
 * same element resizes, never scales, and lands on the Cover's box without
 * passing it; its parts ride the box's own progress, so none turns back
 * against the box on the way, and land where the Cover puts them;
 * reduced, it fades out and back in with no growth.
 */

test.use({ viewport: { width: 1600, height: 1000 } });

const SHARED = ["heading", "contexts", "lines"] as const;
type Rect = { x: number; y: number; width: number; height: number };

const frame = (page: Page) => page.locator("[data-card-to-cover]");
const front = (page: Page) => frame(page).locator("[data-card-id]").last();
const inspector = (page: Page) =>
	page.getByRole("complementary", { name: "Inspector" });

async function choose(page: Page, group: string, option: string) {
	await inspector(page)
		.getByRole("group", { name: group })
		.getByRole("button", { name: option, exact: true })
		.click();
}

async function tap(page: Page) {
	const box = await front(page).boundingBox();
	if (!box) throw new Error("Missing card geometry");
	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/** `coverRect`: the frame's padding box, 720 px wide at most, inset 24 px. */
function coverBox(page: Page): Promise<Rect> {
	return frame(page).evaluate((node) => {
		const rect = node.getBoundingClientRect();
		const width = Math.min(720, node.clientWidth - 48);
		return {
			x: rect.left + node.clientLeft + (node.clientWidth - width) / 2,
			y: rect.top + node.clientTop + 24,
			width,
			height: node.clientHeight - 48,
		};
	});
}

/** Each shared part's rect in the front Card's box, and whether Motion still moves it. */
function partsInBox(page: Page) {
	return front(page).evaluate((box, names) => {
		const outer = box.getBoundingClientRect();
		return names.map((name) => {
			const part = box.querySelector(`[data-part="${name}"]`);
			if (!(part instanceof HTMLElement)) return null;
			const rect = part.getBoundingClientRect();
			return {
				name,
				x: rect.left - outer.left,
				y: rect.top - outer.top,
				right: outer.right - rect.right,
				moving: !["", "none"].includes(part.style.transform),
			};
		});
	}, SHARED);
}

/**
 * Samples the front Card every animation frame for `ms`: its real size,
 * its opacity, and the scale its transform and its parts' carry.
 */
function sampleFront(page: Page, id: string, ms: number) {
	return page.evaluate(
		({ id, ms }) =>
			new Promise<
				{ w: number; h: number; opacity: number; scales: number[] }[]
			>((resolve) => {
				const samples: {
					w: number;
					h: number;
					opacity: number;
					scales: number[];
				}[] = [];
				const scaleOf = (node: Element) => {
					const transform = getComputedStyle(node).transform;
					if (transform === "none") return [1, 1];
					const m = new DOMMatrixReadOnly(transform);
					return [Math.hypot(m.a, m.b), Math.hypot(m.c, m.d)];
				};
				const start = performance.now();
				const tick = (now: number) => {
					const box = document.querySelector<HTMLElement>(
						`[data-card-to-cover] [data-card-id="${id}"]`,
					);
					if (box)
						samples.push({
							w: box.offsetWidth,
							h: box.offsetHeight,
							opacity: Number(getComputedStyle(box).opacity),
							scales: [
								box,
								...box.querySelectorAll("[data-part]"),
							].flatMap(scaleOf),
						});
					if (now - start < ms) requestAnimationFrame(tick);
					else resolve(samples);
				};
				requestAnimationFrame(tick);
			}),
		{ id, ms },
	);
}

type Sample = {
	box: { left: number; top: number; right: number; bottom: number };
	parts: Record<string, { left: number; top: number; right: number }>;
};

/** The front Card's rect and its shared parts' rects, every animation frame for `ms`. */
function sampleOpen(page: Page, id: string, ms: number) {
	return page.evaluate(
		({ id, ms, names }) =>
			new Promise<Sample[]>((resolve) => {
				const samples: Sample[] = [];
				const start = performance.now();
				const tick = (now: number) => {
					const box = document.querySelector<HTMLElement>(
						`[data-card-to-cover] [data-card-id="${id}"]`,
					);
					if (box) {
						const { left, top, right, bottom } =
							box.getBoundingClientRect();
						const parts: Sample["parts"] = {};
						for (const name of names) {
							const part = box.querySelector(
								`[data-part="${name}"]`,
							);
							if (part) {
								const rect = part.getBoundingClientRect();
								parts[name] = {
									left: rect.left,
									top: rect.top,
									right: rect.right,
								};
							}
						}
						samples.push({
							box: { left, top, right, bottom },
							parts,
						});
					}
					if (now - start < ms) requestAnimationFrame(tick);
					else resolve(samples);
				};
				requestAnimationFrame(tick);
			}),
		{ id, ms, names: [...SHARED] },
	);
}

/** How often `series` turns back on itself by more than `slop` px. */
function reversals(series: readonly number[], slop = 0.1): number {
	let direction = 0;
	let turns = 0;
	let moved = 0;
	for (let index = 1; index < series.length; index++) {
		moved += (series[index] ?? 0) - (series[index - 1] ?? 0);
		if (Math.abs(moved) < slop) continue;
		const sign = Math.sign(moved);
		if (direction !== 0 && sign !== direction) turns++;
		direction = sign;
		moved = 0;
	}
	return turns;
}

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() =>
		localStorage.setItem("tf-demo-motion-preference", "ignore"),
	);
	await page.goto("/playground/card-to-cover");
	await expect(frame(page).locator("[data-card-id]")).toHaveCount(4);
});

test("the surface shows only the Deck", async ({ page }) => {
	await expect(frame(page).getByRole("button")).toHaveCount(0);
	await expect(frame(page)).not.toContainText("Stiffness");
});

test("a tap grows the Card into the Cover's box by really resizing it, never scaling it", async ({
	page,
}) => {
	const id = (await front(page).getAttribute("data-card-id")) ?? "";
	const card = await front(page).boundingBox();
	const cover = await coverBox(page);
	if (!card) throw new Error("Missing card geometry");

	const sampling = sampleFront(page, id, 900);
	await tap(page);
	const samples = await sampling;

	await expect(frame(page).locator("[data-expanded]")).toHaveAttribute(
		"data-card-id",
		id,
	);
	await expect
		.poll(async () => {
			const box = await front(page).boundingBox();
			return (
				box !== null &&
				Math.abs(box.x - cover.x) < 1 &&
				Math.abs(box.y - cover.y) < 1 &&
				Math.abs(box.width - cover.width) < 1 &&
				Math.abs(box.height - cover.height) < 1
			);
		})
		.toBe(true);

	const between = samples.filter(
		(sample) => sample.w > card.width + 1 && sample.w < cover.width - 1,
	);
	expect(between.length).toBeGreaterThan(4);
	for (const sample of samples)
		for (const scale of sample.scales) expect(scale).toBeCloseTo(1, 6);
});

test("the parts land on their Cover places: the lines first, every context after, all on the centred column", async ({
	page,
}) => {
	// Reduced, the parts are swapped unseen, with no move: where they rest is the Cover's layout.
	await choose(page, "Reduced motion", "on");
	await tap(page);
	await expect(front(page)).toHaveCSS("opacity", "1");
	await expect
		.poll(async () => (await front(page).boundingBox())?.width)
		.toBe((await coverBox(page)).width);
	const places = await partsInBox(page);
	await frame(page).getByRole("button", { name: "Close" }).click();
	await expect(frame(page).locator("[data-expanded]")).toHaveCount(0);

	await choose(page, "Reduced motion", "off");
	await tap(page);
	await expect
		.poll(async () =>
			(await partsInBox(page)).every((part) => part && !part.moving),
		)
		.toBe(true);
	const landed = await partsInBox(page);
	for (const [index, part] of landed.entries()) {
		const place = places[index];
		expect(part && place).toBeTruthy();
		if (!part || !place) continue;
		expect(Math.abs(part.x - place.x)).toBeLessThan(1);
		expect(Math.abs(part.y - place.y)).toBeLessThan(1);
		// one column width in every form, centred in the Cover
		expect(Math.abs(part.x - part.right)).toBeLessThan(1);
	}
	const [heading, contexts, lines] = landed;
	expect(heading && lines && heading.y < lines.y).toBe(true);
	expect(lines && contexts && lines.y < contexts.y).toBe(true);
	const coverOnly = frame(page).locator("[data-cover-only]");
	expect(await coverOnly.count()).toBeGreaterThan(1);
	for (const node of await coverOnly.all())
		await expect(node).toHaveCSS("opacity", "1");
});

test("reduced, the Card fades out at its box and in at the Cover's, with no growth", async ({
	page,
}) => {
	await choose(page, "Reduced motion", "on");
	const id = (await front(page).getAttribute("data-card-id")) ?? "";
	const card = await front(page).boundingBox();
	const cover = await coverBox(page);
	if (!card) throw new Error("Missing card geometry");

	const sampling = sampleFront(page, id, 600);
	await tap(page);
	const samples = await sampling;

	for (const sample of samples) {
		const atCard = Math.abs(sample.w - card.width) < 1;
		const atCover = Math.abs(sample.w - cover.width) < 1;
		expect(atCard || atCover).toBe(true);
	}
	const swap = samples.findIndex(
		(sample) => Math.abs(sample.w - cover.width) < 1,
	);
	expect(swap).toBeGreaterThan(0);
	expect(samples[swap - 1]?.opacity).toBeLessThan(0.05);
	expect(samples.at(-1)?.opacity).toBe(1);
});

test("RTL mirrors the Cover: its × sits at the inline end, on the left", async ({
	page,
}) => {
	await choose(page, "Direction", "RTL");
	await expect(frame(page)).toHaveAttribute("dir", "rtl");
	await tap(page);
	const close = frame(page).getByRole("button", { name: "Close" });
	await expect(close).toHaveCSS("opacity", "1");
	const box = await front(page).boundingBox();
	const button = await close.boundingBox();
	if (!box || !button) throw new Error("Missing geometry");
	expect(button.x - box.x).toBeLessThan(24);
});

for (const direction of ["LTR", "RTL"] as const)
	test(`${direction}: the box never passes its Cover box, and each part rides the box's own progress without turning back`, async ({
		page,
	}) => {
		if (direction === "RTL") {
			await choose(page, "Direction", "RTL");
			await expect(frame(page)).toHaveAttribute("dir", "rtl");
		}
		const id = (await front(page).getAttribute("data-card-id")) ?? "";
		const cover = await coverBox(page);
		const sampling = sampleOpen(page, id, 900);
		await tap(page);
		const samples = await sampling;
		const first = samples[0];
		if (!first) throw new Error("No samples");

		// past the Cover's edges by no more than half a pixel, on any side
		const end = {
			left: cover.x,
			top: cover.y,
			right: cover.x + cover.width,
			bottom: cover.y + cover.height,
		};
		for (const sample of samples) {
			expect(sample.box.left).toBeGreaterThan(end.left - 0.5);
			expect(sample.box.top).toBeGreaterThan(end.top - 0.5);
			expect(sample.box.right).toBeLessThan(end.right + 0.5);
			expect(sample.box.bottom).toBeLessThan(end.bottom + 0.5);
		}

		// the box's own progress, read off its height
		const height = (sample: Sample) => sample.box.bottom - sample.box.top;
		const last = samples.at(-1);
		if (!last) throw new Error("No samples");
		const progress = (sample: Sample) =>
			(height(sample) - height(first)) / (height(last) - height(first));

		// each shared part's place in the box, from its inline-start edge
		for (const name of SHARED) {
			const inBox = samples.flatMap((sample) => {
				const part = sample.parts[name];
				return part
					? [
							{
								p: progress(sample),
								x:
									direction === "RTL"
										? sample.box.right - part.right
										: part.left - sample.box.left,
								y: part.top - sample.box.top,
							},
						]
					: [];
			});
			const from = inBox[0];
			const to = inBox.at(-1);
			if (!from || !to) throw new Error(`No samples of ${name}`);
			expect(inBox.length).toBeGreaterThan(10);
			if (name !== "heading")
				expect(Math.abs(to.y - from.y)).toBeGreaterThan(10);
			expect(reversals(inBox.map((place) => place.x))).toBe(0);
			expect(reversals(inBox.map((place) => place.y))).toBe(0);
			// one clock: the part is where the box's progress puts it, to a pixel or so
			for (const place of inBox)
				expect(
					Math.abs(place.y - (from.y + (to.y - from.y) * place.p)),
				).toBeLessThan(1.5);
		}
	});
