import { afterEach, beforeEach, expect, jest, spyOn, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { api, internal } from "../convex/_generated/api";
import { RELATION_PUBLICATION_FINGERPRINTS } from "../convex/model/generatedKnowledgeContainment";
import { asksSource } from "../server/knowledgeSource";
import {
	emojiDescriptionOf,
	foldedCanonicalForm,
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import {
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

const KOCHEN = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "VERB",
	canonicalForm: "kochen",
	coreFeatures: {
		hasSepPrefix: null,
		lexicallyReflexive: null,
	},
} as const satisfies Dumling.Lemma<"de">;
const KOCHEN_READING = {
	unitKind: "Reading",
	lemma: KOCHEN,
	emojiDescription: "🍲",
} as const satisfies Dumling.Reading<"de">;
const GEKOCHT_READING = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADJ",
		canonicalForm: "gekocht",
		coreFeatures: {
			comparable: null,
		},
	},
	emojiDescription: "🥔",
} as const satisfies Dumling.Reading<"de">;
const KOCHEN_SOURCE = { target: KOCHEN, meaning: "Verbal" } as const;
const SOURCE_CHANGE = {
	kind: "Contribute",
	aspect: "source",
	value: KOCHEN_SOURCE,
} as const;

test("only a base run of a Reading whose route requests a Source and that stores none asks for one (ADR 0050)", () => {
	expect(
		asksSource(GEKOCHT_READING, {
			topUpOnly: false,
			knowledge: {},
		}),
	).toBe(true);
	expect(
		asksSource(GEKOCHT_READING, {
			topUpOnly: true,
			knowledge: {},
		}),
	).toBe(false);
	expect(
		asksSource(GEKOCHT_READING, {
			topUpOnly: false,
			knowledge: { source: KOCHEN_SOURCE },
		}),
	).toBe(false);
	// A verb may be a conversion of a noun (`fischen` from `Fisch`).
	expect(
		asksSource(KOCHEN_READING, {
			topUpOnly: false,
			knowledge: {},
		}),
	).toBe(true);
	expect(
		asksSource(
			{
				lemma: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "ADV",
					canonicalForm: "gern",
					coreFeatures: { comparable: "Yes" },
				},
			},
			{ topUpOnly: false, knowledge: {} },
		),
	).toBe(false);
});

/** One running Knowledge attempt for a stored, encountered `gekocht`. */
async function seedAdjective(t: TestConvexDb, visitorId: string) {
	const { segmentIds } = await submitText(t, [
		["Die", " ", "gekochten", " ", "Kartoffeln", "."],
	]);
	const segmentId = segmentIds[0]?.[2];
	if (!segmentId) throw new Error("Expected a Segment.");
	const readingKey = readingIdentityKey(GEKOCHT_READING);
	return t.run(async (ctx) => {
		const lemma = GEKOCHT_READING.lemma;
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: lemmaIdentityKey(lemma),
			language: "de",
			family: lemma.family,
			kind: lemma.kind,
			canonicalForm: lemma.canonicalForm,
			foldedCanonicalForm: foldedCanonicalForm(lemma),
			coreFeatures: lemma.coreFeatures,
		});
		const readingId = await ctx.db.insert("readings", {
			readingKey,
			lemmaId,
			emojiDescription: GEKOCHT_READING.emojiDescription,
		});
		await ctx.db.insert("dictionaryLemmas", { lemmaId });
		await ctx.db.insert("readingEntries", {
			readingId,
			record: { attestedTranslations: [], attestations: [], notes: "" },
		});
		const surfaceId = await ctx.db.insert("surfaces", {
			surfaceKey: `surface:${readingKey}`,
			lemmaId,
			language: "de",
			normalizedSurface: "gekochten",
			inflectionalFeatures: null,
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
		});
		const attestationId = await ctx.db.insert("attestations", {
			surfaceId,
			readingId,
			realizationCoverage: "Full",
			articleEvidence: null,
			valencyEvidence: [],
		});
		await ctx.db.patch(segmentId, {
			attestationMembership: { attestationId, orthography: "Standard" },
		});
		await ctx.db.insert("knowledgeGenerationAttempts", {
			attemptKey: "participle",
			visitorId,
			ownerReadingKey: readingKey,
			readingId,
			attestationId,
			state: "Running",
			runNumber: 1,
			createdAt: 1,
			updatedAt: 1,
		});
		return readingId;
	});
}

