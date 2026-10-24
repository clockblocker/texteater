import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import type { PlannedChangeOp } from "dumdict/planning";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import { api } from "../convex/_generated/api";
import { applyDumdictPlanInTransaction } from "../convex/model/dumdictTransaction";
import { withStoredLinkTargets } from "../convex/model/pendingLinks";
import {
	asksBreakdown,
	produceBreakdown,
	type Segmenters,
	segmentsAfterSource,
} from "../server/knowledgeBreakdown";
import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import { createTestConvex, type TestConvexDb } from "./support/convex";

beforeEach(() => {
	// Scheduled work, such as Definition Text materialization, never runs here.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

const ENTSPANNUNG = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Entspannung",
		coreFeatures: { gender: "Fem" },
	},
	emojiDescription: "🧘",
} as const satisfies Dumling.Reading<"de">;
const ENTSPANNEN = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "entspannen",
		coreFeatures: { hasSepPrefix: null, lexicallyReflexive: null },
	},
	emojiDescription: "😌",
} as const satisfies Dumling.Reading<"de">;
const shadow = (
	family: string,
	kind: string,
	canonicalForm: string,
): Dumrel.UnitShadow =>
	({ language: "de", family, kind, canonicalForm }) as Dumrel.UnitShadow;
const ENTSPANNEN_SHADOW = shadow("Lexeme", "VERB", "entspannen");
const morpheme = (kind: string, canonicalForm: string) =>
	shadow("Morpheme", kind, canonicalForm);
const UNG = { letters: "ung", target: morpheme("Suffix", "-ung") };
const CONSTITUENTS = [{ letters: "Entspann", target: ENTSPANNEN_SHADOW }, UNG];
const ENTSPANNEN_MORPHEMES = [
	{ letters: "ent", target: morpheme("Prefix", "ent-") },
	{ letters: "spann", target: morpheme("Root", "spann") },
	{ letters: "en", target: morpheme("Ending", "-en") },
];

test("a base run of a word with neither a Source nor a Breakdown asks for its Breakdown", () => {
	const fresh = { topUpOnly: false, knowledge: {} };
	expect(asksBreakdown(ENTSPANNUNG, fresh)).toBe(true);
	expect(asksBreakdown(ENTSPANNUNG, { ...fresh, topUpOnly: true })).toBe(
		false,
	);
	expect(
		asksBreakdown(ENTSPANNUNG, {
			...fresh,
			knowledge: { breakdown: { constituents: CONSTITUENTS } },
		}),
	).toBe(false);
	expect(
		asksBreakdown(ENTSPANNUNG, {
			...fresh,
			knowledge: { source: { target: ENTSPANNEN_SHADOW } },
		}),
	).toBe(false);
	// An authored closed-class member carries its Breakdown (ADR 0021).
	expect(
		asksBreakdown(
			{
				lemma: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "ADP",
					canonicalForm: "mit",
					coreFeatures: {},
				} as unknown as Dumling.Lemma<"de">,
			},
			fresh,
		),
	).toBe(false);
});

test("a Source, or a Source that failed, holds both segmenters", () => {
	expect(segmentsAfterSource({ changes: [], failures: [] })).toBe(true);
	expect(
		segmentsAfterSource({
			changes: [],
			failures: [
				{ aspect: "source", code: "Unresolved", message: "Kita" },
			],
		}),
	).toBe(false);
	expect(
		segmentsAfterSource({
			changes: [
				{
					kind: "Contribute",
					aspect: "source",
					value: { target: ENTSPANNEN_SHADOW },
				},
			] as never,
			failures: [],
		}),
	).toBe(false);
});

