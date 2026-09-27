import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { api, internal } from "../convex/_generated/api";
import { RELATION_PUBLICATION_FINGERPRINTS } from "../convex/model/generatedKnowledgeContainment";
import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import { asksParticipleSource } from "../server/participleSource";
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
		verbType: null,
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
			abbr: null,
			foreign: null,
			numType: null,
			variant: null,
		},
	},
	emojiDescription: "🥔",
} as const satisfies Dumling.Reading<"de">;
const SOURCE_CHANGE = {
	kind: "Contribute",
	aspect: "participleSource",
	value: KOCHEN,
} as const;

test("only a base run of an ADJ Reading without a stored source asks for its Participle Source", () => {
	expect(
		asksParticipleSource(GEKOCHT_READING, {
			topUpOnly: false,
			knowledge: {},
		}),
	).toBe(true);
	expect(
		asksParticipleSource(GEKOCHT_READING, {
			topUpOnly: true,
			knowledge: {},
		}),
	).toBe(false);
	expect(
		asksParticipleSource(GEKOCHT_READING, {
			topUpOnly: false,
			knowledge: { participleSource: KOCHEN },
		}),
	).toBe(false);
	expect(
		asksParticipleSource(KOCHEN_READING, {
			topUpOnly: false,
			knowledge: {},
		}),
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
			spelling: "Canonical",
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

function publishSource(t: TestConvexDb) {
	return t.mutation(internal.knowledgeGeneration.publish, {
		attemptKey: "participle",
		final: true,
		reading: GEKOCHT_READING,
		changes: [SOURCE_CHANGE],
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
			coreFeatures: reading.lemma.coreFeatures,
		});
		const readingId = await ctx.db.insert("readings", {
			readingKey: readingIdentityKey(reading),
			lemmaId,
			emojiDescription: reading.emojiDescription,
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
	expect(adjectiveNote?.knowledge.participleSource).toEqual(KOCHEN);
	expect(adjectiveNote?.participleLinks).toEqual([
		{
			relation: "participleSource",
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
			structuralReferences: [
				{ aspect: "participleSource", path: "verb" },
			],
		},
	]);
});

test("the link reaches the source verb once it is stored, and each note shows its side", async () => {
	const t = createTestConvex();
	const visitorId = "visitor-1";
	const adjectiveId = await seedAdjective(t, visitorId);
	expect(await publishSource(t)).toEqual({ status: "Committed" });
	const verb = await storeVerb(t, KOCHEN_READING);

	const adjectiveNote = await t.query(api.readingNotes.get, {
		readingId: adjectiveId,
		visitorId,
	});
	expect(adjectiveNote?.participleLinks).toEqual([
		{
			relation: "participleSource",
			targetCanonicalForm: "kochen",
			target: { kind: "Lemma", lemmaId: verb.lemmaId },
		},
	]);
	const verbNote = await t.query(api.readingNotes.get, {
		readingId: verb.readingId,
		visitorId,
	});
	expect(verbNote?.participleLinks).toEqual([
		{
			relation: "participialAdjective",
			targetCanonicalForm: "gekocht",
			target: { kind: "Reading", readingId: adjectiveId },
		},
	]);
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
			coreFeatures: { ...KOCHEN.coreFeatures, lexicallyReflexive: "Yes" },
		},
	});
	const adjectiveNote = await t.query(api.readingNotes.get, {
		readingId: adjectiveId,
		visitorId,
	});
	expect(adjectiveNote?.participleLinks?.[0]?.target.kind).toBe("Shadow");
});