function publishSource(
	t: TestConvexDb,
	change: {
		readonly kind: "Contribute";
		readonly aspect: "source" | "breakdown";
		readonly part?: "constituents" | "morphemes";
		readonly value: unknown;
	} = SOURCE_CHANGE,
) {
	return t.mutation(internal.knowledgeGeneration.publish, {
		attemptKey: "participle",
		final: true,
		reading: GEKOCHT_READING,
		changes: [change],
		pendingRelations: [],
		productionEvidence: {
			request: { definition: null },
			failures: [],
			operationTraces: [],
		},
		relationPublication: {
			runNumber: 1,
			requestedKinds: [],
			artifactPath: null,
			fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
			proposals: [],
		},
	});
}

/** Stores a VERB Lemma with one Reading, as a later encounter of it would. */
function storeVerb(t: TestConvexDb, reading: Dumling.Reading<"de">) {
	return t.run(async (ctx) => {
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: lemmaIdentityKey(reading.lemma),
			language: "de",
			family: reading.lemma.family,
			kind: reading.lemma.kind,
			canonicalForm: reading.lemma.canonicalForm,
			foldedCanonicalForm: foldedCanonicalForm(reading.lemma),
			coreFeatures: reading.lemma.coreFeatures,
		});
		const readingId = await ctx.db.insert("readings", {
			readingKey: readingIdentityKey(reading),
			lemmaId,
			emojiDescription: emojiDescriptionOf(reading),
		});
		return { lemmaId, readingId };
	});
}

test("a missing source verb stays a Unit Shadow and no Reading is minted for it", async () => {
	const t = createTestConvex();
	const visitorId = "visitor-1";
	const adjectiveId = await seedAdjective(t, visitorId);
	expect(await publishSource(t)).toEqual({ status: "Committed" });
	expect(
		(await t.run((ctx) => ctx.db.query("readings").collect())).map(
			({ emojiDescription }) => emojiDescription,
		),
	).toEqual(["🥔"]);
	const shadow = await t.run((ctx) => ctx.db.query("shadows").unique());
	expect(shadow).toMatchObject({
		language: "de",
		canonicalForm: "kochen",
		family: "Lexeme",
		kind: "VERB",
	});
	if (!shadow) throw new Error("Expected the source verb's Shadow.");

	const adjectiveNote = await t.query(api.readingNotes.get, {
		readingId: adjectiveId,
		visitorId,
	});
	expect(adjectiveNote?.knowledge.source).toEqual(KOCHEN_SOURCE);
	expect(adjectiveNote?.sourceLinks).toEqual([
		{
			relation: "source",
			meaning: "Verbal",
			targetCanonicalForm: "kochen",
			target: { kind: "Shadow", shadowId: shadow._id },
		},
	]);
	const shadowNote = await t.query(api.shadowNotes.get, {
		shadowId: shadow._id,
	});
	expect(shadowNote?.references.page).toMatchObject([
		{
			reading: { readingId: adjectiveId, canonicalForm: "gekocht" },
			structuralReferences: [{ aspect: "source", path: "target" }],
		},
	]);
});

test("the link reaches the source verb once it is stored, and the verb's Lemma Note lists the adjective", async () => {
	const t = createTestConvex();
	const visitorId = "visitor-1";
	const adjectiveId = await seedAdjective(t, visitorId);
	expect(await publishSource(t)).toEqual({ status: "Committed" });
	const verb = await storeVerb(t, KOCHEN_READING);

	const adjectiveNote = await t.query(api.readingNotes.get, {
		readingId: adjectiveId,
		visitorId,
	});
	expect(adjectiveNote?.sourceLinks).toEqual([
		{
			relation: "source",
			meaning: "Verbal",
			targetCanonicalForm: "kochen",
			target: { kind: "Lemma", lemmaId: verb.lemmaId },
		},
	]);
	// The inverse sits on the verb's Lemma Note, never on one of its Readings.
	const verbReadingNote = await t.query(api.readingNotes.get, {
		readingId: verb.readingId,
		visitorId,
	});
	expect(verbReadingNote?.sourceLinks).toEqual([]);
	const verbLemmaNote = await t.query(api.routeNotes.get, {
		target: { kind: "Lemma", lemmaId: verb.lemmaId },
	});
	expect(
		verbLemmaNote?.kind === "Lemma" && verbLemmaNote.participialAdjectives,
	).toEqual([
		{
			readingId: adjectiveId,
			canonicalForm: "gekocht",
			emojiDescription: "🥔",
			target: { kind: "Reading", readingId: adjectiveId },
		},
	]);
});

