import { expect, test } from "bun:test";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { structuralShadowLocatorKey } from "../convex/model/shadows";
import { projectFeaturesForPresentation as projectFeatures } from "../convex/modules/notes/featurePresentation";
import {
	projectReadingKnowledge,
	projectReadingValue,
} from "../convex/modules/notes/projections";
import { loadSourceContextPage } from "../convex/modules/notes/readingNote";
import { projectResolvedRelationTargets } from "../convex/modules/notes/relations";
import { isUnitReadingFamily } from "../convex/modules/notes/unitReadingFamilies";
import { get as getReadingNote } from "../convex/readingNotes";
import { get as getTextView, occurrenceFocus } from "../convex/textViews";
import {
	lemmaIdentityKey,
	readingIdentityKey as readingFingerprint,
} from "../server/linguisticIdentity";
import { DEFAULT_KNOWLEDGE_SETTINGS } from "../shared/knowledge-preferences";
import {
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";

type ReadingValue = Parameters<typeof readingFingerprint>[0];

const bankLemma = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem", hyph: null },
} as const;

const anrufenLemma = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "VERB",
	canonicalForm: "anrufen",
	coreFeatures: {
		hasSepPrefix: "an",
		lexicallyReflexive: null,
		verbType: null,
	},
} as const;

/** Stores a Lemma, one Surface of it, and one Reading, keyed as production keys them. */
async function insertReading(t: TestConvexDb, reading: ReadingValue) {
	const { lemma, emojiDescription } = reading;
	const readingKey = readingFingerprint(reading);
	return t.run(async (ctx) => {
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: lemmaIdentityKey(lemma),
			language: lemma.language,
			family: lemma.family,
			kind: lemma.kind,
			canonicalForm: lemma.canonicalForm,
			coreFeatures: lemma.coreFeatures,
		});
		const readingId = await ctx.db.insert("readings", {
			readingKey,
			lemmaId,
			emojiDescription,
		});
		const surfaceId = await ctx.db.insert("surfaces", {
			surfaceKey: `surface:${readingKey}`,
			lemmaId,
			language: lemma.language,
			normalizedSurface: lemma.canonicalForm,
			spelling: "Canonical",
			surfaceFeatures: {},
		});
		return { lemmaId, readingId, readingKey, surfaceId };
	});
}

/** Commits one occurrence: an Attestation owning the given member Segments. */
function attest(
	t: TestConvexDb,
	owner: {
		readonly readingId: Id<"readings">;
		readonly surfaceId: Id<"surfaces">;
	},
	memberSegmentIds: readonly (Id<"segments"> | undefined)[],
) {
	return t.run(async (ctx) => {
		const attestationId = await ctx.db.insert("attestations", {
			surfaceId: owner.surfaceId,
			readingId: owner.readingId,
			realizationCoverage: "Full",
		});
		for (const segmentId of memberSegmentIds) {
			if (!segmentId) throw new Error("Expected a member Segment.");
			await ctx.db.patch(segmentId, {
				attestationMembership: {
					attestationId,
					orthography: "Standard",
				},
			});
		}
		return attestationId;
	});
}

/** Records that a Visitor clicked one Segment. */
function encounter(
	t: TestConvexDb,
	visitorId: string,
	segmentId: Id<"segments"> | undefined,
) {
	if (!segmentId) throw new Error("Expected an encountered Segment.");
	return t.run((ctx) =>
		ctx.db.insert("visitorClicks", {
			requestId: `click:${visitorId}:${segmentId}`,
			visitorId,
			segmentId,
			clickedAt: 1,
		}),
	);
}

test("a Text view preserves the stored submission identity for re-segmentation", async () => {
	const t = createTestConvex();
	const textId = await t.run((ctx) =>
		ctx.db.insert("texts", {
			submissionKey: "text:legacy-import",
			sourceText: "Die Banken.",
		}),
	);

	expect(
		await t.query(api.textViews.get, { textId, visitorId: "visitor-1" }),
	).toMatchObject({
		textId,
		submissionKey: "text:legacy-import",
		sourceText: "Die Banken.",
	});
});

