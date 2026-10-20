import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import type { Id } from "../convex/_generated/dataModel";
import { loadSourceContextPage } from "../convex/modules/notes/readingNote";
import { createTestConvex, submitText } from "./support/convex";
import {
	attest,
	bankLemma,
	encounter,
	insertReading,
} from "./support/presentation";

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

/* A Reading's Source Contexts, paged and filtered per Visitor. */

test("pages distinct Source Contexts newest-first with complete discontinuous members", async () => {
	const t = createTestConvex();
	const bank = await insertReading(t, {
		unitKind: "Reading",
		lemma: bankLemma,
		emojiDescription: "🏦",
	});
	const scrollA = await submitText(t, [
		["Die", " ", "Bank", "."],
		["Eine", " ", "andere", " ", "Bank", "."],
	]);
	const scrollB = await submitText(t, [
		["Heute", " ", "steht", " ", "etwas", " ", "dazwischen", "."],
	]);
	const others = await submitText(t, [
		["Bank"],
		["Bank"],
		["Bank"],
		["Bank"],
	]);
	const newest = await submitText(t, [
		["Bänke"],
		["Bänke"],
		["Bänke"],
		["Bänke"],
	]);
	const [sentenceOld, sentenceA] = scrollA.segmentIds;
	const [sentenceB] = scrollB.segmentIds;

	const oldId = await attest(t, bank, [sentenceOld?.[2]]);
	await encounter(t, "visitor-1", sentenceOld?.[2]);
	// Occurrences only another Visitor has met never take a page's place.
	for (const segments of others.segmentIds) {
		await attest(t, bank, [segments[0]]);
		await encounter(t, "visitor-2", segments[0]);
	}
	const newAId = await attest(t, bank, [sentenceA?.[4]]);
	await encounter(t, "visitor-1", sentenceA?.[4]);
	const newBId = await attest(t, bank, [sentenceB?.[6], sentenceB?.[2]]);
	// Meeting both members of one occurrence quotes it once.
	await encounter(t, "visitor-1", sentenceB?.[6]);
	await encounter(t, "visitor-1", sentenceB?.[2]);
	const newestIds: Id<"attestations">[] = [];
	for (const segments of newest.segmentIds) {
		newestIds.unshift(await attest(t, bank, [segments[0]]));
		await encounter(t, "visitor-1", segments[0]);
	}

	const first = await t.run((ctx) =>
		loadSourceContextPage(
			ctx,
			bank.readingId,
			bank.readingKey,
			"visitor-1",
		),
	);
	expect(first.page.map(({ attestationId }) => attestationId)).toEqual([
		...newestIds,
		newBId,
	]);
	const quotedB = first.page.at(-1);
	expect(quotedB?.scrollId).toBe(scrollB.scrollId);
	expect(quotedB?.memberSegmentIndices).toEqual([2, 6]);
	expect(quotedB?.memberTexts).toEqual(["steht", "dazwischen"]);
	expect(quotedB?.origin).toEqual({ kind: "Scroll" });
	// Go to source names the Scroll as the Library does: its opening line.
	expect(quotedB?.target).toEqual({
		kind: "Scroll",
		scrollId: scrollB.scrollId,
		focusAttestationId: newBId,
		title: "Heute steht etwas dazwischen.",
	});
	expect(first.isDone).toBe(false);

	const continuation = await t.run((ctx) =>
		loadSourceContextPage(
			ctx,
			bank.readingId,
			bank.readingKey,
			"visitor-1",
			first.continueCursor,
		),
	);
	expect(continuation.page.map(({ attestationId }) => attestationId)).toEqual(
		[newAId, oldId],
	);
	expect(continuation.page.map(({ scrollId }) => scrollId)).toEqual([
		scrollA.scrollId,
		scrollA.scrollId,
	]);
	expect(continuation.isDone).toBe(true);
});

test("a Visitor's first Source Context page holds their own occurrences however many others attest the Reading", async () => {
	const t = createTestConvex();
	const bank = await insertReading(t, {
		unitKind: "Reading",
		lemma: bankLemma,
		emojiDescription: "🏦",
	});
	const own = await submitText(t, [
		["Bank", "."],
		["Bank", "!"],
	]);
	const others = await submitText(
		t,
		Array.from({ length: 20 }, () => ["Bank"]),
	);
	const ownIds: Id<"attestations">[] = [];
	for (const segments of own.segmentIds) {
		ownIds.unshift(await attest(t, bank, [segments[0]]));
		await encounter(t, "visitor-1", segments[0]);
	}
	// Twenty newer occurrences of the same Reading only other Visitors met.
	for (const segments of others.segmentIds) {
		await attest(t, bank, [segments[0]]);
		await encounter(t, "visitor-2", segments[0]);
	}

	const first = await t.run((ctx) =>
		loadSourceContextPage(
			ctx,
			bank.readingId,
			bank.readingKey,
			"visitor-1",
		),
	);
	expect(first.page.map(({ attestationId }) => attestationId)).toEqual(
		ownIds,
	);
	expect(first.isDone).toBe(true);
});

test("Source Contexts include only occurrences encountered by this Visitor", async () => {
	const t = createTestConvex();
	const bank = await insertReading(t, {
		unitKind: "Reading",
		lemma: bankLemma,
		emojiDescription: "🏦",
	});
	const seen = await submitText(t, [["Die", " ", "Bank", " ", "da", "."]]);
	const other = await submitText(t, [["Eine", " ", "Bank", "."]]);
	const [seenSegments] = seen.segmentIds;
	const [otherSegments] = other.segmentIds;
	const seenId = await attest(t, bank, [
		seenSegments?.[2],
		seenSegments?.[4],
	]);
	await attest(t, bank, [otherSegments?.[2]]);
	// Meeting one member is enough to meet the whole occurrence.
	await encounter(t, "visitor-1", seenSegments?.[2]);
	await encounter(t, "visitor-2", otherSegments?.[2]);

	const result = await t.run((ctx) =>
		loadSourceContextPage(
			ctx,
			bank.readingId,
			bank.readingKey,
			"visitor-1",
		),
	);

	expect(result.page.map(({ attestationId }) => attestationId)).toEqual([
		seenId,
	]);
	expect(result.page[0]?.memberSegmentIndices).toEqual([2, 4]);
});
