import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { internal } from "../convex/_generated/api";
import { createTestConvex } from "./support/convex";
import { startSession } from "./support/occurrences";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const hebrewNoun = { language: "he", family: "Lexeme", kind: "NOUN" } as const;
const germanNoun = { language: "de", family: "Lexeme", kind: "NOUN" } as const;

/** A failed Hebrew Sentence keeps its source language when a click retries it. */
async function failedHebrewSentence() {
	const t = createTestConvex();
	const segments = [{ kind: "ResolvableText", text: "שלום" }] as const;
	const { sentenceIds } = await t.mutation(
		internal.persistence.persistSubmittedScroll,
		{
			submissionKey: "he-resegmentation",
			targetLanguage: "he",
			sourceText: "שלום",
			sentences: [
				{
					segmentedSentenceId: "he-resegmentation:0",
					position: 0,
					paragraph: 0,
					language: "he",
					stitchedText: "שלום",
					segments: [...segments],
					units: [],
					segmentationFailed: true,
				},
			],
		},
	);
	const sentenceId = sentenceIds[0];
	if (!sentenceId) throw new Error("Expected a Hebrew Sentence.");
	const selection = {
		requestId: "he-retry",
		visitorId: "visitor-he",
		sentenceId,
		clickedSegmentIndex: 0,
	};
	const sessionGuard = await startSession(t, selection);
	const snapshot = () =>
		t.run(async (ctx) => ({
			sentence: await ctx.db.get(sentenceId),
			segments: await ctx.db.query("segments").collect(),
			sessions: await ctx.db.query("resolutionSessions").collect(),
		}));
	return { t, selection, sessionGuard, segments, snapshot };
}

test("retrying a Hebrew Sentence refuses a foreign-language unit without clearing its failure or changing source rows", async () => {
	const { t, selection, sessionGuard, segments, snapshot } =
		await failedHebrewSentence();
	const before = await snapshot();
	await expect(
		t.mutation(internal.persistence.storeResegmentedSentence, {
			...selection,
			sessionGuard,
			segments: [...segments],
			units: [{ segments: [0], route: germanNoun }],
		}),
	).rejects.toThrow("A resegmented unit must use the Sentence's language.");
	expect(await snapshot()).toEqual(before);
});

test("a Hebrew retry also refuses a foreign-language route variant atomically", async () => {
	const { t, selection, sessionGuard, segments, snapshot } =
		await failedHebrewSentence();
	const before = await snapshot();
	await expect(
		t.mutation(internal.persistence.storeResegmentedSentence, {
			...selection,
			sessionGuard,
			segments: [...segments],
			units: [
				{
					segments: [0],
					route: hebrewNoun,
					variants: [hebrewNoun, germanNoun],
				},
			],
		}),
	).rejects.toThrow("A resegmented unit must use the Sentence's language.");
	expect(await snapshot()).toEqual(before);
});

test("a Hebrew retry stores matching routes and keeps its clicked source row and session", async () => {
	const { t, selection, sessionGuard, segments, snapshot } =
		await failedHebrewSentence();
	const before = await snapshot();
	const units = [
		{ segments: [0], route: hebrewNoun, variants: [hebrewNoun] },
	];
	expect(
		await t.mutation(internal.persistence.storeResegmentedSentence, {
			...selection,
			sessionGuard,
			segments: [...segments],
			units,
		}),
	).toEqual({ clickedSegmentIndex: 0 });
	const after = await snapshot();
	expect(after.sentence?.language).toBe("he");
	expect(after.sentence?.units).toEqual(units);
	expect(after.sentence?.segmentationFailed).toBeUndefined();
	expect(after.segments).toEqual(before.segments);
	expect(after.sessions).toEqual(before.sessions);
});

test("a successful Hebrew retry may leave a unit Unresolved without inventing a language route", async () => {
	const { t, selection, sessionGuard, segments, snapshot } =
		await failedHebrewSentence();
	const units = [{ segments: [0], route: "Unresolved" as const }];
	await t.mutation(internal.persistence.storeResegmentedSentence, {
		...selection,
		sessionGuard,
		segments: [...segments],
		units,
	});
	const after = await snapshot();
	expect(after.sentence?.units).toEqual(units);
	expect(after.sentence?.segmentationFailed).toBeUndefined();
});
