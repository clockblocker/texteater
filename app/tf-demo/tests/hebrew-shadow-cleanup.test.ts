import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { createPendingSemanticRelationRecord } from "dumdict/pending";
import type * as Dumling from "dumling/types";
import { internal } from "../convex/_generated/api";
import { applyDumdictPlanInTransaction } from "../convex/model/dumdictTransaction";
import { readingIdentityKey } from "../server/linguisticIdentity";
import { createTestConvex } from "./support/convex";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test("pruning a Hebrew target migrates incoming claims back to its Shadow", async () => {
	const t = createTestConvex();
	const lemma = (
		canonicalForm: string,
	): Dumling.Lemma<"he", "Lexeme", "NOUN"> => ({
		unitKind: "Lemma",
		language: "he",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm,
		coreFeatures: { abbr: null, gender: "Masc" },
	});
	const source = {
		unitKind: "Reading",
		lemma: lemma("ים"),
		emojiDescription: "🌊",
	} as const;
	const target = {
		unitKind: "Reading",
		lemma: lemma("אגם"),
		emojiDescription: "💧",
	} as const;
	const pending = createPendingSemanticRelationRecord(source, {
		relation: "synonym",
		target: {
			language: "he",
			canonicalForm: "אגם",
			family: "Lexeme",
			kind: "NOUN",
		},
	});
	const result = await t.run((ctx) =>
		applyDumdictPlanInTransaction(ctx, {
			changes: [
				...[source, target].flatMap((reading) => [
					{
						type: "createLemma" as const,
						record: { lemma: reading.lemma },
						preconditions: [],
					},
					{
						type: "createReading" as const,
						entry: {
							reading,
							attestedTranslations: [],
							attestationLinks: [],
							notes: "",
						},
						preconditions: [],
					},
				]),
				{
					type: "createPendingSemanticRelation",
					record: { ...pending, resolvedLemma: target.lemma },
					preconditions: [],
				},
			],
		}),
	);
	expect(result.status).toBe("committed");
	const targetLemma = await t.run(async (ctx) =>
		(await ctx.db.query("lemmas").collect()).find(
			(row) => row.canonicalForm === "אגם",
		),
	);
	if (!targetLemma) throw new Error("Missing target Lemma");
	await t.run(async (ctx) => {
		const sourceRow = await ctx.db
			.query("readings")
			.withIndex("by_reading_key", (q) =>
				q.eq("readingKey", readingIdentityKey(source)),
			)
			.unique();
		if (!sourceRow) throw new Error("Missing source Reading");
		await ctx.db.insert("semanticRelationEdges", {
			sourceReadingId: sourceRow._id,
			relation: "synonym",
			targetLemmaId: targetLemma._id,
		});
	});
	await t.mutation(internal.analysisStripping.clearReadingDataBatch, {
		readingKeys: [readingIdentityKey(target)],
	});
	const cleanup = await t.mutation(
		internal.analysisStripping.clearLemmaDataBatch,
		{ lemmaIds: [targetLemma._id] },
	);
	expect(cleanup).toMatchObject({ deletedLemmas: 1, nextCursor: null });
	const state = await t.run(async (ctx) => ({
		lemma: await ctx.db.get(targetLemma._id),
		pending: await ctx.db.query("pendingSemanticRelations").collect(),
		edges: await ctx.db.query("semanticRelationEdges").collect(),
	}));
	expect(state.lemma).toBeNull();
	expect(state.edges).toEqual([]);
	expect(state.pending.map((row) => row.record)).toEqual([pending]);
});