test("projects Dumling feature values for learner inspection", () => {
	expect(projectFeatures({ gender: "Fem", hyph: null })).toEqual([
		{ name: "gender", value: "Fem" },
		{ name: "hyph", value: "—" },
	]);
});

test("projects foundational Reading and unfiltered Knowledge without display sentinels", () => {
	const reading = projectReadingValue(
		{ emojiDescription: "🏃" },
		{
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "VERB",
			canonicalForm: "aufpassen",
			coreFeatures: {
				hasSepPrefix: "auf",
				lexicallyReflexive: null,
				verbType: null,
			},
		},
	);
	const knowledge = projectReadingKnowledge(reading, {
		transcription: "  aʊ̯fˌpasn̩  ",
		definition: "  aufmerksam sein  ",
		translations: { en: ["pay attention"] },
	});

	expect(reading.lemma.coreFeatures).toEqual({
		hasSepPrefix: "auf",
		lexicallyReflexive: null,
		verbType: null,
	});
	expect(knowledge).toEqual({
		transcription: "aʊ̯fˌpasn̩",
		definition: "aufmerksam sein",
		translations: { en: ["pay attention"] },
	});
});

test("Unit Reading NoteData ignores visitor settings and keeps all pure data", async () => {
	const t = createTestConvex();
	const sourceLemma = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "aufpassen",
		coreFeatures: {
			hasSepPrefix: "auf",
			lexicallyReflexive: null,
			verbType: null,
		},
	} as const;
	const targetLemma = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Aufmerksamkeit",
		coreFeatures: { gender: "Fem", hyph: null },
	} as const;
	const source = await insertReading(t, {
		unitKind: "Reading",
		lemma: sourceLemma,
		emojiDescription: "🏃",
	});
	const target = await insertReading(t, {
		unitKind: "Reading",
		lemma: targetLemma,
		emojiDescription: "👀",
	});
	const everythingOff = JSON.parse(
		JSON.stringify(DEFAULT_KNOWLEDGE_SETTINGS).replaceAll("true", "false"),
	);
	await t.run(async (ctx) => {
		for (const { lemmaId } of [source, target]) {
			await ctx.db.insert("dictionaryLemmas", { lemmaId });
		}
		await ctx.db.insert("readingEntries", {
			readingId: source.readingId,
			record: { attestedTranslations: [], notes: "" },
		});
		await ctx.db.insert("accumulatedKnowledge", {
			ownerReadingKey: source.readingKey,
			knowledge: {
				transcription: "aʊ̯fˌpasn̩",
				definition: "aufmerksam sein",
				translations: { en: ["pay attention"] },
			},
			status: "Full",
			updatedAt: 42,
		});
		await ctx.db.insert("semanticRelationEdges", {
			sourceReadingId: source.readingId,
			targetLemmaId: target.lemmaId,
			relation: "synonym",
		});
		const shadowId = await ctx.db.insert("shadows", {
			shadowKey: JSON.stringify(["de", "Merkmal", "Lexeme", "NOUN"]),
			language: "de",
			canonicalForm: "Merkmal",
			family: "Lexeme",
			kind: "NOUN",
		});
		await ctx.db.insert("structuralShadowReferences", {
			shadowId,
			ownerReadingKey: source.readingKey,
			aspect: "morphologicalTree",
			path: "root.0",
			locatorKey: structuralShadowLocatorKey(
				source.readingKey,
				"morphologicalTree",
				"root.0",
			),
		});
		// A Visitor who hid every Knowledge aspect still receives pure NoteData.
		await ctx.db.insert("knowledgeSettings", {
			visitorId: "visitor-1",
			settings: everythingOff,
			updatedAt: 1,
		});
	});

	const note = await t.query(api.readingNotes.get, {
		readingId: source.readingId,
		visitorId: "visitor-1",
	});

	if (!note) throw new Error("Expected a Reading Note.");
	expect(note.kind).toBe("Reading");
	expect(note.reading.lemma.coreFeatures).toEqual(sourceLemma.coreFeatures);
	expect(note.knowledge).toMatchObject({
		transcription: "aʊ̯fˌpasn̩",
		definition: "aufmerksam sein",
		translations: { en: ["pay attention"] },
		semanticRelations: {
			synonym: [
				{
					unitKind: "Lemma",
					language: targetLemma.language,
					family: targetLemma.family,
					kind: targetLemma.kind,
					canonicalForm: targetLemma.canonicalForm,
					coreFeatures: targetLemma.coreFeatures,
				},
			],
		},
	});
	expect(note.relations).toHaveLength(1);
	expect(note.structuralReferences).toHaveLength(1);
});

