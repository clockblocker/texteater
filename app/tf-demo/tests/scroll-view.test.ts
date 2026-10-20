import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { api } from "../convex/_generated/api";
import {
	MAX_SOURCE_SENTENCES,
	MAX_SOURCE_TEXT_CHARACTERS,
} from "../server/textSubmissionLimits";
import { createTestConvex, submitText } from "./support/convex";
import {
	anrufenLemma,
	attest,
	bankLemma,
	encounter,
	insertReading,
} from "./support/presentation";

/* The Scroll view and Go to source's landing, as a Visitor reads them. */

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

test("a Scroll view preserves the stored submission identity for re-segmentation", async () => {
	const t = createTestConvex();
	const scrollId = await t.run((ctx) =>
		ctx.db.insert("scrolls", {
			submissionKey: "text:legacy-import",
			sourceText: "Die Banken.",
		}),
	);

	expect(
		await t.query(api.scrollViews.get, {
			scrollId,
			visitorId: "visitor-1",
		}),
	).toMatchObject({
		scrollId,
		submissionKey: "text:legacy-import",
		sourceText: "Die Banken.",
	});
});

test("Scroll projection shares current truth through Visitor Encounter history", async () => {
	const t = createTestConvex();
	const { scrollId, segmentIds } = await submitText(t, [
		["rufe", " ", "fehl", " ", "an", " ", "aktiv"],
	]);
	const [rufe, , fehl, , an, , aktiv] = segmentIds[0] ?? [];
	const anrufen = await insertReading(t, {
		unitKind: "Reading",
		lemma: anrufenLemma,
		emojiDescription: "📞",
	});
	await attest(t, anrufen, [rufe, an]);
	await t.run(async (ctx) => {
		if (!fehl || !aktiv) throw new Error("Expected stored Segments.");
		await ctx.db.patch(fehl, {
			resolutionState: { kind: "PermanentFailure" },
		});
		// Another Visitor's click is resolving this Segment right now.
		await ctx.db.patch(aktiv, {
			resolutionState: { kind: "Active", activeSessionCount: 1 },
		});
	});
	await encounter(t, "visitor-1", an);
	await encounter(t, "visitor-1", fehl);

	const result = await t.query(api.scrollViews.get, {
		scrollId,
		visitorId: "visitor-1",
	});
	const projected = Object.fromEntries(
		(result?.sentences[0]?.segments ?? []).map((segment) => [
			segment.text,
			segment,
		]),
	);

	expect(projected.rufe?.encountered).toBe(true);
	expect(projected.an?.encountered).toBe(true);
	expect(projected.fehl).toMatchObject({
		encountered: true,
		resolutionState: "PermanentFailure",
	});
	expect(projected.aktiv).toEqual({
		index: 6,
		kind: "ResolvableText",
		text: "aktiv",
		encountered: false,
		unit: { segments: [6], route: "Unresolved" },
	});
});

test("a maximum-length Scroll view reads Visitor Encounters once per Sentence, not once per Segment", async () => {
	// A Scroll at the submission limits: 25 Sentences of about 400 characters,
	// short words that make close to 4,000 Segments. Reading it may use 8
	// index ranges per Sentence, far below one per Segment.
	const t = createTestConvex({
		transactionLimits: { databaseQueries: 8 * MAX_SOURCE_SENTENCES },
	});
	const words = ["Haus", "Baum", "Tier", "Wege"];
	const sentences = Array.from({ length: MAX_SOURCE_SENTENCES }, () => [
		...Array.from({ length: 79 }, (_, index) => [
			...(index === 0 ? [] : [" "]),
			words[index % words.length] ?? "",
		]).flat(),
		".",
	]);
	const { scrollId, segmentIds } = await submitText(t, sentences);
	const sourceText = sentences.map((segments) => segments.join("")).join(" ");
	expect(sourceText.length).toBeLessThanOrEqual(MAX_SOURCE_TEXT_CHARACTERS);
	expect(segmentIds.flat().length).toBeGreaterThan(3_900);

	const haus = await insertReading(t, {
		unitKind: "Reading",
		lemma: { ...bankLemma, canonicalForm: "Haus" },
		emojiDescription: "🏠",
	});
	for (const segments of segmentIds) {
		await attest(t, haus, [segments[0]]);
		await encounter(t, "visitor-1", segments[0]);
	}

	const view = await t.query(api.scrollViews.get, {
		scrollId,
		visitorId: "visitor-1",
	});
	expect(view?.sentences).toHaveLength(MAX_SOURCE_SENTENCES);
	for (const sentence of view?.sentences ?? []) {
		expect(
			sentence.segments.filter(({ encountered }) => encountered),
		).toEqual([expect.objectContaining({ text: "Haus", gender: "Fem" })]);
	}
});

test("focused occurrence validates Scroll ownership and never substitutes stale coordinates", async () => {
	const t = createTestConvex();
	const bank = await insertReading(t, {
		unitKind: "Reading",
		lemma: bankLemma,
		emojiDescription: "🏦",
	});
	const scrollA = await submitText(t, [
		["Die", " ", "Bank", " ", "steht", " ", "da", "."],
	]);
	const scrollB = await submitText(t, [["Eine", " ", "Bank", "."]]);
	const [sentenceA] = scrollA.segmentIds;
	const [sentenceB] = scrollB.segmentIds;
	const validId = await attest(t, bank, [sentenceA?.[6], sentenceA?.[2]]);
	const wrongScrollId = await attest(t, bank, [sentenceB?.[2]]);
	const staleId = await attest(t, bank, [sentenceA?.[4]]);
	await t.run((ctx) => ctx.db.delete(staleId));
	const focus = (attestationId: string) =>
		t.query(api.scrollViews.occurrenceFocus, {
			scrollId: scrollA.scrollId,
			attestationId,
		});

	expect(await focus(validId)).toEqual({
		kind: "Occurrence",
		attestationId: validId,
		sentenceId: scrollA.sentenceIds[0],
		position: 0,
		memberSegmentIndices: [2, 6],
	});
	expect(await focus(wrongScrollId)).toEqual({
		kind: "Missing",
		requestedAttestationId: wrongScrollId,
	});
	expect(await focus(staleId)).toEqual({
		kind: "Missing",
		requestedAttestationId: staleId,
	});
	expect(await focus("malformed")).toEqual({
		kind: "Missing",
		requestedAttestationId: "malformed",
	});
});
