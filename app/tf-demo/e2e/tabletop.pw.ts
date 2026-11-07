/// <reference lib="dom" />
import { expect, type Page, test } from "@playwright/test";

/**
 * Tabletop (#1317): Note Cards rest in CSS Slots and move by Terms that
 * decay to nothing. A Card at rest is exactly its Slot, even in the frame
 * right after a resize; a tap grows it into a Cover by really resizing it;
 * Fan leaves the Deck fanned.
 */

test.use({ viewport: { width: 1440, height: 900 } });

const BODY = "[data-tabletop-body]";
const inspector = (page: Page) =>
	page.getByRole("complementary", { name: "Inspector" });

/** Every Card whose box is not its Slot's, rotation aside; [] when all rest. */
function offSlot(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const off: string[] = [];
		for (const body of document.querySelectorAll<HTMLElement>(
			"[data-tabletop-body]",
		)) {
			const slot = document.querySelector(
				`[data-tabletop-slot="${body.dataset.slot}"]`,
			);
			const id = body.dataset.tabletopBody;
			if (!slot) {
				off.push(`${id}: no Slot`);
				continue;
			}
			const want = slot.getBoundingClientRect();
			const style = getComputedStyle(body);
			/* offset* is the layout box, untransformed: the place a rotated Card rests */
			const got = {
				left: body.offsetLeft,
				top: body.offsetTop,
				width: body.offsetWidth,
				height: body.offsetHeight,
			};
			const far = (["left", "top", "width", "height"] as const).some(
				(key) => Math.abs(got[key] - want[key]) > 1,
			);
			if (far || !/^(none|0px( 0px)?)$/.test(style.translate))
				off.push(
					`${id}: ${JSON.stringify(got)} vs ${JSON.stringify(want)} ${style.translate}`,
				);
		}
		return off;
	});
}

/** Whether the Table has written nothing on any Card: every move is over. */
function atRest(page: Page): Promise<boolean> {
	return page.evaluate(() =>
		[...document.querySelectorAll("[data-tabletop-body]")].every(
			(body) => !/--(fly|box)-/.test(body.getAttribute("style") ?? ""),
		),
	);
}

async function open(page: Page) {
	await page.goto("/playground/tabletop");
	await expect(page.locator(BODY)).toHaveCount(8);
	await expect.poll(() => atRest(page), { timeout: 5_000 }).toBe(true);
}

test("deals the Note Cards into their Slots on the Ground", async ({
	page,
}) => {
	await open(page);
	expect(await offSlot(page)).toEqual([]);
	const scales = await page
		.locator(BODY)
		.evaluateAll((nodes) =>
			nodes.map((node) => getComputedStyle(node).scale),
		);
	expect(new Set(scales)).toEqual(new Set(["1"]));
	// the surface is the scene alone: no buttons or captions besides the Split's
	await expect(
		page
			.locator("[data-tabletop]")
			.getByRole("button", { name: /Deal|Fan/ }),
	).toHaveCount(0);
});

test("a tap grows the Card into its Cover by resizing it, and Escape puts it back", async ({
	page,
}) => {
	await open(page);
	const card = page.locator('[data-tabletop-body="abend"]');
	const start = await card.boundingBox();
	if (!start) throw new Error("no Card");
	await page.evaluate(() => {
		const el = document.querySelector<HTMLElement>(
			'[data-tabletop-body="abend"]',
		);
		const samples: { scale: string; width: number }[] = [];
		(window as unknown as { samples: typeof samples }).samples = samples;
		const t0 = performance.now();
		const sample = () => {
			if (!el) return;
			samples.push({
				scale: getComputedStyle(el).scale,
				width: el.offsetWidth,
			});
			if (performance.now() - t0 < 900) requestAnimationFrame(sample);
		};
		requestAnimationFrame(sample);
	});
	await page.mouse.click(start.x + start.width / 2, start.y + 16);
	await expect(card).toHaveAttribute("data-form", "cover");
	await expect.poll(() => atRest(page), { timeout: 5_000 }).toBe(true);
	const samples = await page.evaluate(
		() =>
			(
				window as unknown as {
					samples: { scale: string; width: number }[];
				}
			).samples,
	);
	// never scaled, mid-morph or after; the box itself grew through many sizes
	expect(samples.filter((sample) => sample.scale !== "1")).toEqual([]);
	expect(new Set(samples.map((sample) => sample.width)).size).toBeGreaterThan(
		5,
	);
	expect(await offSlot(page)).toEqual([]);
	await expect(card).toHaveAttribute("data-slot", "ground:cover");
	await expect(card.getByRole("button", { name: "Close" })).toBeVisible();

	await page.keyboard.press("Escape");
	await expect(card).toHaveAttribute("data-form", "card");
	await expect.poll(() => atRest(page), { timeout: 5_000 }).toBe(true);
	await expect(card).toHaveAttribute("data-slot", "ground:abend");
	expect(await offSlot(page)).toEqual([]);
	await expect(inspector(page)).toBeVisible();
});

