/// <reference lib="dom" />
import { expect, type Page } from "@playwright/test";

/** What the Tabletop entry's spec reads off the page (#1317, #1321). */

export const BODY = "[data-tabletop-body]";

export const inspector = (page: Page) =>
	page.getByRole("complementary", { name: "Inspector" });

/** Every Card whose box is not its Slot's, rotation aside; [] when all rest. */
export function offSlot(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const off: string[] = [];
		for (const body of document.querySelectorAll<HTMLElement>(
			"[data-tabletop-body]",
		)) {
			const slot = document.querySelector(
				`[data-tabletop-slot="${body.dataset.slot}"]`,
			);
			const seat = body.closest<HTMLElement>("[data-tabletop-seat]");
			const id = body.dataset.tabletopBody;
			if (!slot || !seat) {
				off.push(`${id}: no Slot or seat`);
				continue;
			}
			const want = slot.getBoundingClientRect();
			const style = getComputedStyle(body);
			/* offset* is the layout box, untransformed: the seat on its Slot,
			   the Card filling it at its corner, the place a rotated Card rests */
			const got = {
				left: seat.offsetLeft + body.offsetLeft,
				top: seat.offsetTop + body.offsetTop,
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

/** Whether the Table has written nothing on any Card or seat: every move is over. */
export function atRest(page: Page): Promise<boolean> {
	return page.evaluate(() =>
		[
			...document.querySelectorAll(
				"[data-tabletop-body],[data-tabletop-seat]",
			),
		].every(
			(el) => !/--(fly|box|seat)-/.test(el.getAttribute("style") ?? ""),
		),
	);
}

export async function open(page: Page) {
	await page.goto("/playground/tabletop");
	await expect(page.locator(BODY)).toHaveCount(8);
	await expect.poll(() => atRest(page), { timeout: 5_000 }).toBe(true);
}

/** `id`'s tilt as CSS shows it, and how lit every Card's glares are. */
export function tiltOf(page: Page, id: string) {
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

export const choice = (page: Page, group: string, name: string) =>
	inspector(page)
		.getByRole("group", { name: group })
		.getByRole("button", { name, exact: true });

/** How many strongly red and strongly green pixels the page shows. */
export async function redAndGreen(
	page: Page,
	clip?: { x: number; y: number; width: number; height: number },
) {
	const png = (await page.screenshot({ clip })).toString("base64");
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

/** Records every side each Card's shell shows, with when, from now on. */
export function recordSides(page: Page) {
	return page.evaluate(() => {
		const seen: Record<string, { side: string; t: number }[]> = {};
		(window as unknown as { sides: typeof seen }).sides = seen;
		const note = () => {
			for (const shell of document.querySelectorAll(
				"[data-tabletop-shell]",
			)) {
				const id =
					shell.closest<HTMLElement>("[data-tabletop-body]")?.dataset
						.tabletopBody ?? "?";
				const list = seen[id] ?? [];
				seen[id] = list;
				const side = shell.getAttribute("data-side") ?? "";
				if (list.at(-1)?.side !== side)
					list.push({ side, t: performance.now() });
			}
		};
		new MutationObserver(note).observe(document.body, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ["data-side"],
		});
	});
}

export const sidesOf = (page: Page, id: string) =>
	page.evaluate(
		(id) =>
			(
				window as unknown as {
					sides: Record<string, { side: string; t: number }[]>;
				}
			).sides[id] ?? [],
		id,
	);

/**
 * One frame of a move: the Card's box with its transforms off, and its
 * Parts in it from its inline-start edge, which is where they hang from.
 */
type MoveFrame = {
	readonly t: number;
	readonly form: string;
	readonly box: { x: number; y: number; w: number; h: number };
	readonly parts: Readonly<Record<string, { x: number; y: number }>>;
};

/**
 * Starts recording Card `id` once its form next changes: every frame from
 * the one that paints the change, read in that frame after the Table has
 * written it, with the Card's and its Shell's transforms off so a lean
 * doesn't skew the read. `movedFrames` returns what it saw.
 */
export function recordFormChange(page: Page, id: string) {
	return page.evaluate((id) => {
		const el = document.querySelector<HTMLElement>(
			`[data-tabletop-body="${id}"]`,
		);
		if (!el) throw new Error(`no Card ${id}`);
		const style = document.createElement("style");
		style.textContent = `[data-e2e-neutral]{transform:none!important;rotate:none!important;scale:none!important}
[data-e2e-neutral] :is([data-tabletop-shell],[data-tabletop-face]){transform:none!important}`;
		document.head.append(style);
		const frames: MoveFrame[] = [];
		(window as unknown as { moved: MoveFrame[] }).moved = frames;
		const read = (t: number) => {
			el.toggleAttribute("data-e2e-neutral", true);
			const b = el.getBoundingClientRect();
			const parts: Record<string, { x: number; y: number }> = {};
			const rtl = getComputedStyle(el).direction === "rtl";
			for (const name of ["heading", "gloss", "context-0"]) {
				const part = el.querySelector(`[data-tabletop-part="${name}"]`);
				const r = part?.getBoundingClientRect();
				if (r)
					parts[name] = {
						x: rtl ? b.right - r.right : r.left - b.left,
						y: r.top - b.top,
					};
			}
			el.removeAttribute("data-e2e-neutral");
			frames.push({
				t,
				form: el.dataset.form ?? "",
				box: { x: b.left, y: b.top, w: b.width, h: b.height },
				parts,
			});
		};
		const tick = (t: number) => {
			read(t);
			if (frames.length < 100) requestAnimationFrame(tick);
		};
		const was = el.dataset.form;
		new MutationObserver((_, observer) => {
			if (el.dataset.form === was) return;
			observer.disconnect();
			requestAnimationFrame(tick);
		}).observe(el, { attributes: true, attributeFilter: ["data-form"] });
	}, id);
}

export function movedFrames(page: Page): Promise<MoveFrame[]> {
	return page.evaluate(
		() => (window as unknown as { moved: MoveFrame[] }).moved,
	);
}

/** How often `series` turns back by more than `eps` px. */
function reversals(series: readonly number[], eps = 0.05): number {
	let dir = 0;
	let count = 0;
	let run = 0;
	for (let i = 1; i < series.length; i++) {
		run += (series[i] ?? 0) - (series[i - 1] ?? 0);
		if (Math.abs(run) < eps) continue;
		if (dir !== 0 && Math.sign(run) !== dir) count++;
		dir = Math.sign(run);
		run = 0;
	}
	return count;
}

/**
 * #1311's rules for a change of form, judged on its frames toward the box
 * `to`: the box never passes `to` by more than 0.5 px; each Part keeps
 * within 1.5 px of where the box's progress puts it, never turning back in
 * it; and the frame that paints the change holds the box where it was,
 * the next moving it one frame's worth at most (one frame of the 380/38
 * morph is 4.3% of its way).
 */
export function expectOneClock(
	frames: readonly MoveFrame[],
	to: { x: number; y: number; width: number; height: number },
) {
	const [first, second] = frames;
	if (!first || !second) throw new Error("no frames");
	const edges = (box: MoveFrame["box"]) => ({
		left: box.x,
		top: box.y,
		right: box.x + box.w,
		bottom: box.y + box.h,
	});
	const start = edges(first.box);
	const end = edges({ x: to.x, y: to.y, w: to.width, h: to.height });
	for (const frame of frames) {
		const at = edges(frame.box);
		for (const key of ["left", "top", "right", "bottom"] as const) {
			const sign = Math.sign(end[key] - start[key]);
			expect(
				(at[key] - end[key]) * sign,
				`${key} past its Cover`,
			).toBeLessThanOrEqual(0.5);
		}
	}
	const progress = (frame: MoveFrame) =>
		(frame.box.h - first.box.h) / (to.height - first.box.h);
	expect(Math.abs(progress(first)), "the painted change holds").toBeLessThan(
		0.005,
	);
	expect(progress(second), "one frame's worth").toBeGreaterThan(0);
	expect(progress(second), "one frame's worth").toBeLessThan(0.065);
	const last = frames.at(-1);
	for (const name of Object.keys(first.parts)) {
		const from = first.parts[name];
		const land = last?.parts[name];
		if (!from || !land) continue;
		const path = frames.flatMap((frame) => {
			const at = frame.parts[name];
			return at ? [{ at, p: progress(frame) }] : [];
		});
		for (const { at, p } of path) {
			const drift = Math.hypot(
				at.x - (from.x + (land.x - from.x) * p),
				at.y - (from.y + (land.y - from.y) * p),
			);
			expect(drift, `${name} off the box's progress`).toBeLessThanOrEqual(
				1.5,
			);
		}
		expect(
			reversals(path.map(({ at }) => at.x)),
			`${name} turns back`,
		).toBe(0);
		expect(
			reversals(path.map(({ at }) => at.y)),
			`${name} turns back`,
		).toBe(0);
	}
}
