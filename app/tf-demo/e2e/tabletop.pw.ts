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

/** `id`'s tilt as CSS shows it, and how lit every Card's glares are. */
function tiltOf(page: Page, id: string) {
	return page.evaluate((id) => {
		const el = document.querySelector<HTMLElement>(
			`[data-tabletop-body="${id}"]`,
		);
		if (!el) throw new Error(`no Card ${id}`);
		const style = getComputedStyle(el);
		const lit: Record<string, number> = {};
		for (const glare of document.querySelectorAll(
			"[data-tabletop-glare]",
		)) {
			const body = glare.closest<HTMLElement>("[data-tabletop-body]");
			const key = body?.dataset.tabletopBody ?? "?";
			lit[key] = Math.max(
				lit[key] ?? 0,
				Number(getComputedStyle(glare).opacity),
			);
		}
		return {
			tilting: el.hasAttribute("data-tilt"),
			x: Number.parseFloat(style.getPropertyValue("--tilt-x")),
			y: Number.parseFloat(style.getPropertyValue("--tilt-y")),
			transform: style.transform,
			lit,
		};
	}, id);
}

const choice = (page: Page, group: string, name: string) =>
	inspector(page)
		.getByRole("group", { name: group })
		.getByRole("button", { name, exact: true });

test("the hovered Card tilts toward the pointer and lights its glare alone, and never under reduced motion", async ({
	page,
}) => {
	await open(page);
	const box = await page
		.locator('[data-tabletop-body="abend"]')
		.boundingBox();
	if (!box) throw new Error("no Card");
	const corner = { x: box.x + box.width * 0.95, y: box.y + box.height * 0.9 };
	/* in from below the Deck, so no other Card is crossed on the way */
	await page.mouse.move(corner.x, box.y + box.height + 40);
	await page.mouse.move(corner.x, corner.y, { steps: 4 });
	await expect
		.poll(async () => (await tiltOf(page, "abend")).y, { timeout: 3_000 })
		.toBeGreaterThan(7);
	const tilted = await tiltOf(page, "abend");
	// the corner under the pointer comes up: the bottom and the inline end
	expect(tilted.x).toBeGreaterThan(6);
	expect(tilted.transform).toContain("matrix3d");
	// light layers on the handled Card only, at opacity 0 on every other one
	expect(tilted.lit.abend).toBeGreaterThan(0.3);
	for (const [id, opacity] of Object.entries(tilted.lit))
		if (id !== "abend") expect(opacity, id).toBe(0);

	// in RTL the lean is logical: mirrored value, the same corner coming up
	await choice(page, "Direction", "RTL").click();
	const rtl = await page
		.locator('[data-tabletop-body="abend"]')
		.boundingBox();
	if (!rtl) throw new Error("no Card");
	await page.mouse.move(rtl.x + rtl.width * 0.95, rtl.y + rtl.height + 40);
	await page.mouse.move(rtl.x + rtl.width * 0.95, rtl.y + rtl.height * 0.9, {
		steps: 4,
	});
	await expect
		.poll(async () => (await tiltOf(page, "abend")).y, { timeout: 3_000 })
		.toBeLessThan(-7);
	const matrix = (transform: string) =>
		(/\(([^)]*)\)/.exec(transform)?.[1] ?? "").split(",").map(Number);
	const mirrored = matrix((await tiltOf(page, "abend")).transform);
	matrix(tilted.transform).forEach((value, index) => {
		expect(mirrored[index] ?? Number.NaN).toBeCloseTo(value, 1);
	});
	await choice(page, "Direction", "LTR").click();

	// the pointer leaves: the tilt lets go and nothing stays written
	await page.mouse.move(4, 4);
	await expect
		.poll(async () => (await tiltOf(page, "abend")).tilting)
		.toBe(false);

	await choice(page, "Reduced motion", "on").click();
	await page.mouse.move(corner.x, box.y + box.height + 40);
	await page.mouse.move(corner.x, corner.y, { steps: 6 });
	await page.waitForTimeout(400);
	const reduced = await tiltOf(page, "abend");
	expect(reduced).toMatchObject({ tilting: false, x: 0, y: 0 });
	expect(reduced.transform).toBe("none");
	expect(Object.values(reduced.lit).every((opacity) => opacity === 0)).toBe(
		true,
	);
});

