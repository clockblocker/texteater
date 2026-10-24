import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { createPendingSemanticRelationRecord } from "dumdict/pending";
import type { PlannedChangeOp } from "dumdict/planning";
import type * as Dumling from "dumling/types";
import { internal } from "../convex/_generated/api";
import {
	applyDumdictPlanInTransaction,
	createDumdictTransaction,
} from "../convex/model/dumdictTransaction";
import { projectPendingRelations } from "../convex/modules/notes/pendingRelations";
import { readingIdentityKey } from "../server/linguisticIdentity";
import { createTestConvex } from "./support/convex";

beforeEach(() => {
	// Scheduled work, such as Definition Text materialization, never runs here.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

function noun(
	canonicalForm: string,
	gender: "Masc" | "Fem" | "Neut",
): Dumling.Lemma<"de", "Lexeme", "NOUN"> {
	return {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm,
		coreFeatures: { gender },
	};
}

const derSee = noun("See", "Masc");
const meer = noun("Meer", "Neut");
const derSeeReading = {
	unitKind: "Reading",
	lemma: derSee,
	emojiDescription: "💧",
} as const;
const meerReading = {
	unitKind: "Reading",
	lemma: meer,
	emojiDescription: "🌊",
} as const;
const meerSee = createPendingSemanticRelationRecord(meerReading, {
	relation: "synonym",
	target: {
		language: "de",
		canonicalForm: "See",
		family: "Lexeme",
		kind: "NOUN",
	},
});

const created = (reading: Dumling.Reading<"de">): PlannedChangeOp<"de">[] => [
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
		},
		preconditions: [],
	},
];

/** `Meer`, with its synonym pending on some `See`. */
async function seededStore() {
	const t = createTestConvex();
	const result = await t.run((ctx) =>
		applyDumdictPlanInTransaction(ctx, {
			changes: [
				...created(meerReading),
				{
					type: "createPendingSemanticRelation",
					record: meerSee,
					preconditions: [],
				},
			],
		}),
	);
	expect(result).toMatchObject({ status: "committed" });
	return t;
}

/** Adds der See, the one Lemma the pending `See` Shadow then matches. */
const addDerSee = (t: Awaited<ReturnType<typeof seededStore>>) =>
	t.run((ctx) =>
		createDumdictTransaction(ctx).ensureReadingEntry({
			entry: {
				reading: derSeeReading,
				attestedTranslations: [],
				attestationLinks: [],
				notes: "",
			},
		}),
	);

const pendingRows = (t: Awaited<ReturnType<typeof seededStore>>) =>
	t.run((ctx) => ctx.db.query("pendingSemanticRelations").collect());

const meerEdges = (t: Awaited<ReturnType<typeof seededStore>>) =>
	t.run(async (ctx) => {
		const reading = await ctx.db
			.query("readings")
			.withIndex("by_reading_key", (q) =>
				q.eq("readingKey", readingIdentityKey(meerReading)),
			)
			.unique();
		if (!reading) throw new Error("Expected the Meer Reading.");
		return ctx.db
			.query("semanticRelationEdges")
			.withIndex(
				"by_source_reading_id_and_relation_and_target_lemma_id",
				(q) => q.eq("sourceReadingId", reading._id),
			)
			.collect();
	});

describe("Shadow re-evaluation in the Shared Demo Dictionary", () => {
	test("adding the one Lemma a stored Shadow names resolves it", async () => {
		const t = await seededStore();
		expect((await pendingRows(t))[0]?.shadowId).toBeDefined();

		expect(await addDerSee(t)).toMatchObject({ status: "committed" });
		const [row] = await pendingRows(t);
		expect(row?.record).toEqual({ ...meerSee, resolvedLemma: derSee });
		// A resolved record is no pending relation on Meer's Reading Note.
		expect(projectPendingRelations(await pendingRows(t))).toEqual([]);
		expect(await meerEdges(t)).toHaveLength(1);
	});

	test("pruning the Lemma a Shadow resolved to sends it back to pending", async () => {
		const t = await seededStore();
		await addDerSee(t);
		const lemmaId = await t.run(async (ctx) => {
			const reading = await ctx.db
				.query("readings")
				.withIndex("by_reading_key", (q) =>
					q.eq("readingKey", readingIdentityKey(derSeeReading)),
				)
				.unique();
			if (!reading) throw new Error("Expected the der See Reading.");
			return reading.lemmaId;
		});

		for (let attempt = 0; attempt < 3; attempt += 1)
			await t.mutation(internal.analysisStripping.clearReadingDataBatch, {
				readingKeys: [readingIdentityKey(derSeeReading)],
			});
		expect(
			await t.mutation(internal.analysisStripping.clearLemmaDataBatch, {
				lemmaIds: [lemmaId],
			}),
		).toMatchObject({ deletedLemmas: 1, nextCursor: null });

		const [row] = await pendingRows(t);
		expect(row?.record).toEqual(meerSee);
		expect(projectPendingRelations(await pendingRows(t))).toHaveLength(1);
		expect(await meerEdges(t)).toEqual([]);
	});
});
