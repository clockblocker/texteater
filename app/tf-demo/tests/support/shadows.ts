import { api } from "../../convex/_generated/api";
import type { Id, TableNames } from "../../convex/_generated/dataModel";
import type { MutationCtx } from "../../convex/_generated/server";
import { replaceAccumulatedKnowledge } from "../../convex/model/shadows";
import { lemmaIdentityKey } from "../../server/linguisticIdentity";
import type { TestConvexDb } from "./convex";

/* Shadow fixtures the Shadow test files share. */

export const nounShadow = {
	language: "de",
	canonicalForm: " Bank ",
	family: "Lexeme",
	kind: "NOUN",
} as const;
export const verbShadow = {
	language: "de",
	canonicalForm: "gehen",
	family: "Lexeme",
	kind: "VERB",
} as const;

export function shadowTree(...unitShadows: readonly object[]) {
	return {
		morphologicalTree: {
			root: {
				nodeKind: "structure",
				children: unitShadows.map((unitShadow) => ({
					nodeKind: "unitShadow",
					unitShadow,
				})),
			},
		},
	};
}

export function structuralKnowledge() {
	return {
		morphologicalTree: {
			root: {
				nodeKind: "structure",
				children: [
					{ nodeKind: "unitShadow", unitShadow: nounShadow },
					{
						nodeKind: "structure",
						children: [
							{ nodeKind: "unitShadow", unitShadow: nounShadow },
						],
					},
				],
			},
		},
	};
}

export function pendingRecord(
	sourceReadingKey = "reading-source",
	targetPendingId = "pending-1",
) {
	return {
		sourceReading: {},
		pending: { relation: "synonym", target: nounShadow },
		locator: {
			sourceReadingKey,
			relation: "synonym",
			targetPendingId,
		},
	};
}

export function rows<Table extends TableNames>(t: TestConvexDb, table: Table) {
	return t.run((ctx) => ctx.db.query(table).collect());
}

export function replaceKnowledge(
	t: TestConvexDb,
	ownerReadingKey: string,
	knowledge: unknown,
) {
	return t.run((ctx) =>
		replaceAccumulatedKnowledge(ctx, ownerReadingKey, knowledge),
	);
}

/** Interns the pending target's Shadow and stores the Pending Semantic Relation. */
export function insertPendingRelation(
	ctx: MutationCtx,
	record: ReturnType<typeof pendingRecord>,
	shadowId: Id<"shadows">,
) {
	return ctx.db.insert("pendingSemanticRelations", {
		locatorKey: JSON.stringify([
			record.locator.sourceReadingKey,
			record.locator.relation,
			record.locator.targetPendingId,
		]),
		sourceReadingKey: record.locator.sourceReadingKey,
		targetFoldedCanonicalForm: "bank",
		shadowId,
		record,
	});
}

/** The German VERB Lemma `laufen`, with no separable prefix. */
const laufen = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "VERB",
	canonicalForm: "laufen",
	coreFeatures: { hasSepPrefix: null, lexicallyReflexive: null },
} as const;

/** A dictionary Lemma and its Reading, owner of `readingKey`. */
export async function insertSourceReading(
	ctx: MutationCtx,
	readingKey = "reading-source",
) {
	const { unitKind: _, ...lemma } = laufen;
	const lemmaId = await ctx.db.insert("lemmas", {
		...lemma,
		lemmaKey: lemmaIdentityKey(laufen),
		foldedCanonicalForm: "laufen",
	});
	return ctx.db.insert("readings", {
		readingKey,
		lemmaId,
		emojiDescription: "🏃",
	});
}

export function shadowNote(t: TestConvexDb, shadowId: Id<"shadows">) {
	return t.query(api.shadowNotes.get, { shadowId });
}

export function shadowReferences(
	t: TestConvexDb,
	shadowId: Id<"shadows">,
	cursor = "",
) {
	return t.query(api.shadowNotes.references, { shadowId, cursor });
}
