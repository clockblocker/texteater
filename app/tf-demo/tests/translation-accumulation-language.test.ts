import { afterEach, expect, jest, spyOn, test } from "bun:test";
import { makeSurfaceId } from "dumdict/planning";
import { DumgenLive, JevTransport, LunaTransport, operations } from "dumgen";
import * as Effect from "effect/Effect";
import { internal } from "../convex/_generated/api";
import { accumulateTranslations } from "../convex/translationAccumulationActions";
import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import { dumgenTranslationAccumulator } from "../server/translationAccumulation";
import { actionContext, createTestConvex } from "./support/convex";
import { startSession } from "./support/occurrences";

const lemma = {
	unitKind: "Lemma",
	language: "he",
	family: "Lexeme",
	kind: "INTJ",
	canonicalForm: "שלום",
	coreFeatures: {},
} as const;
export const reading = {
	unitKind: "Reading",
	lemma,
	emojiDescription: "👋",
} as const;
export const attestation = {
	unitKind: "Attestation",
	surface: {
		unitKind: "Surface",
		language: "he",
		lemma,
		normalizedSurface: "שלום",
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
	},
	members: [{ attested: "שלום", orthography: "Standard" }],
	realizationCoverage: "Full",
} as const;
export const encounter = {
	sentence: {
		id: "he-accumulate",
		language: "he",
		segments: [{ kind: "ResolvableText", text: "שלום" }],
	},
	target: { family: "Lexeme", kind: "INTJ", memberSegmentIndices: [0] },
} as const;

test("translation accumulator forwards the occurrence's Hebrew language and source to Dumgen", async () => {
	const seen: unknown[] = [];
	const mock = spyOn(
		operations.knowledge,
		"accumulateTranslations",
	).mockImplementation((input) => {
		seen.push(input);
		return Effect.succeed({ changes: [], failures: [] });
	});
	const layer = DumgenLive({
		jev: JevTransport.fromAsk(async () => {
			throw Error("Unexpected jev");
		}),
		luna: LunaTransport.fromAsk(async () => {
			throw Error("Unexpected Luna");
		}),
	});
	try {
		await Effect.runPromise(
			dumgenTranslationAccumulator({
				encounter,
				reading,
				attestation,
				translations: { en: ["hello"] },
			}).pipe(Effect.provide(layer)),
		);
	} finally {
		mock.mockRestore();
	}

	expect(seen).toEqual([
		{
			language: "he",
			reading,
			attestation,
			sentence: { segments: encounter.sentence.segments, target: [0] },
			translations: { en: ["hello"] },
		},
	]);
});

afterEach(() => jest.useRealTimers());
test("Hebrew accumulation reads its occurrence and appends translations through the existing publication transaction", async () => {
	jest.useFakeTimers();
	const t = createTestConvex();
	const { sentenceIds } = await t.mutation(
		internal.persistence.persistSubmittedScroll,
		{
			submissionKey: "he-accumulation",
			sourceText: "שלום",
			sentences: [
				{
					segmentedSentenceId: "he-accumulation:0",
					position: 0,
					paragraph: 0,
					language: "de",
					stitchedText: "שלום",
					segments: [{ kind: "ResolvableText", text: "שלום" }],
					units: [
						{
							segments: [0],
							route: {
								language: "de",
								family: "Lexeme",
								kind: "INTJ",
							},
						},
					],
				},
			],
		},
	);
	const sentenceId = sentenceIds[0];
	if (!sentenceId) throw Error("Missing sentence");
	// Seed the durable source independently of the intake language gate.
	await t.run((ctx) => ctx.db.patch(sentenceId, { language: "he" }));
	const selection = {
		requestId: "he-accumulation",
		visitorId: "he-visitor",
		sentenceId,
		clickedSegmentIndex: 0,
	};
	const sessionGuard = await startSession(t, selection);
	const result = await t.mutation(internal.persistence.persistResolvedClick, {
		...selection,
		sessionGuard,
		reading,
		readingKey: readingIdentityKey(reading),
		readingDecision: "New",
		readingCandidates: [],
		occurrence: {
			memberSegmentIndices: [0],
			lemmaKey: lemmaIdentityKey(lemma),
			surfaceKey: makeSurfaceId("he", attestation.surface),
			attestation,
		},
	});
	if (result.status !== "Committed")
		throw Error("Expected committed occurrence");
	const knowledge = {
		definition: "ברכה",
		translations: { en: ["hello"], ru: ["привет"] },
	};
	await t.run(async (ctx) => {
		const entry = await ctx.db
			.query("readingEntries")
			.withIndex("by_reading_id", (q) =>
				q.eq("readingId", result.readingId),
			)
			.unique();
		if (!entry) throw Error("Missing note");
		await ctx.db.patch(entry._id, {
			record: {
				attestedTranslations: [],
				attestations: [],
				notes: "",
				knowledge,
			},
		});
		await ctx.db.insert("accumulatedKnowledge", {
			ownerReadingKey: readingIdentityKey(reading),
			knowledge,
			status: "Full",
			updatedAt: 1,
		});
	});
	const seen: unknown[] = [];
	await accumulateTranslations(
		actionContext(t),
		{ attestationId: result.attestationId, languages: ["en", "ru"] },
		(input) => {
			seen.push(input);
			return Effect.succeed({
				changes: [
					{
						kind: "Contribute",
						aspect: "translations",
						language: "en",
						value: ["peace"],
					},
				],
				failures: [],
			});
		},
	);
	expect(seen).toHaveLength(1);
	expect(seen[0]).toMatchObject({
		reading,
		attestation,
		encounter: { sentence: { language: "he" } },
		translations: knowledge.translations,
	});
	const stored = await t.run(async (ctx) => ({
		entry: await ctx.db
			.query("readingEntries")
			.withIndex("by_reading_id", (q) =>
				q.eq("readingId", result.readingId),
			)
			.unique(),
		accumulated: await ctx.db.query("accumulatedKnowledge").unique(),
	}));
	const expected = {
		...knowledge,
		translations: { en: ["hello", "peace"], ru: ["привет"] },
	};
	expect(stored.entry?.record).toMatchObject({ knowledge: expected });
	expect(stored.accumulated).toMatchObject({
		knowledge: expected,
		status: "Full",
	});
});
