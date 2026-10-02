/// <reference lib="dom" />
import { expect, type Locator, type Page, test } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { api } from "../convex/_generated/api";

/*
 * One German Text through the live product flow: intake asks jev to cut each
 * Sentence into Segments and biggest units and stores them, the reader shows
 * the Sentences, hovering a word lights its whole unit without a network
 * call, and a click settles on the Unit Card. While click resolution is
 * rebuilt (#848) a click asks no model, so intake's jev calls are the run's
 * only spend.
 *
 * jev decides the units, so the probe checks the flow against whatever units
 * intake stored, and attaches them for a human to judge.
 */

// A separable verb (gibt … frei, fängt … an), a perfect with a modal
// (hat … warten müssen) and a Locution (zum Beispiel).
const sourceText =
	"Der dichte Rauch gibt die Sicht nicht frei. Sie hat lange warten müssen. Zum Beispiel fängt die Schule morgen an.";

type TextView = NonNullable<FunctionReturnType<typeof api.textViews.get>>;
type SentenceView = TextView["sentences"][number];

/** A stored unit as the reader groups it: its Sentence and member Segments. */
type StoredUnitView = {
	readonly sentence: number;
	readonly members: readonly number[];
	readonly words: readonly string[];
	readonly route: string;
};

function storedUnits(sentences: readonly SentenceView[]): StoredUnitView[] {
	return sentences.flatMap((sentence, position) => {
		const seen = new Set<string>();
		return sentence.segments.flatMap((segment) => {
			const unit = segment.unit;
			if (!unit) return [];
			const key = unit.segments.join(",");
			if (seen.has(key)) return [];
			seen.add(key);
			return [
				{
					sentence: position,
					members: unit.segments,
					words: unit.segments.map(
						(index) => sentence.segments[index]?.text ?? "?",
					),
					// As the Unit Card names it: a Family with one Kind once.
					route:
						unit.route === "Unresolved"
							? "Unresolved"
							: unit.route.family === unit.route.kind
								? unit.route.family
								: `${unit.route.family} · ${unit.route.kind}`,
				},
			];
		});
	});
}

/** Everything the page sends: HTTP requests and frames on any WebSocket, Convex's included. */
function recordTraffic(page: Page): string[] {
	const sent: string[] = [];
	page.on("request", (request) =>
		sent.push(`${request.method()} ${request.url()}`),
	);
	page.on("websocket", (socket) =>
		socket.on("framesent", ({ payload }) =>
			sent.push(`ws ${socket.url()} ${String(payload).slice(0, 200)}`),
		),
	);
	return sent;
}

/** Waits until the page has sent nothing for `quietMs`. */
async function settle(page: Page, sent: readonly string[], quietMs = 750) {
	let count = -1;
	await expect
		.poll(
			async () => {
				const stable = sent.length === count;
				count = sent.length;
				if (!stable) await page.waitForTimeout(quietMs);
				return stable;
			},
			{ timeout: 15_000, intervals: [0] },
		)
		.toBe(true);
}

/** The words in the reader that wear a rule now: previewed or selected. */
function underlinedWords(reader: Locator) {
	return reader
		.locator('[data-slot="reader-segment"]')
		.evaluateAll((elements) =>
			elements
				.filter((element) =>
					getComputedStyle(element).textDecorationLine.includes(
						"underline",
					),
				)
				.map((element) => element.textContent),
		);
}

test.use({ contextOptions: { reducedMotion: "reduce" } });