test("projects stored semantic endpoints as Lemma Route Note targets", () => {
	const relations = [
		{
			relation: "hypernym" as const,
			targetLemmaKey: "stored-lemma-key",
			targetCanonicalForm: "Institut",
		},
		{
			relation: "antonym" as const,
			targetLemmaKey: "construction-lemma-key",
			targetCanonicalForm: "Sparkasse",
		},
		{
			relation: "synonym" as const,
			targetLemmaKey: "dangling-lemma-key",
			targetCanonicalForm: "Geldinstitut",
		},
	];

	expect(
		projectResolvedRelationTargets(relations, [
			{
				lemmaKey: "stored-lemma-key",
				lemmaId: "lemma_123",
			},
			{
				lemmaKey: "construction-lemma-key",
				lemmaId: "lemma_456",
			},
		]),
	).toEqual([
		{
			relation: "hypernym",
			targetCanonicalForm: "Institut",
			target: {
				kind: "Lemma",
				lemmaId: "lemma_123",
			},
		},
		{
			relation: "antonym",
			targetCanonicalForm: "Sparkasse",
			target: {
				kind: "Lemma",
				lemmaId: "lemma_456",
			},
		},
	]);
});

test("note and text queries expose target-specific interfaces", () => {
	const textArgs = getTextView.exportArgs();
	const textReturns = getTextView.exportReturns();
	const focusArgs = occurrenceFocus.exportArgs();
	const focusReturns = occurrenceFocus.exportReturns();
	const noteArgs = getReadingNote.exportArgs();
	const noteReturns = getReadingNote.exportReturns();

	expect(textArgs).toContain('"textId"');
	expect(textArgs).not.toContain('"focusAttestationId"');
	expect(textArgs).not.toContain('"target"');
	expect(focusArgs).toContain('"textId"');
	expect(focusArgs).toContain('"attestationId"');
	expect(noteArgs).toContain('"readingId"');
	expect(noteArgs).toContain('"contextCursor"');
	expect(noteArgs).toContain('"visitorId"');
	expect(noteArgs).not.toContain('"value":"RouteNote"');
	expect(noteArgs).not.toContain('"value":"ShadowNote"');
	expect(noteReturns).toContain('"tableName":"readings"');
	expect(noteReturns).toContain('"tableName":"attestations"');
	expect(noteReturns).toContain('"sentenceSnippet"');
	expect(noteReturns).not.toContain("targetReadingKey");
	expect(noteReturns).toContain('"value":"Lemma"');
	// Landing on an occurrence never changes the Text query's shape.
	expect(textReturns).not.toContain('"value":"Occurrence"');
	expect(focusReturns).toContain('"value":"Missing"');
	expect(focusReturns).toContain('"value":"Occurrence"');
});

