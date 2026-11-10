import { expect, type Page, test } from "@playwright/test";
import { secondClocks, teleports } from "./support/continuity";
import { startFrameLog, stopFrameLog } from "./support/frames";
import {
	card,
	kept,
	leaps,
	markReading,
	open,
	reached,
	SURFACE,
	stackingHops,
	takenBack,
	turnedInFlight,
	word,
} from "./support/resolution";
import { inspector } from "./support/tabletop";

/**
 * Resolution (#1332): a click's Deck from the click to its commit, over a
 * fake Resolution Session. Proposed is held to its rules frame by frame,
 * with reduced motion off and on: the Deck only grows, nothing turns
 * before it has landed, no Card leaps, none hops in the stacking, and the
 * step hands over to its stored Note in the same element. Today is the
 * app's own flow on the same Session, and must keep playing.
 */

test.use({ viewport: { width: 1440, height: 900 } });

/** The furthest a Card may move in one frame: a turn and its growth at their fastest, with room. */
const STEP_LIMIT_PX = 40;

/** Clicks `text` and logs every frame until its Deck has settled after `phase`. */
async function play(page: Page, text: string, nth: number, phase: string) {
	await startFrameLog(page, { parts: false, max: 600 });
	await word(page, text, nth).click();
	await reached(page, phase);
	/* the last join waits out the turn, then the tween and the Blocks land */
	await page.waitForTimeout(1_200);
	return stopFrameLog(page);
}

for (const motion of ["no-preference", "reduce"] as const) {
	test.describe(`Proposed, reduced motion ${motion === "reduce" ? "on" : "off"}`, () => {
		test.beforeEach(async ({ page }) => {
			await page.emulateMedia({ reducedMotion: motion });
			await open(page, "proposed");
		});

		test("a click that deals all four Cards keeps every rule from the click to its commit", async ({
			page,
		}) => {
			const frames = await play(page, "Bank", 1, "Committed");
			const ids = Object.keys(frames.at(-1)?.bodies ?? {});
			expect(ids).toHaveLength(4);
			expect(takenBack(frames)).toEqual([]);
			expect(turnedInFlight(frames)).toEqual([]);
			expect(leaps(frames, STEP_LIMIT_PX)).toEqual([]);
			expect(stackingHops(frames)).toEqual([]);
			expect(teleports(frames, ids)).toEqual([]);
			expect(secondClocks(frames)).toEqual([]);
			await expect(card(page, "Reading")).toContainText("🏦");
			await expect(card(page, "Lemma")).toContainText("2 readings");
			await expect(card(page, "Surface")).toContainText("dative of");
			await expect(card(page, "Attestation")).toContainText(
				"zur = zu der",
			);
		});

		test("the front Card is dealt face down and busy, and turns up when its Knowledge lands, as the same element as its stored Note", async ({
			page,
		}) => {
			/* the slow Session leaves a third of a second between its Knowledge and its commit */
			await inspector(page)
				.getByRole("button", { name: "Slow", exact: true })
				.click();
			await word(page, "ging").click();
			const reading = card(page, "Reading");
			await expect(reading).toHaveAttribute("aria-busy", "true");
			await expect(reading).toContainText("ging");
			await reached(page, "Knowledge", 8_000);
			await expect(reading).not.toHaveAttribute("aria-busy", "true");
			await expect(page.locator(`${SURFACE} [role="status"]`)).toHaveText(
				"gehen is ready.",
			);
			await markReading(page);
			await reached(page, "Committed");
			await expect(card(page, "Surface")).toContainText("past of");
			expect(await kept(page)).toEqual({
				body: true,
				face: true,
				title: true,
			});
		});

		test("an answer inside the threshold deals the Deck face up, with no turn", async ({
			page,
		}) => {
			await inspector(page)
				.getByRole("button", { name: "Stored", exact: true })
				.click();
			const frames = await play(page, "Bahnhof", 0, "Stored");
			const sides = new Set(
				frames.flatMap((frame) =>
					Object.values(frame.bodies).map((body) => body.side),
				),
			);
			expect([...sides]).toEqual(["front"]);
			expect(Object.keys(frames.at(-1)?.bodies ?? {})).toHaveLength(3);
			expect(leaps(frames, STEP_LIMIT_PX)).toEqual([]);
		});

		test("a failed Session stays face down with its Retry, which resolves it", async ({
			page,
		}) => {
			await inspector(page)
				.getByRole("button", { name: "Failure", exact: true })
				.click();
			await word(page, "Hund").click();
			await reached(page, "Failed");
			const reading = card(page, "Reading");
			await expect(reading.getByRole("alert")).toHaveText(
				"Could not be resolved.",
			);
			await reading.getByRole("button", { name: "Retry" }).click();
			await reached(page, "Committed");
			await expect(reading).toContainText("🐕");
			await expect(reading.getByRole("alert")).toHaveCount(0);
		});

		test("a click on another word sweeps the Deck and deals its own; one on the same word deals nothing again", async ({
			page,
		}) => {
			await word(page, "Bahnhof").click();
			await expect(card(page, "Reading")).toContainText("zum Bahnhof");
			await word(page, "Hund").click();
			await reached(page, "Committed");
			await expect(card(page, "Reading")).toHaveCount(1);
			await expect(card(page, "Attestation")).toHaveCount(0);
			await markReading(page);
			await word(page, "Hund").click();
			await page.waitForTimeout(500);
			expect((await kept(page)).body).toBe(true);
		});
	});
}

test.describe("Today", () => {
	test("plays the app's own flow on the fake Session, to its stored Notes", async ({
		page,
	}) => {
		await open(page, "today");
		await word(page, "Bahnhof").click();
		const cards = page.locator(`${SURFACE} [data-form="card"]`);
		await expect(cards).toHaveCount(2);
		await reached(page, "Committed");
		await expect(cards).toHaveCount(3);
		await expect(cards.filter({ hasText: "dative of" })).toHaveCount(1);
		await expect(cards.filter({ hasText: "train station" })).toHaveCount(1);
	});
});