test("a stored Source that no longer parses is skipped and reported, not listed under the verb", async () => {
	const t = createTestConvex();
	const visitorId = "visitor-1";
	await seedAdjective(t, visitorId);
	expect(await publishSource(t)).toEqual({ status: "Committed" });
	const verb = await storeVerb(t, KOCHEN_READING);
	const rowId = await t.run(async (ctx) => {
		const row = await ctx.db
			.query("accumulatedKnowledge")
			.withIndex("by_source_lemma_key", (q) =>
				q.eq("sourceLemmaKey", lemmaIdentityKey(KOCHEN)),
			)
			.unique();
		if (!row) throw new Error("Expected the adjective's Knowledge row.");
		// The schema admits any Knowledge; only the parser rejects this meaning.
		await ctx.db.patch(row._id, {
			knowledge: {
				...row.knowledge,
				source: { ...KOCHEN_SOURCE, meaning: "Bogus" },
			},
		});
		return row._id;
	});

	const warn = spyOn(console, "warn").mockImplementation(() => {});
	try {
		const verbLemmaNote = await t.query(api.routeNotes.get, {
			target: { kind: "Lemma", lemmaId: verb.lemmaId },
		});
		expect(
			verbLemmaNote?.kind === "Lemma" &&
				verbLemmaNote.participialAdjectives,
		).toEqual([]);
		const skipped = warn.mock.calls.flatMap(([line]) =>
			typeof line === "string" && line.includes("MalformedStoredRow")
				? [JSON.parse(line)]
				: [],
		);
		expect(skipped).toMatchObject([
			{ table: "accumulatedKnowledge", id: rowId },
		]);
	} finally {
		warn.mockRestore();
	}
});

test("a stored verb with other Core Features is not the source", async () => {
	const t = createTestConvex();
	const visitorId = "visitor-1";
	const adjectiveId = await seedAdjective(t, visitorId);
	expect(await publishSource(t)).toEqual({ status: "Committed" });
	// Same Canonical Form and Kind, so the same Unit Shadow, but another Lemma.
	await storeVerb(t, {
		...KOCHEN_READING,
		lemma: {
			...KOCHEN,
			coreFeatures: { ...KOCHEN.coreFeatures, lexicallyReflexive: "Acc" },
		},
	});
	const adjectiveNote = await t.query(api.readingNotes.get, {
		readingId: adjectiveId,
		visitorId,
	});
	expect(adjectiveNote?.sourceLinks?.[0]?.target.kind).toBe("Shadow");
});

test("a drifted meaning keeps its link but is not listed under the verb", async () => {
	const t = createTestConvex();
	const visitorId = "visitor-1";
	const adjectiveId = await seedAdjective(t, visitorId);
	expect(
		await publishSource(t, {
			...SOURCE_CHANGE,
			value: { target: KOCHEN, meaning: "Drifted" },
		}),
	).toEqual({ status: "Committed" });
	const verb = await storeVerb(t, KOCHEN_READING);
	const adjectiveNote = await t.query(api.readingNotes.get, {
		readingId: adjectiveId,
		visitorId,
	});
	expect(adjectiveNote?.sourceLinks).toEqual([
		{
			relation: "source",
			meaning: "Drifted",
			targetCanonicalForm: "kochen",
			target: { kind: "Lemma", lemmaId: verb.lemmaId },
		},
	]);
	const verbLemmaNote = await t.query(api.routeNotes.get, {
		target: { kind: "Lemma", lemmaId: verb.lemmaId },
	});
	expect(
		verbLemmaNote?.kind === "Lemma" && verbLemmaNote.participialAdjectives,
	).toEqual([]);
});