test("Text projection shares current truth through Visitor Encounter history", async () => {
	const t = createTestConvex();
	const { textId, segmentIds } = await submitText(t, [
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

	const result = await t.query(api.textViews.get, {
		textId,
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
	});
});

test("only learner-facing Unit families can open Unit Reading Notes", () => {
	expect(["Lexeme", "Phraseme", "Morpheme"].every(isUnitReadingFamily)).toBe(
		true,
	);
	expect(isUnitReadingFamily("Construction")).toBe(false);
});

test("malformed routed IDs return not-found", async () => {
	const t = createTestConvex();

	expect(
		await t.query(api.readingNotes.get, {
			readingId: "malformed id",
			visitorId: "visitor-1",
		}),
	).toBeNull();
	expect(
		await t.query(api.textViews.get, {
			textId: "malformed id",
			visitorId: "visitor-1",
		}),
	).toBeNull();
});

test("deleted routed records return the same defined not-found result", async () => {
	const t = createTestConvex();
	const { readingId } = await insertReading(t, {
		unitKind: "Reading",
		lemma: bankLemma,
		emojiDescription: "🏦",
	});
	const { textId } = await submitText(t, [["Banken"]]);
	await t.run(async (ctx) => {
		await ctx.db.delete(readingId);
		await ctx.db.delete(textId);
	});

	expect(
		await t.query(api.readingNotes.get, {
			readingId,
			visitorId: "visitor-1",
		}),
	).toBeNull();
	expect(
		await t.query(api.textViews.get, { textId, visitorId: "visitor-1" }),
	).toBeNull();
});

test("pages distinct Source Contexts newest-first with complete discontinuous members", async () => {
	const t = createTestConvex();
	const bank = await insertReading(t, {
		unitKind: "Reading",
		lemma: bankLemma,
		emojiDescription: "🏦",
	});
	const textA = await submitText(t, [
		["Die", " ", "Bank", "."],
		["Eine", " ", "andere", " ", "Bank", "."],
	]);
	const textB = await submitText(t, [
		["Heute", " ", "steht", " ", "etwas", " ", "dazwischen", "."],
	]);
	const others = await submitText(t, [
		["Bank"],
		["Bank"],
		["Bank"],
		["Bank"],
	]);
	const [sentenceOld, sentenceA] = textA.segmentIds;
	const [sentenceB] = textB.segmentIds;

	const oldId = await attest(t, bank, [sentenceOld?.[2]]);
	await encounter(t, "visitor-1", sentenceOld?.[2]);
	// Newer occurrences only another Visitor has met fill the first page.
	for (const segments of others.segmentIds) {
		await attest(t, bank, [segments[0]]);
		await encounter(t, "visitor-2", segments[0]);
	}
	const newAId = await attest(t, bank, [sentenceA?.[4]]);
	await encounter(t, "visitor-1", sentenceA?.[4]);
	const newBId = await attest(t, bank, [sentenceB?.[6], sentenceB?.[2]]);
	await encounter(t, "visitor-1", sentenceB?.[6]);

	const first = await t.run((ctx) =>
		loadSourceContextPage(
			ctx,
			bank.readingId,
			bank.readingKey,
			"visitor-1",
		),
	);
	expect(first.page.map(({ attestationId }) => attestationId)).toEqual([
		newBId,
		newAId,
	]);
	expect(first.page.map(({ textId }) => textId)).toEqual([
		textB.textId,
		textA.textId,
	]);
	expect(first.page[0]?.memberSegmentIndices).toEqual([2, 6]);
	expect(first.page[0]?.memberTexts).toEqual(["steht", "dazwischen"]);
	expect(first.page[0]?.origin).toEqual({ kind: "Text" });
	expect(first.page[0]?.target).toEqual({
		kind: "Text",
		textId: textB.textId,
		focusAttestationId: newBId,
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
		[oldId],
	);
	expect(continuation.isDone).toBe(true);
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

test("focused occurrence validates Text ownership and never substitutes stale coordinates", async () => {
	const t = createTestConvex();
	const bank = await insertReading(t, {
		unitKind: "Reading",
		lemma: bankLemma,
		emojiDescription: "🏦",
	});
	const textA = await submitText(t, [
		["Die", " ", "Bank", " ", "steht", " ", "da", "."],
	]);
	const textB = await submitText(t, [["Eine", " ", "Bank", "."]]);
	const [sentenceA] = textA.segmentIds;
	const [sentenceB] = textB.segmentIds;
	const validId = await attest(t, bank, [sentenceA?.[6], sentenceA?.[2]]);
	const wrongTextId = await attest(t, bank, [sentenceB?.[2]]);
	const staleId = await attest(t, bank, [sentenceA?.[4]]);
	await t.run((ctx) => ctx.db.delete(staleId));
	const focus = (attestationId: string) =>
		t.query(api.textViews.occurrenceFocus, {
			textId: textA.textId,
			attestationId,
		});

	expect(await focus(validId)).toEqual({
		kind: "Occurrence",
		attestationId: validId,
		sentenceId: textA.sentenceIds[0],
		memberSegmentIndices: [2, 6],
	});
	expect(await focus(wrongTextId)).toEqual({
		kind: "Missing",
		requestedAttestationId: wrongTextId,
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
