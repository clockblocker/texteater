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

/** The source Reading's Canonical Form, which a Breakdown's letters spell. */
const sourceWording = "laufen";

/**
 * Knowledge whose Constituents link to each Shadow in turn, at
 * `constituents.<index>`, their letters spelling `laufen` in up to six parts.
 */
export function shadowBreakdown(...targets: readonly object[]) {
	const size = Math.ceil(sourceWording.length / targets.length);
	return {
		breakdown: {
			constituents: targets.map((target, index) => ({
				letters:
					index === targets.length - 1
						? sourceWording.slice(index * size)
						: sourceWording.slice(index * size, (index + 1) * size),
				target,
			})),
		},
	};
}

/** The Root Morpheme Shadow of `laufen`. */
export const rootShadow = {
	language: "de",
	canonicalForm: "lauf",
	family: "Morpheme",
	kind: "Root",
} as const;

/** Knowledge whose two Breakdown halves both link to `rootShadow`, before a filler. */
export function structuralKnowledge() {
	return {
		breakdown: {
			constituents: [
				{ letters: "lauf", target: rootShadow },
				{ letters: "en" },
			],
			morphemes: [
				{ letters: "lauf", target: rootShadow },
				{ letters: "en" },
			],
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
