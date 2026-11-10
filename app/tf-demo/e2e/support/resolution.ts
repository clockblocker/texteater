/// <reference lib="dom" />
import { expect, type Page } from "@playwright/test";
import type { Frame } from "./frames";

/**
 * The Resolution entry (#1332): a click's Deck over a fake Resolution
 * Session. What a spec does to it, and what Proposed's frames are held to.
 */

export const SURFACE = "[data-resolution-surface]";

export async function open(page: Page, variant: "today" | "proposed") {
	await page.goto(`/playground/resolution/${variant}`);
	await expect(word(page, "Hund")).toBeVisible();
}

/** The `nth` word spelled `text` in the text. */
export function word(page: Page, text: string, nth = 0) {
	return page
		.locator(`${SURFACE} [data-slot="reader-segment"]`)
		.filter({ hasText: new RegExp(`^${text}$`) })
		.nth(nth);
}

/** Resolves once the fake Session has reached `phase`. */
export function reached(page: Page, phase: string, timeout = 5_000) {
	return expect(page.locator(SURFACE)).toHaveAttribute(
		"data-session-phase",
		phase,
		{ timeout },
	);
}

/** A Card of Proposed's Deck, by its role. */
export const card = (page: Page, role: string) =>
	page.locator(`[data-deck-card="${role}"]`);

/** The Bodies a frame shows: those the reader can see at all. */
function shownIds(frame: Frame): string[] {
	return Object.entries(frame.bodies)
		.filter(([, body]) => body.opacity > 0.05)
		.map(([id]) => id);
}

/** The Deck only grows: a Card once seen is in every later frame. */
export function takenBack(frames: readonly Frame[]): string[] {
	const found: string[] = [];
	const seen = new Set<string>();
	frames.forEach((frame, index) => {
		for (const id of seen)
			if (!frame.bodies[id])
				found.push(`${id} is gone in frame ${index}`);
		for (const id of shownIds(frame)) seen.add(id);
	});
	return found;
}

/**
 * Nothing turns before it has landed: in the frame before a Body first
 * leaves its dealt side, it stood on its seat, opaque.
 */
export function turnedInFlight(frames: readonly Frame[]): string[] {
	const found: string[] = [];
	const ids = new Set(frames.flatMap((frame) => Object.keys(frame.bodies)));
	for (const id of ids) {
		const first = frames.findIndex((frame) => frame.bodies[id]);
		const dealt = frames[first]?.bodies[id]?.side;
		const turns = frames.findIndex(
			(frame, index) => index > first && frame.bodies[id]?.side !== dealt,
		);
		const before = frames[turns - 1]?.bodies[id];
		if (turns === -1 || !before) continue;
		if (before.offset > 1 || before.opacity < 0.99)
			found.push(
				`${id} turned ${before.offset} px off its seat at opacity ${before.opacity} (frame ${turns})`,
			);
	}
	return found;
}

/** Below this opacity a Card is all but unseen: a reduced dissolve switches its place there. */
const SEEN = 0.25;

/**
 * No Card the reader can see moves further than `limit` px in one frame,
 * by its centre or by an edge. A frame that came late is allowed as many
 * frames' worth.
 */
export function leaps(frames: readonly Frame[], limit: number): string[] {
	const found: string[] = [];
	for (let i = 1; i < frames.length; i++) {
		const [was, now] = [frames[i - 1], frames[i]];
		if (!was || !now) continue;
		const late = Math.max(1, (now.t - was.t) / (1000 / 60));
		for (const [id, body] of Object.entries(now.bodies)) {
			const before = was.bodies[id];
			if (!before || before.opacity < SEEN || body.opacity < SEEN)
				continue;
			const step = Math.max(
				Math.hypot(body.cx - before.cx, body.cy - before.cy),
				Math.abs(body.h - before.h) / 2,
			);
			if (step > limit * late)
				found.push(
					`${id} moved ${Math.round(step)} px in frame ${i} (${Math.round(now.t - was.t)} ms)`,
				);
		}
	}
	return found;
}

/** No stacking hop: every Card is drawn at one stacking order, its Place's, in every frame. */
export function stackingHops(frames: readonly Frame[]): string[] {
	const found: string[] = [];
	const drawn = new Map<string, number>();
	frames.forEach((frame, index) => {
		for (const [id, body] of Object.entries(frame.bodies)) {
			if (body.mode === "unmoored") continue;
			const was = drawn.get(id);
			if (was !== undefined && was !== body.z)
				found.push(
					`${id} went from z ${was} to ${body.z} (frame ${index})`,
				);
			if (body.z !== body.restZ * 2)
				found.push(
					`${id} is drawn at z ${body.z}, its Place says ${body.restZ} (frame ${index})`,
				);
			drawn.set(id, body.z);
		}
	});
	return [...new Set(found)].slice(0, 8);
}

/**
 * Marks the Reading Card's own elements: its Body, its face and its
 * Heading's title. `kept` says which of them are still in the page.
 */
export async function markReading(page: Page) {
	await card(page, "Reading").evaluate((body) => {
		const marked = {
			body,
			face: body.querySelector('[data-tabletop-face="front"]'),
			title: body.querySelector(
				'[data-tabletop-face="front"] [data-slot="note-title"]',
			),
		};
		(window as unknown as { __marked?: typeof marked }).__marked = marked;
	});
}

export function kept(page: Page): Promise<Record<string, boolean>> {
	return page.evaluate(() => {
		const marked =
			(window as unknown as { __marked?: Record<string, Element | null> })
				.__marked ?? {};
		const now = document.querySelector('[data-deck-card="Reading"]');
		return {
			body: marked.body === now,
			face:
				!!marked.face &&
				marked.face ===
					now?.querySelector('[data-tabletop-face="front"]'),
			title:
				!!marked.title &&
				marked.title ===
					now?.querySelector(
						'[data-tabletop-face="front"] [data-slot="note-title"]',
					),
		};
	});
}
