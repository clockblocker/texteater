/// <reference lib="dom" />
import { expect, type Page } from "@playwright/test";
import { type Frame, startFrameLog, stopFrameLog } from "./frames";
import { atRest, choice, inspector } from "./tabletop";

/**
 * Every kind of move the Tabletop entry makes, driven as a reader would and
 * logged frame by frame (`frames.ts`) from just before it starts until a
 * few frames after everything rests, for the invariants in `invariants.ts`.
 */

export type Logged = {
	readonly frames: Frame[];
	/** The Bodies the move is judged on. */
	readonly ids: string[];
	/** Whether it plays deck-of-cards' scripted waypoints and stacking cuts. */
	readonly scripted: boolean;
	/** The frame an interrupted move turned back at. */
	readonly from?: number;
};

const body = (page: Page, id: string) =>
	page.locator(`[data-tabletop-body="${id}"]`);

async function box(page: Page, id: string) {
	const rect = await body(page, id).boundingBox();
	if (!rect) throw new Error(`no Card ${id}`);
	return rect;
}

function ids(page: Page): Promise<string[]> {
	return page
		.locator("[data-tabletop-body]")
		.evaluateAll((nodes) =>
			nodes.map(
				(node) => (node as HTMLElement).dataset.tabletopBody ?? "",
			),
		);
}

/** Waits until nothing moves, then logs a few frames more. */
async function settle(page: Page) {
	await expect.poll(() => atRest(page), { timeout: 8_000 }).toBe(true);
	await page.waitForTimeout(120);
}

/** Logs `act` from just before it until everything rests again. */
async function logged(
	page: Page,
	act: () => Promise<void>,
	scripted = false,
): Promise<Logged> {
	const all = await ids(page);
	await startFrameLog(page);
	await act();
	await settle(page);
	return { frames: await stopFrameLog(page), ids: all, scripted };
}

export async function setDirection(page: Page, dir: "LTR" | "RTL") {
	await choice(page, "Direction", dir).click();
	await page.mouse.move(2, 2);
	await settle(page);
}

/** The pointer rests on the Card's heading near its inline end, so it leans; then a tap opens it. */
export async function openFromHover(page: Page, id: string) {
	const rect = await box(page, id);
	const rtl = await page.evaluate(
		() =>
			document.querySelector("[data-tabletop]")?.getAttribute("dir") ===
			"rtl",
	);
	const at = {
		x: rect.x + rect.width * (rtl ? 0.15 : 0.85),
		y: rect.y + 14,
	};
	await page.mouse.move(at.x, at.y + 40, { steps: 2 });
	await page.mouse.move(at.x, at.y, { steps: 4 });
	await page.waitForTimeout(350);
	return logged(page, async () => {
		await page.mouse.down();
		await page.mouse.up();
		await expect(body(page, id)).toHaveAttribute("data-form", "cover");
	});
}

/**
 * The reader closes the Cover with its ×, and the pointer drifts on over
 * the shrinking Card, as it does in the recording that found these defects.
 */
export async function closeWithX(page: Page, id: string) {
	const close = body(page, id).getByRole("button", { name: "Close" });
	const x = await close.boundingBox();
	if (!x) throw new Error("no ×");
	const at = { x: x.x + x.width / 2, y: x.y + x.height / 2 };
	await page.mouse.move(at.x, at.y, { steps: 3 });
	await page.waitForTimeout(200);
	return logged(page, async () => {
		await page.mouse.down();
		await page.mouse.up();
		for (let step = 1; step <= 12; step++)
			await page.mouse.move(at.x - step * 6, at.y + step * 9);
		await expect(body(page, id)).toHaveAttribute("data-form", "card");
	});
}

/** A tap opens the Card and Escape closes it again before it lands. */
export async function closeMidOpen(page: Page, id: string): Promise<Logged> {
	const log = await logged(page, async () => {
		const rect = await box(page, id);
		await page.mouse.click(rect.x + rect.width / 2, rect.y + 12);
		await page.mouse.move(2, 2);
		await page.waitForTimeout(140);
		await page.keyboard.press("Escape");
		await expect(body(page, id)).toHaveAttribute("data-form", "card");
	});
	const opened = log.frames.findIndex(
		(frame) => frame.bodies[id]?.form === "cover",
	);
	const from = log.frames.findIndex(
		(frame, index) => index > opened && frame.bodies[id]?.form === "card",
	);
	return { ...log, from: Math.max(0, from) };
}

/** A fast drag past the scene's bottom edge throws the Card away. */
export function throwCard(page: Page, id: string) {
	return logged(page, async () => {
		const rect = await box(page, id);
		const from = { x: rect.x + rect.width / 2, y: rect.y + 12 };
		await page.mouse.move(from.x, from.y);
		await page.mouse.down();
		for (let step = 1; step <= 8; step++)
			await page.mouse.move(from.x, from.y + step * 45);
		await page.mouse.up();
		await page.mouse.move(2, 2);
		await expect(body(page, id)).toHaveCount(0, { timeout: 4_000 });
	});
}

/** The Card is carried onto the Pane and let go there, still. */
export function dropOnPane(page: Page, id: string) {
	return logged(page, async () => {
		const rect = await box(page, id);
		const pane = await page
			.locator('[data-tabletop-region="pane"]')
			.boundingBox();
		if (!pane) throw new Error("no Pane");
		const from = { x: rect.x + rect.width / 2, y: rect.y + 12 };
		const to = { x: pane.x + pane.width / 2, y: pane.y + pane.height / 2 };
		await page.mouse.move(from.x, from.y);
		await page.mouse.down();
		await page.mouse.move(to.x, to.y, { steps: 12 });
		await page.waitForTimeout(150);
		await page.mouse.up();
		await page.mouse.move(2, 2);
		await expect(body(page, id)).toHaveAttribute("data-slot", `pane:${id}`);
	});
}

/** One of the inspector's tricks, played to its end. */
export function trick(page: Page, name: "Fan" | "Shuffle" | "Deal" | "Sort") {
	return logged(
		page,
		async () => {
			await inspector(page)
				.getByRole("button", { name, exact: true })
				.click();
			await page.mouse.move(2, 2);
		},
		true,
	);
}

/** F turns the focused Card over. */
export function turn(page: Page, id: string) {
	return logged(page, async () => {
		await body(page, id).focus();
		await page.keyboard.press("f");
	});
}
