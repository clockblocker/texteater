import type { ReadingEntry, ReadingKnowledgeChange } from "dumdict/planning";

import type * as Dumrel from "dumrel/types";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { findLemma, findReading, MAX_RELATIONS_PER_READING } from "./storage";

/*
 * A Reading's direct Semantic Relation claims, stored as edge rows: what a
 * Dumdict plan's relation Knowledge writes besides the Reading Entry row.
 */

export type SemanticRelationChange = Extract<
	ReadingKnowledgeChange<"de">["change"],
	{ aspect: "semanticRelations" }
>;

/** One edit to a source Reading's direct Semantic Relation edges. */
type RelationEdgeEdit = {
	readonly kind: SemanticRelationChange["kind"];
	readonly relation: Dumrel.DirectSemanticRelation;
	readonly targetKind: "lemma" | "reading";
	readonly targets: readonly unknown[];
};

function edgeTargetKind(edge: Doc<"semanticRelationEdges">) {
	return edge.targetKind === "reading" || edge.targetReadingId !== undefined
		? "reading"
		: "lemma";
}

/** Resolves direct relation targets to their row IDs, deduplicated in order. */
async function relationTargetIds(
	ctx: MutationCtx,
	edit: RelationEdgeEdit,
	source: { readingId: Id<"readings">; lemmaId: Id<"lemmas"> },
): Promise<Array<Id<"readings"> | Id<"lemmas">>> {
	if (edit.targetKind === "reading") {
		const targets = await Promise.all(
			edit.targets.map((target) => findReading(ctx, target)),
		);
		const ids = [
			...new Set(
				targets.map((target) => {
					if (!target)
						throw new Error(
							"A Semantic Relation target Reading is missing.",
						);
					return target._id;
				}),
			),
		];
		if (ids.includes(source.readingId))
			throw new Error("A Reading cannot relate directly to itself.");
		return ids;
	}
	const targets = await Promise.all(
		edit.targets.map((target) => findLemma(ctx, target)),
	);
	const ids = [
		...new Set(
			targets.map((target) => {
				if (!target)
					throw new Error(
						"A Semantic Relation target Lemma is missing.",
					);
				return target.canonical._id;
			}),
		),
	];
	if (ids.includes(source.lemmaId))
		throw new Error("A Reading cannot relate directly to its own Lemma.");
	return ids;
}

/**
 * Stores one relation edit as edges whose creation order is the relation's
 * target order: Contribute appends the targets it lacks, Correct replaces
 * the targets in its own order, and Retract removes the relation.
 */
export async function syncRelationEdges(
	ctx: MutationCtx,
	source: { readingId: Id<"readings">; lemmaId: Id<"lemmas"> },
	edit: RelationEdgeEdit,
): Promise<void> {
	if (edit.targetKind === "reading" && edit.relation !== "synonym")
		throw new Error(
			"Reading-targeted direct claims currently support Synonym only.",
		);
	const existing = await ctx.db
		.query("semanticRelationEdges")
		.withIndex(
			"by_source_reading_id_and_relation_and_target_lemma_id",
			(q) =>
				q
					.eq("sourceReadingId", source.readingId)
					.eq("relation", edit.relation),
		)
		.take(MAX_RELATIONS_PER_READING + 1);
	if (existing.length > MAX_RELATIONS_PER_READING) {
		throw new Error(
			`A Reading supports at most ${MAX_RELATIONS_PER_READING} Semantic Relation edges.`,
		);
	}
	if (existing.some((edge) => edgeTargetKind(edge) !== edit.targetKind))
		throw new Error(
			"One Reading Knowledge value cannot mix Lemma- and Reading-targeted Semantic Relations.",
		);
	existing.sort((a, b) => a._creationTime - b._creationTime);
	if (edit.kind === "Retract") {
		await Promise.all(existing.map((edge) => ctx.db.delete(edge._id)));
		return;
	}
	const targetIds = await relationTargetIds(ctx, edit, source);
	const storedIds = existing.map((edge) =>
		edit.targetKind === "reading"
			? edge.targetReadingId
			: edge.targetLemmaId,
	);
	let inserted: readonly (Id<"readings"> | Id<"lemmas">)[];
	if (edit.kind === "Correct") {
		if (
			storedIds.length === targetIds.length &&
			storedIds.every((id, index) => id === targetIds[index])
		)
			return;
		await Promise.all(existing.map((edge) => ctx.db.delete(edge._id)));
		inserted = targetIds;
	} else {
		const stored = new Set<string | undefined>(storedIds);
		inserted = targetIds.filter((id) => !stored.has(id));
	}
	// Sequential inserts give the edges their target order (read by creation time).
	for (const targetId of inserted)
		await ctx.db.insert(
			"semanticRelationEdges",
			edit.targetKind === "reading"
				? {
						sourceReadingId: source.readingId,
						targetKind: "reading",
						targetReadingId: targetId as Id<"readings">,
						relation: edit.relation,
					}
				: {
						sourceReadingId: source.readingId,
						targetKind: "lemma",
						targetLemmaId: targetId as Id<"lemmas">,
						relation: edit.relation,
					},
		);
}

export function relationEdgeEdit(
	change: SemanticRelationChange,
): RelationEdgeEdit {
	return {
		kind: change.kind,
		relation: change.relation,
		targetKind: change.targetKind === "reading" ? "reading" : "lemma",
		targets: "value" in change ? change.value : [],
	};
}

/** The edges a new Reading's Knowledge names, as Contribute edits. */
export function knowledgeRelationEdits(
	knowledge: ReadingEntry<"de">["knowledge"],
): RelationEdgeEdit[] {
	const relations = knowledge?.semanticRelations;
	if (!relations) return [];
	const targetKind = relations.targetKind === "reading" ? "reading" : "lemma";
	return Object.entries(relations).flatMap(([relation, targets]) =>
		relation === "targetKind" || !Array.isArray(targets)
			? []
			: [
					{
						kind: "Contribute" as const,
						// Every key beside targetKind names a direct relation.
						relation: relation as Dumrel.DirectSemanticRelation,
						targetKind,
						targets,
					},
				],
	);
}
