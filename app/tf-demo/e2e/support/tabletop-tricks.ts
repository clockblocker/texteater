/// <reference lib="dom" />
import { expect, type Page } from "@playwright/test";
import { cutTricks, secondClocks, teleports, vanishes } from "./continuity";
import { type Frame, startFrameLog, stopFrameLog } from "./frames";
import { jumps } from "./invariants";
import { atRest, inspector } from "./tabletop";

/**
 * Deck tricks' buttons, pressed as a reader presses them, with every
 * Card's frames logged until the Deck rests again (#1322). Each button
 * queues its tricks behind whatever plays, as deck-of-cards' example does.
 */

const CARDS = "[data-tabletop] [data-tabletop-body]";

export const TRICKS = [
	"Intro",
	"Flip",
	"Shuffle",
	"By suit",
	"Fan",
	"Poker",
	"Sort",
] as const;

export type TrickButton = (typeof TRICKS)[number];

/**
 * Where the page runs: a plain browser, or T3's preview, which asks for
 * reduced motion while the entry's own Reduced motion knob stays off, so
 * the app's page-wide reduced-motion CSS is on and the Table still plays
 * every move.
 */
export type Setting = "browser" | "preview";

export async function openDeck(page: Page, setting: Setting = "browser") {
	if (setting === "preview")
		await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("/playground/deck-tricks");
	await expect(page.locator(CARDS)).toHaveCount(52);
	await settle(page);
}

export const press = (page: Page, name: TrickButton) =>
	inspector(page).getByRole("button", { name, exact: true }).click();

export async function settle(page: Page) {
	await expect
		.poll(() => atRest(page), { timeout: 20_000, intervals: [100] })
		.toBe(true);
}

/** A press of a trick button, or a wait of that many ms. */
export type Step = TrickButton | number;

/** Plays `steps` and logs every Card's frames until the Deck rests again. */
export async function logTricks(page: Page, steps: readonly Step[]) {
	const ids = await page
		.locator(CARDS)
		.evaluateAll((cards) =>
			cards.map(
				(card) => (card as HTMLElement).dataset.tabletopBody ?? "",
			),
		);
	await startFrameLog(page, { parts: false, max: 1800 });
	for (const step of steps)
		if (typeof step === "number") await page.waitForTimeout(step);
		else await press(page, step);
	await settle(page);
	await page.waitForTimeout(100);
	const frames: Frame[] = await stopFrameLog(page);
	return { frames, ids };
}

/**
 * Every frame invariant of a run of tricks at once, as one readable soft
 * failure: each step's pace (`jumps`, the stacking cut as the tricks cut
 * it), no teleport, no vanish, one clock, and each trick queued behind
 * the one before.
 */
export function expectTricks(
	frames: readonly Frame[],
	ids: readonly string[],
	label: string,
) {
	expect.soft(frames.length, `${label}: frames logged`).toBeGreaterThan(10);
	const broken = {
		jumps: jumps(frames, ids, { stackingCuts: true }).slice(0, 6),
		teleports: teleports(frames, ids).slice(0, 6),
		vanishes: vanishes(frames, ids).slice(0, 6),
		secondClocks: secondClocks(frames).slice(0, 6),
		cutTricks: cutTricks(frames, ids).slice(0, 6),
	};
	expect.soft(broken, label).toEqual({
		jumps: [],
		teleports: [],
		vanishes: [],
		secondClocks: [],
		cutTricks: [],
	});
}