/** Segmenters answering from fixed outputs, recording what they were asked. */
function fakeSegmenters(answers: {
	readonly constituents: readonly (typeof CONSTITUENTS)[number][] | "none";
	readonly morphemes?: readonly (typeof ENTSPANNEN_MORPHEMES)[number][];
	readonly fail?: "constituents" | "morphemes";
}) {
	const asked: string[] = [];
	const failure = {
		_tag: "ProviderFailure" as const,
		message: "no answer",
	};
	const segmenters: Segmenters<never> = {
		inConstituents: (input) => {
			asked.push(`constituents:${input.reading.lemma.canonicalForm}`);
			if (answers.fail === "constituents") return Effect.fail(failure);
			return Effect.succeed(
				answers.constituents === "none"
					? { kind: "NoConstituents" as const }
					: {
							kind: "Constituents" as const,
							pieces: answers.constituents,
						},
			);
		},
		inMorphemes: (input) => {
			asked.push(`morphemes:${input.reading.lemma.canonicalForm}`);
			if (answers.fail === "morphemes") return Effect.fail(failure);
			return Effect.succeed(answers.morphemes ?? []);
		},
	};
	return { segmenters, asked };
}

test("a word with Constituents stores them, and a bottom word its morphemes", async () => {
	const derived = fakeSegmenters({ constituents: CONSTITUENTS });
	expect(
		await Effect.runPromise(
			produceBreakdown(derived.segmenters, { reading: ENTSPANNUNG }),
		),
	).toEqual({
		changes: [
			{
				kind: "Contribute",
				aspect: "breakdown",
				part: "constituents",
				value: CONSTITUENTS,
			},
		],
		failures: [],
	});
	expect(derived.asked).toEqual(["constituents:Entspannung"]);

	const bottom = fakeSegmenters({
		constituents: "none",
		morphemes: ENTSPANNEN_MORPHEMES,
	});
	expect(
		await Effect.runPromise(
			produceBreakdown(bottom.segmenters, { reading: ENTSPANNEN }),
		),
	).toMatchObject({
		changes: [{ part: "morphemes", value: ENTSPANNEN_MORPHEMES }],
		failures: [],
	});
	expect(bottom.asked).toEqual([
		"constituents:entspannen",
		"morphemes:entspannen",
	]);
});

test("a failed call or a split that doesn't spell the word fails its part, never the run", async () => {
	const failed = fakeSegmenters({ constituents: "none", fail: "morphemes" });
	expect(
		await Effect.runPromise(
			produceBreakdown(failed.segmenters, { reading: ENTSPANNEN }),
		),
	).toEqual({
		changes: [],
		failures: [
			{
				aspect: "breakdown",
				leaf: "morphemes",
				code: "ProviderFailure",
				message: "no answer",
			},
		],
	});
	const misspelt = fakeSegmenters({
		constituents: [
			{ letters: "Ent", target: ENTSPANNEN_SHADOW },
			{ letters: "ung", target: morpheme("Suffix", "-ung") },
		],
	});
	expect(
		await Effect.runPromise(
			produceBreakdown(misspelt.segmenters, { reading: ENTSPANNUNG }),
		),
	).toMatchObject({
		changes: [],
		failures: [
			{
				aspect: "breakdown",
				leaf: "constituents",
				code: "InvalidModelOutput",
			},
		],
	});
});

const created = (
	reading: Dumling.Reading<"de">,
	knowledge?: Record<string, unknown>,
): PlannedChangeOp<"de">[] =>
	[
		{
			type: "createLemma",
			record: { lemma: reading.lemma },
			preconditions: [],
		},
		{
			type: "createReading",
			entry: {
				reading,
				attestedTranslations: [],
				attestationLinks: [],
				notes: "",
				...(knowledge ? { knowledge } : {}),
			},
			preconditions: [],
		},
	] as PlannedChangeOp<"de">[];

async function store(
	t: TestConvexDb,
	reading: Dumling.Reading<"de">,
	knowledge?: Record<string, unknown>,
) {
	const result = await t.run((ctx) =>
		applyDumdictPlanInTransaction(ctx, {
			changes: created(reading, knowledge),
		}),
	);
	expect(result).toMatchObject({ status: "committed" });
}