test("Breakdown pieces refer to their parts' Shadows, so each Shadow Note lists the Reading", async () => {
	const t = createTestConvex();
	const visitorId = "visitor-1";
	const adjectiveId = await seedAdjective(t, visitorId);
	const morpheme = (kind: string, canonicalForm: string) => ({
		language: "de",
		canonicalForm,
		family: "Morpheme",
		kind,
	});
	expect(
		await publishSource(t, {
			kind: "Contribute",
			aspect: "breakdown",
			part: "morphemes",
			value: [
				{ letters: "ge", target: morpheme("Prefix", "ge-") },
				{ letters: "koch", target: morpheme("Root", "koch") },
				{ letters: "t", target: morpheme("Suffix", "-t") },
			],
		}),
	).toEqual({ status: "Committed" });
	const root = await t.run((ctx) =>
		ctx.db
			.query("shadows")
			.withIndex("by_shadow_key", (q) =>
				q.eq(
					"shadowKey",
					JSON.stringify(["de", "koch", "Morpheme", "Root"]),
				),
			)
			.unique(),
	);
	if (!root) throw new Error("Expected the Root's Shadow.");
	const shadowNote = await t.query(api.shadowNotes.get, {
		shadowId: root._id,
	});
	expect(shadowNote?.references.page).toMatchObject([
		{
			reading: { readingId: adjectiveId, canonicalForm: "gekocht" },
			structuralReferences: [
				{ aspect: "breakdown", path: "morphemes.1" },
			],
		},
	]);
	const adjectiveNote = await t.query(api.readingNotes.get, {
		readingId: adjectiveId,
		visitorId,
	});
	expect(
		adjectiveNote?.structuralReferences.map(({ path }) => path).sort(),
	).toEqual(["morphemes.0", "morphemes.1", "morphemes.2"]);
});

/** The adjective's stored Source after publication, if any. */
async function storedAdjectiveSource(t: TestConvexDb) {
	const row = await t.run((ctx) =>
		ctx.db
			.query("accumulatedKnowledge")
			.withIndex("by_owner_reading_key", (q) =>
				q.eq("ownerReadingKey", readingIdentityKey(GEKOCHT_READING)),
			)
			.unique(),
	);
	return row?.knowledge?.source;
}

test("a Source whose stored base already names the word as its Source is dropped, not failed (#1279)", async () => {
	const t = createTestConvex();
	await seedAdjective(t, "visitor-1");
	await storeVerb(t, KOCHEN_READING);
	await t.run((ctx) =>
		ctx.db.insert("accumulatedKnowledge", {
			ownerReadingKey: readingIdentityKey(KOCHEN_READING),
			knowledge: { source: { target: GEKOCHT_READING.lemma } },
			status: "Full",
			sourceLemmaKey: lemmaIdentityKey(GEKOCHT_READING.lemma),
			updatedAt: 1,
		}),
	);
	const warn = spyOn(console, "warn").mockImplementation(() => {});
	try {
		expect(await publishSource(t)).toEqual({ status: "Committed" });
		expect(
			warn.mock.calls.flatMap(([line]) =>
				typeof line === "string" &&
				line.includes("BackPointingSourceRejected")
					? [JSON.parse(line)]
					: [],
			),
		).toEqual([
			{
				event: "BackPointingSourceRejected",
				ownerReadingKey: readingIdentityKey(GEKOCHT_READING),
				baseReadingKey: readingIdentityKey(KOCHEN_READING),
			},
		]);
	} finally {
		warn.mockRestore();
	}
	expect(await storedAdjectiveSource(t)).toBeUndefined();
	const attempt = await t.run((ctx) =>
		ctx.db.query("knowledgeGenerationAttempts").unique(),
	);
	expect(attempt?.state).toBe("Committed");

	// A stored base with no Source of its own takes the link.
	const accepting = createTestConvex();
	await seedAdjective(accepting, "visitor-1");
	await storeVerb(accepting, KOCHEN_READING);
	expect(await publishSource(accepting)).toEqual({ status: "Committed" });
	expect(await storedAdjectiveSource(accepting)).toEqual(KOCHEN_SOURCE);
});