/** How many strongly red and strongly green pixels the page shows. */
async function redAndGreen(page: Page) {
	const png = (await page.screenshot()).toString("base64");
	return page.evaluate(async (b64) => {
		const img = new Image();
		img.src = `data:image/png;base64,${b64}`;
		await img.decode();
		const canvas = document.createElement("canvas");
		canvas.width = img.width;
		canvas.height = img.height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("no canvas");
		context.drawImage(img, 0, 0);
		const { data } = context.getImageData(0, 0, img.width, img.height);
		let red = 0;
		let green = 0;
		for (let i = 0; i < data.length; i += 4) {
			const [r = 0, g = 0, b = 0] = [data[i], data[i + 1], data[i + 2]];
			if (r > 150 && g < 60 && b < 60) red++;
			if (g > 130 && r < 60 && b < 60) green++;
		}
		return { red, green };
	}, png);
}

test("overlapping Cards mid-turn, and a tilted one, draw the face the angle shows", async ({
	page,
}) => {
	await open(page);
	/* the fronts green, the backs red; the angle set straight on each shell */
	await page.addStyleTag({
		content: `[data-tabletop-face="front"]>div:first-child{background:#0b0!important}
[data-tabletop-face="back"]>div:first-child{background:#c00!important}
[data-tabletop-glare]{display:none}`,
	});
	const turnTo = (deg: number, only?: string) =>
		page.evaluate(
			({ deg, only }) => {
				for (const shell of document.querySelectorAll<HTMLElement>(
					"[data-tabletop-shell]",
				))
					if (
						!only ||
						shell.closest(`[data-tabletop-body="${only}"]`)
					)
						shell.style.setProperty("--fly-turn", `${deg}deg`);
			},
			{ deg, only },
		);
	for (const deg of [60, 80]) {
		await turnTo(deg);
		expect((await redAndGreen(page)).red, `${deg}°`).toBe(0);
	}
	for (const deg of [100, 120]) {
		await turnTo(deg);
		expect((await redAndGreen(page)).green, `${deg}°`).toBe(0);
	}

	await turnTo(0);
	await turnTo(120, "abend");
	const box = await page
		.locator('[data-tabletop-body="abend"]')
		.boundingBox();
	if (!box) throw new Error("no Card");
	await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.8, {
		steps: 4,
	});
	await expect
		.poll(async () => (await tiltOf(page, "abend")).y)
		.toBeGreaterThan(6);
	const clip = { ...box, y: box.y + box.height * 0.45, height: 20 };
	await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.81);
	const strip = (await page.screenshot({ clip })).toString("base64");
	// the tilted top Card, past edge on, shows its back across its middle
	const shown = await page.evaluate(async (b64) => {
		const img = new Image();
		img.src = `data:image/png;base64,${b64}`;
		await img.decode();
		const canvas = document.createElement("canvas");
		canvas.width = img.width;
		canvas.height = img.height;
		const context = canvas.getContext("2d");
		context?.drawImage(img, 0, 0);
		const pixel = context?.getImageData(
			img.width / 2,
			img.height / 2,
			1,
			1,
		).data;
		return [pixel?.[0] ?? 0, pixel?.[1] ?? 0];
	}, strip);
	expect(shown[0]).toBeGreaterThan(150);
	expect(shown[1]).toBeLessThan(60);
});

test("the corner control turns a Card over and back, F turns it too, and a tap still opens it", async ({
	page,
}) => {
	await open(page);
	const card = page.locator('[data-tabletop-body="abend"]');
	const shell = card.locator("[data-tabletop-shell]");
	const control = card.getByRole("button", { name: "Turn over" });
	// shown only while the pointer is over the Card
	await expect(control).toHaveCSS("opacity", "0");
	await card.hover({ position: { x: 60, y: 70 } });
	await expect(control).toHaveCSS("opacity", "1");
	await control.click();
	await expect(shell).toHaveAttribute("data-side", "back");
	await expect(card).toHaveAttribute("data-form", "card");
	// the side that faces away is inert, so only the back's control is there
	await expect(card.locator('[data-tabletop-face="front"]')).toHaveAttribute(
		"inert",
		"",
	);
	await expect(control).toHaveCount(1);
	await control.click();
	await expect(shell).toHaveAttribute("data-side", "front");

	await card.hover({ position: { x: 60, y: 70 } });
	await page.keyboard.press("f");
	await expect(shell).toHaveAttribute("data-side", "back");
	await page.keyboard.press("f");
	await expect(shell).toHaveAttribute("data-side", "front");

	await card.click({ position: { x: 60, y: 70 } });
	await expect(card).toHaveAttribute("data-form", "cover");
});
