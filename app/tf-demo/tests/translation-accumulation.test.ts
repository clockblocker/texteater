import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { authoredReading } from "dumcorpus/inventories";
import * as Effect from "effect/Effect";
import type { Id } from "../convex/_generated/dataModel";
import type { ActionCtx } from "../convex/_generated/server";
import { scheduleTranslationAccumulation } from "../convex/model/translationAccumulation";
import { accumulateTranslations } from "../convex/translationAccumulationActions";
import {
	foldedCanonicalForm,
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import type { TranslationAccumulator } from "../server/translationAccumulation";
import {
	actionContext,
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";

beforeEach(() => {
	// Scheduling queues the run's action; nothing here runs it on its own.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

const STRAUSS = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Strauß",
		coreFeatures: { gender: "Masc" },
	},
	emojiDescription: "💐",
} as const;

const DURCH = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADP",
		canonicalForm: "durch",
		coreFeatures: {},
	},
	emojiDescription: "🚪",
} as const;

type SeededReading = typeof STRAUSS | typeof DURCH;

/**
 * Stores a Reading with its note and `count` occurrences, each the first
 * Segment of a Sentence of its own, and answers their Attestations in
 * the order they were stored.
 */
async function seedReading(
	t: TestConvexDb,
	reading: SeededReading,
	note: { readonly knowledge?: unknown },
	count: number,
) {
	const readingKey = readingIdentityKey(reading);
	const { lemmaId, readingId, surfaceId } = await t.run(async (ctx) => {
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
			readingKey,
			lemmaId,
			emojiDescription: reading.emojiDescription,
		});
		const surfaceId = await ctx.db.insert("surfaces", {
			surfaceKey: `surface:${readingKey}`,
			lemmaId,
			language: "de",
			normalizedSurface: reading.lemma.canonicalForm,
			inflectionalFeatures: null,
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
		});
		await ctx.db.insert("dictionaryLemmas", { lemmaId });
		await ctx.db.insert("readingEntries", {
			readingId,
			record: {
				attestedTranslations: [],
				attestations: [],
				notes: "",
				...note,
			},
		});
		return { lemmaId, readingId, surfaceId };
	});
	const attestationIds: Id<"attestations">[] = [];
	for (let index = 0; index < count; index += 1) {
		const { segmentIds } = await submitText(
			t,
			[
				[
					{
						kind: "ResolvableText",
						text: reading.lemma.canonicalForm,
					},
					{ kind: "OpaqueText", text: " den Regen" },
				],
			],
			{ submissionKey: `${readingKey}:${index}` },
		);
		const segmentId = segmentIds[0]?.[0];
		if (!segmentId) throw new Error("Expected a Segment.");
		attestationIds.push(
			await t.run(async (ctx) => {
				const attestationId = await ctx.db.insert("attestations", {
					surfaceId,
					readingId,
					realizationCoverage: "Full",
					...(reading.lemma.kind === "NOUN"
						? { articleEvidence: null }
						: {}),
					valencyEvidence: [],
				});
				await ctx.db.patch(segmentId, {
					attestationMembership: {
						attestationId,
						orthography: "Standard",
					},
				});
				return attestationId;
			}),
		);
	}
	return { lemmaId, readingId, readingKey, attestationIds };
}

const ACCUMULATE = "translationAccumulationActions:accumulate";

/** The action context a run reads and writes through. */
const context = (t: TestConvexDb) =>
	actionContext(t) as unknown as Pick<ActionCtx, "runQuery" | "runMutation">;

/** The accumulation runs queued, in order. */
async function queuedRuns(t: TestConvexDb) {
	const jobs = await t.run((ctx) =>
		ctx.db.system.query("_scheduled_functions").collect(),
	);
	return jobs
		.filter(({ name }) => name === ACCUMULATE)
		.map(({ args }) => args[0]);
}

function schedule(t: TestConvexDb, attestationId: Id<"attestations">) {
	return t.run((ctx) =>
		scheduleTranslationAccumulation(ctx, {
			visitorId: "visitor-1",
			attestationId,
		}),
	);
}