test("after a resize or a Split drag every Card is in its Slot in the very next frame", async ({
	page,
}) => {
	await open(page);
	await page.setViewportSize({ width: 1180, height: 760 });
	expect(
		await page.evaluate(
			() =>
				new Promise((resolve) =>
					requestAnimationFrame(() => resolve(true)),
				),
		),
	).toBe(true);
	expect(await offSlot(page)).toEqual([]);

	const handle = page.getByRole("separator", { name: "Resize Regions" });
	const box = await handle.boundingBox();
	if (!box) throw new Error("no Split Handle");
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	for (let step = 1; step <= 6; step++) {
		await page.mouse.move(box.x - step * 20, box.y + box.height / 2);
		expect(await offSlot(page)).toEqual([]);
	}
	await page.mouse.up();
});

test("the hand carries a Card 1:1 and a grab mid-move takes it from where it shows", async ({
	page,
}) => {
	await open(page);
	/* slowed four times, the way home is long enough to catch under any load */
	await inspector(page).getByRole("button", { name: "0.25×" }).click();
	const card = page.locator('[data-tabletop-body="abend"]');
	const start = await card.boundingBox();
	if (!start) throw new Error("no Card");
	await page.mouse.move(start.x + 40, start.y + 16);
	await page.mouse.down();
	await page.mouse.move(start.x + 140, start.y + 116, { steps: 5 });
	await expect(card).toHaveAttribute("data-mode", "hand");
	await page.mouse.up();
	// caught on its way home, in one task: it shows where it was
	const jump = await page.evaluate(() => {
		const el = document.querySelector<HTMLElement>(
			'[data-tabletop-body="abend"]',
		);
		if (!el) return null;
		const before = el.getBoundingClientRect();
		const at = { clientX: before.left + 20, clientY: before.top + 20 };
		el.dispatchEvent(
			new PointerEvent("pointerdown", {
				...at,
				bubbles: true,
				button: 0,
				pointerId: 7,
			}),
		);
		const after = el.getBoundingClientRect();
		const mode = el.dataset.mode ?? null;
		window.dispatchEvent(
			new PointerEvent("pointerup", { ...at, pointerId: 7 }),
		);
		return {
			mode,
			by: Math.hypot(after.left - before.left, after.top - before.top),
		};
	});
	expect(jump?.mode).toBe("hand");
	expect(jump?.by ?? Number.POSITIVE_INFINITY).toBeLessThan(1);
	await expect.poll(() => atRest(page), { timeout: 8_000 }).toBe(true);
	expect(await offSlot(page)).toEqual([]);
});

test("Fan leaves the Deck fanned, the outermost Cards turned furthest", async ({
	page,
}) => {
	await open(page);
	await inspector(page)
		.getByRole("button", { name: "Fan", exact: true })
		.click();
	await expect.poll(() => atRest(page), { timeout: 5_000 }).toBe(true);
	const rotations = await page.evaluate(() =>
		[...document.querySelectorAll<HTMLElement>("[data-tabletop-body]")]
			.filter((body) => body.dataset.slot?.startsWith("ground:"))
			.map((body) => ({
				z: Number(getComputedStyle(body).zIndex),
				rotate: getComputedStyle(body).rotate,
			}))
			.sort((a, b) => a.z - b.z)
			.map((body) => body.rotate),
	);
	expect(rotations).toHaveLength(8);
	expect(rotations[0]).toBe("-130deg");
	expect(rotations.at(-1)).toBe("130deg");
	expect(await offSlot(page)).toEqual([]);
});