test("intake: live segment.inUnits, then the reader, hover and a click's Unit Card", async ({
	page,
}, testInfo) => {
	const runId = process.env.TF_DEMO_LIVE_RUN;
	const convexUrl = process.env.TF_DEMO_LIVE_CONVEX_URL;
	if (!runId || !convexUrl)
		throw new Error("Authorize with bun run test:pipeline:live first.");
	const client = new ConvexHttpClient(convexUrl);
	const visitorId = `live-pipeline:${runId}`;
	const browserErrors: string[] = [];
	page.on("pageerror", (error) => browserErrors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") browserErrors.push(message.text());
	});
	await page.addInitScript((id) => {
		localStorage.setItem(
			"tf-demo:anonymous-visitor:v1",
			JSON.stringify({ id }),
		);
	}, visitorId);

	const submitted = await client.action(api.orchestration.submitText, {
		submissionKey: `live-pipeline:${runId}:intake`,
		sourceText,
		visitorId,
	});
	if (submitted.status !== "Accepted") throw new Error(submitted.message);
	const text = await client.query(api.textViews.get, {
		textId: submitted.textId,
		visitorId,
	});
	if (!text) throw new Error("The accepted Text is not stored.");
	const units = storedUnits(text.sentences);
	await testInfo.attach("stored-units", {
		body: JSON.stringify(units, null, 2),
		contentType: "application/json",
	});

	// Intake stored every Sentence with units covering each word once.
	expect(text.sentences.map(({ stitchedText }) => stitchedText)).toEqual([
		"Der dichte Rauch gibt die Sicht nicht frei.",
		"Sie hat lange warten müssen.",
		"Zum Beispiel fängt die Schule morgen an.",
	]);
	for (const sentence of text.sentences)
		for (const segment of sentence.segments)
			if (segment.kind === "ResolvableText") {
				expect(segment.unit?.segments).toContain(segment.index);
				expect(segment.attestationId).toBeUndefined();
			}
	const multiSegment = units.filter(({ members }) => members.length > 1);
	expect(
		multiSegment.length,
		"jev must group some words into one unit",
	).toBeGreaterThan(0);

	const sent = recordTraffic(page);
	await page.goto("/");
	await page
		.getByRole("button", { name: /^Der dichte Rauch gibt die Sicht/ })
		.first()
		.click();
	const reader = page.locator('[data-slot="text-reader"]');
	const sentences = reader.locator("p.text-reader__sentence");
	await expect(sentences).toHaveText(
		text.sentences.map(({ stitchedText }) => stitchedText),
	);
	/** The reader's button for one stored ResolvableText Segment. */
	const word = (sentence: number, index: number) => {
		const view = text.sentences[sentence];
		const nth =
			view?.segments
				.filter(({ kind }) => kind === "ResolvableText")
				.findIndex((segment) => segment.index === index) ?? -1;
		if (nth < 0) throw new Error(`No word at ${sentence}:${index}.`);
		return sentences
			.nth(sentence)
			.locator('[data-slot="reader-segment"]')
			.nth(nth);
	};
	await expect.poll(() => underlinedWords(reader)).toEqual([]);
	await settle(page, sent);
	const beforeHover = sent.length;

	// Every member of every multi-Segment unit lights up exactly its unit.
	for (const unit of multiSegment)
		for (const member of unit.members) {
			await word(unit.sentence, member).hover();
			await expect
				.poll(() => underlinedWords(reader))
				.toEqual(unit.words);
		}
	const shown =
		multiSegment.find(({ words }) => words.includes("frei")) ??
		multiSegment[0];
	if (!shown) throw new Error("No multi-Segment unit to show.");
	await word(shown.sentence, shown.members.at(-1) ?? 0).hover();
	await expect.poll(() => underlinedWords(reader)).toEqual(shown.words);
	await page.screenshot({ path: testInfo.outputPath("hovered.png") });
	await page.mouse.move(2, 2);
	await expect.poll(() => underlinedWords(reader)).toEqual([]);
	await page.waitForTimeout(500);
	expect(sent.slice(beforeHover), "hover must make no network call").toEqual(
		[],
	);

	// A click selects the whole unit, and its deck settles on one Unit Card.
	await word(shown.sentence, shown.members.at(-1) ?? 0).click();
	await expect
		.poll(() =>
			sent
				.slice(beforeHover)
				.some((line) =>
					line.includes("resolutionSessions:selectSegment"),
				),
		)
		.toBe(true);
	const card = page.locator('[data-presentation-form="Card"]');
	await expect(card).toHaveCount(1);
	await expect(card.getByRole("heading", { level: 1 })).toContainText(
		shown.words[0] ?? "",
	);
	await expect(card.getByText(shown.route, { exact: true })).toBeVisible();
	await expect(card.getByRole("status")).toHaveText(
		"Readings are paused while click resolution is rebuilt.",
	);
	await expect(
		card.getByRole("button", { name: "Lift Unit Card", exact: true }),
	).toBeVisible();
	await expect(page.locator('[data-slot="note-skeleton"]')).toHaveCount(0);
	await expect.poll(() => underlinedWords(reader)).toEqual(shown.words);
	await page.screenshot({ path: testInfo.outputPath("unit-card.png") });
	expect(browserErrors).toEqual([]);
});