async function noteKnowledge(t: TestConvexDb, readingId: Id<"readings">) {
	const entry = await t.run((ctx) =>
		ctx.db
			.query("readingEntries")
			.withIndex("by_reading_id", (q) => q.eq("readingId", readingId))
			.unique(),
	);
	const record = entry?.record as { knowledge?: unknown } | undefined;
	return record?.knowledge;
}

test("a later occurrence asks for accumulation in the Visitor's languages; a generated Reading's first one does not", async () => {
	const t = createTestConvex();
	const { attestationIds } = await seedReading(t, STRAUSS, {}, 2);
	const [first, second] = attestationIds;
	if (!first || !second) throw new Error("Expected two occurrences.");
	await schedule(t, first);
	expect(await queuedRuns(t)).toEqual([]);
	await schedule(t, second);
	expect(await queuedRuns(t)).toEqual([
		{ attestationId: second, languages: ["en", "ru"] },
	]);
});

test("an authored Reading's first occurrence asks for accumulation too (ADR 0047)", async () => {
	const t = createTestConvex();
	expect(authoredReading(DURCH)).toBeDefined();
	const { attestationIds } = await seedReading(t, DURCH, {}, 1);
	const [first] = attestationIds;
	if (!first) throw new Error("Expected an occurrence.");
	await schedule(t, first);
	expect(await queuedRuns(t)).toEqual([
		{ attestationId: first, languages: ["en", "ru"] },
	]);
});

test("a run sees the note's stored translations and adds what it found missing, keeping the rest of the note", async () => {
	const t = createTestConvex();
	const knowledge = {
		definition: "Gebundene Blumen.",
		translations: { en: ["bouquet"], ru: ["букет"] },
	};
	const { readingId, readingKey, attestationIds } = await seedReading(
		t,
		STRAUSS,
		{ knowledge },
		2,
	);
	await t.run((ctx) =>
		ctx.db.insert("accumulatedKnowledge", {
			ownerReadingKey: readingKey,
			knowledge,
			status: "Full",
			updatedAt: 1,
		}),
	);
	const seen: unknown[] = [];
	const accumulator: TranslationAccumulator = (input) => {
		seen.push(input.translations);
		return Effect.succeed({
			changes: [
				{
					kind: "Contribute",
					aspect: "translations",
					language: "en",
					value: ["bunch of flowers"],
				},
			],
			failures: [],
		});
	};
	const attestationId = attestationIds[1];
	if (!attestationId) throw new Error("Expected an occurrence.");
	await accumulateTranslations(
		context(t),
		{ attestationId, languages: ["en", "ru"] },
		accumulator,
	);
	expect(seen).toEqual([{ en: ["bouquet"], ru: ["букет"] }]);
	const expected = {
		definition: "Gebundene Blumen.",
		translations: { en: ["bouquet", "bunch of flowers"], ru: ["букет"] },
	};
	expect(await noteKnowledge(t, readingId)).toEqual(expected);
	const accumulated = await t.run((ctx) =>
		ctx.db.query("accumulatedKnowledge").unique(),
	);
	expect(accumulated).toMatchObject({ knowledge: expected, status: "Full" });
});

test("a run with nothing stored for the Visitor's languages, or nothing found missing, writes nothing", async () => {
	const t = createTestConvex();
	const knowledge = { translations: { ru: ["букет"] } };
	const { readingId, attestationIds } = await seedReading(
		t,
		STRAUSS,
		{ knowledge },
		2,
	);
	const attestationId = attestationIds[1];
	if (!attestationId) throw new Error("Expected an occurrence.");
	let calls = 0;
	const accumulator: TranslationAccumulator = () => {
		calls += 1;
		return Effect.succeed({ changes: [], failures: [] });
	};
	await accumulateTranslations(
		context(t),
		{ attestationId, languages: ["en"] },
		accumulator,
	);
	expect(calls).toBe(0);
	await accumulateTranslations(
		context(t),
		{ attestationId, languages: ["en", "ru"] },
		accumulator,
	);
	expect(calls).toBe(1);
	expect(await noteKnowledge(t, readingId)).toEqual(knowledge);
});