async function storedKnowledge(t: TestConvexDb, reading: Dumling.Reading) {
	return t.run(async (ctx) => {
		const row = await ctx.db
			.query("accumulatedKnowledge")
			.withIndex("by_owner_reading_key", (q) =>
				q.eq("ownerReadingKey", readingIdentityKey(reading)),
			)
			.unique();
		const readingRow = await ctx.db
			.query("readings")
			.withIndex("by_reading_key", (q) =>
				q.eq("readingKey", readingIdentityKey(reading)),
			)
			.unique();
		const entry = readingRow
			? await ctx.db
					.query("readingEntries")
					.withIndex("by_reading_id", (q) =>
						q.eq("readingId", readingRow._id),
					)
					.unique()
			: null;
		return {
			accumulated: row?.knowledge,
			entry: (entry?.record as { knowledge?: unknown } | undefined)
				?.knowledge,
			readingId: readingRow?._id,
		};
	});
}

async function shownMorphemes(t: TestConvexDb, reading: Dumling.Reading) {
	const { readingId } = await storedKnowledge(t, reading);
	if (!readingId) throw new Error("Expected a stored Reading.");
	const note = await t.query(api.readingNotes.get, {
		readingId,
		visitorId: "visitor-1",
	});
	return note?.breakdown?.morphemes?.map(({ letters, kind }) =>
		kind === "Chunk" ? `[${letters}]` : letters,
	);
}

test("storing a part's Lemma moves the links waiting on its Shadow, so the morphemes fill in (D16)", async () => {
	const t = createTestConvex();
	await store(t, ENTSPANNUNG, { breakdown: { constituents: CONSTITUENTS } });
	expect(await shownMorphemes(t, ENTSPANNUNG)).toEqual([
		"[Entspann]",
		"ung",
		"",
	]);

	await store(t, ENTSPANNEN, {
		breakdown: { morphemes: ENTSPANNEN_MORPHEMES },
	});
	const moved = await storedKnowledge(t, ENTSPANNUNG);
	const constituents = [
		{ letters: "Entspann", target: ENTSPANNEN.lemma },
		UNG,
	];
	expect(moved.accumulated).toEqual({ breakdown: { constituents } });
	expect(moved.entry).toEqual({ breakdown: { constituents } });
	expect(await shownMorphemes(t, ENTSPANNUNG)).toEqual([
		"Ent",
		"spann",
		"ung",
		"",
	]);

	// The base's Formations still list the word.
	const lemma = await t.run((ctx) =>
		ctx.db
			.query("lemmas")
			.withIndex("by_lemma_key", (q) =>
				q.eq("lemmaKey", lemmaIdentityKey(ENTSPANNEN.lemma)),
			)
			.unique(),
	);
	if (!lemma) throw new Error("Expected entspannen's Lemma.");
	const note = await t.query(api.routeNotes.get, {
		target: { kind: "Lemma", lemmaId: lemma._id },
	});
	expect(note?.kind === "Lemma" && note.formations).toMatchObject([
		{
			group: "Derivations",
			formations: [{ canonicalForm: "Entspannung" }],
		},
	]);
});

test("a generated link whose part is already stored names its Lemma", async () => {
	const t = createTestConvex();
	await store(t, ENTSPANNEN);
	const change = {
		kind: "Contribute",
		aspect: "breakdown",
		part: "constituents",
		value: CONSTITUENTS,
	};
	const source = {
		kind: "Contribute",
		aspect: "source",
		value: { target: shadow("Lexeme", "VERB", "Entspannen") },
	};
	expect(
		await t.run((ctx) => withStoredLinkTargets(ctx, [change, source])),
	).toEqual([
		{
			...change,
			value: [{ letters: "Entspann", target: ENTSPANNEN.lemma }, UNG],
		},
		{ ...source, value: { target: ENTSPANNEN.lemma } },
	]);
});
