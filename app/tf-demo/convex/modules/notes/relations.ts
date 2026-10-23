import { isRecord } from "common-utils";
import { type Infer, v } from "convex/values";
import { selectGrammaticalAlternatives } from "dumcorpus/inventories";
import type * as Dumling from "dumling/types";
import { parseReadingKnowledge, projectSources } from "dumrel";
import type * as Dumrel from "dumrel/types";
import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../../../server/linguisticIdentity";
import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import {
	MAX_STRUCTURAL_REFERENCES_PER_READING,
	shadowIsCompatible,
	structuralShadowLocatorKey,
	warnMalformedStoredRow,
} from "../../model/shadows";
import { semanticRelationValidator } from "../../model/validators";
import { projectReadingValue } from "./projections";
import {
	loadTargetedRelationProjections,
	MAX_RELATIONS_PER_NOTE,
	parseStoredGermanLemma,
} from "./relationNeighborhood";
import { unitReadingEmojiDescription } from "./unitReadingFamilies";

const MAX_PARTICIPIAL_ADJECTIVES_PER_NOTE = 50;

export const relationProjectionValidator = v.object({
	relation: semanticRelationValidator,
	targetCanonicalForm: v.string(),
	provenance: v.union(v.literal("direct"), v.literal("inferred")),
	target: v.union(
		v.object({
			kind: v.literal("Lemma"),
			lemmaId: v.id("lemmas"),
		}),
		v.object({
			kind: v.literal("Reading"),
			readingId: v.id("readings"),
		}),
	),
});

export const grammaticalAlternativeValidator = v.object({
	feature: v.union(
		v.literal("case"),
		v.literal("person"),
		v.literal("number"),
		v.literal("gender"),
	),
	readingKey: v.string(),
	canonicalForm: v.string(),
});
export type GrammaticalAlternative = {
	readonly feature: "case" | "person" | "number" | "gender";
	readonly readingKey: string;
	readonly canonicalForm: string;
};

type RelationProjection<
	LemmaId extends string = string,
	ReadingId extends string = string,
> = {
	readonly relation: Dumrel.SemanticRelation;
	readonly targetCanonicalForm: string;
	readonly provenance: "direct" | "inferred";
	readonly target:
		| {
				readonly kind: "Lemma";
				readonly lemmaId: LemmaId;
		  }
		| { readonly kind: "Reading"; readonly readingId: ReadingId };
};

export async function loadRelationProjections(
	ctx: QueryCtx,
	readingId: Id<"readings">,
) {
	const source = await ctx.db.get(readingId);
	if (!source)
		return {
			knowledge: {},
			resolved: [],
			truncated: false,
		};
	const loaded = await loadTargetedRelationProjections(ctx, source);
	const truncated =
		loaded.truncated || loaded.projections.length > MAX_RELATIONS_PER_NOTE;
	const projections = loaded.projections.slice(0, MAX_RELATIONS_PER_NOTE);
	const targetDocs = await Promise.all(
		projections.map((projection) =>
			projection.targetKind === "reading"
				? ctx.db
						.query("readings")
						.withIndex("by_reading_key", (q) =>
							q.eq(
								"readingKey",
								readingIdentityKey(projection.targetReading),
							),
						)
						.unique()
				: ctx.db
						.query("lemmas")
						.withIndex("by_lemma_key", (q) =>
							q.eq(
								"lemmaKey",
								lemmaIdentityKey(projection.targetLemma),
							),
						)
						.unique(),
		),
	);
	const readingMode = projections[0]?.targetKind === "reading";
	if (
		projections.some(
			(projection) =>
				(projection.targetKind === "reading") !== readingMode,
		)
	)
		throw new Error(
			"One Reading Note cannot mix Lemma- and Reading-targeted Semantic Relations.",
		);
	const resolved: RelationProjection<Id<"lemmas">, Id<"readings">>[] = [];
	const knowledge: PresentedRelations = readingMode
		? { targetKind: "reading" }
		: {};
	for (const [index, projection] of projections.entries()) {
		const targetDoc = targetDocs[index];
		if (!targetDoc) continue;
		if (projection.targetKind === "reading") {
			if (
				!("readingKey" in targetDoc) ||
				knowledge.targetKind !== "reading"
			)
				continue;
			resolved.push({
				relation: projection.relation,
				targetCanonicalForm:
					projection.targetReading.lemma.canonicalForm,
				provenance: projection.provenance,
				target: {
					kind: "Reading",
					readingId: targetDoc._id,
				},
			});
			const bucket = knowledge[projection.relation];
			if (bucket) bucket.push(projection.targetReading);
			else knowledge[projection.relation] = [projection.targetReading];
			continue;
		}
		if (!("lemmaKey" in targetDoc) || knowledge.targetKind === "reading")
			continue;
		const target = parseStoredGermanLemma(targetDoc);
		resolved.push({
			relation: projection.relation,
			targetCanonicalForm: targetDoc.canonicalForm,
			provenance: projection.provenance,
			target: {
				kind: "Lemma",
				lemmaId: targetDoc._id,
			},
		});
		const bucket = knowledge[projection.relation];
		if (bucket) bucket.push(target);
		else knowledge[projection.relation] = [target];
	}
	return { knowledge, resolved, truncated };
}

/** Whether a Participial Adjective's Reading means a sense of its verb. */
export const participleMeaningValidator = v.union(
	v.literal("Verbal"),
	v.literal("Drifted"),
);

/**
 * The Source link on a Reading Note (ADR 0050): the base Lemma it names, or
 * that base's Unit Shadow while it is not stored. A participle's link also
 * carries its Participle Meaning (ADR 0036).
 */
export const sourceLinkValidator = v.object({
	relation: v.literal("source"),
	/** Drifted: the adjective's form comes from the verb, its meaning does not. */
	meaning: v.optional(participleMeaningValidator),
	targetCanonicalForm: v.string(),
	target: v.union(
		v.object({ kind: v.literal("Lemma"), lemmaId: v.id("lemmas") }),
		v.object({ kind: v.literal("Shadow"), shadowId: v.id("shadows") }),
	),
});

/**
 * Where a Source link leads: the stored Lemma a Lemma target names, matched
 * by its full identity, or the Unit Shadow the Reading's Knowledge refers to
 * while no such Lemma is stored. Null when neither is stored.
 */
async function sourceTarget(
	ctx: QueryCtx,
	ownerReadingKey: string,
	target: Dumrel.LinkTarget,
): Promise<Infer<typeof sourceLinkValidator>["target"] | null> {
	if ("unitKind" in target) {
		const lemma = await ctx.db
			.query("lemmas")
			.withIndex("by_lemma_key", (q) =>
				q.eq("lemmaKey", lemmaIdentityKey(target)),
			)
			.unique();
		if (lemma) return { kind: "Lemma", lemmaId: lemma._id };
	}
	const references = await ctx.db
		.query("structuralShadowReferences")
		.withIndex("by_owner_reading_key", (q) =>
			q.eq("ownerReadingKey", ownerReadingKey),
		)
		.take(MAX_STRUCTURAL_REFERENCES_PER_READING + 1);
	const sourceLocator = structuralShadowLocatorKey(
		ownerReadingKey,
		"source",
		"target",
	);
	const reference = references.find(
		({ locatorKey }) => locatorKey === sourceLocator,
	);
	const shadow = reference ? await ctx.db.get(reference.shadowId) : null;
	return shadow &&
		shadowIsCompatible(shadow, {
			language: target.language,
			canonicalForm: target.canonicalForm,
			family: target.family,
			kind: target.kind,
		})
		? { kind: "Shadow", shadowId: shadow._id }
		: null;
}

/**
 * The Source link this Reading stores, projected by Dumrel. A verb's side of
 * a participle lives on its Lemma Note ({@link loadParticipialAdjectives}).
 */
export async function loadSourceLinks(
	ctx: QueryCtx,
	source: Doc<"readings">,
	sourceLemma: Doc<"lemmas">,
	stored: Dumrel.Source | undefined,
): Promise<Infer<typeof sourceLinkValidator>[]> {
	if (!stored) return [];
	const projected = projectSources([
		{
			reading: projectReadingValue(source, sourceLemma),
			knowledge: { source: stored },
		},
	]);
	if (!projected.success) throw projected.error;
	const links: Infer<typeof sourceLinkValidator>[] = [];
	for (const edge of projected.value) {
		if (edge.relation !== "source") continue;
		const target = await sourceTarget(ctx, source.readingKey, edge.target);
		if (target)
			links.push({
				relation: edge.relation,
				...(edge.meaning ? { meaning: edge.meaning } : {}),
				targetCanonicalForm: edge.target.canonicalForm,
				target,
			});
	}
	return links;
}

/** One participial adjective on its source verb's Lemma Note. */
export const participialAdjectiveValidator = v.object({
	readingId: v.id("readings"),
	canonicalForm: v.string(),
	emojiDescription: v.string(),
	target: v.object({
		kind: v.literal("Reading"),
		readingId: v.id("readings"),
	}),
});

/**
 * The ADJ Readings that name this VERB Lemma as their Source with a Verbal
 * Participle Meaning, projected by Dumrel as inverse edges from the Lemma. The
 * link targets the Lemma, so it is listed once here and on none of the verb's
 * Readings. A Drifted adjective (`gelassen` 😌 under `lassen`) is not listed.
 */
export async function loadParticipialAdjectives(
	ctx: QueryCtx,
	verb: Doc<"lemmas">,
): Promise<Infer<typeof participialAdjectiveValidator>[]> {
	if (
		verb.language !== "de" ||
		verb.family !== "Lexeme" ||
		verb.kind !== "VERB"
	)
		return [];
	const rows = await ctx.db
		.query("accumulatedKnowledge")
		.withIndex("by_source_lemma_key", (q) =>
			q.eq("sourceLemmaKey", verb.lemmaKey),
		)
		.take(MAX_PARTICIPIAL_ADJECTIVES_PER_NOTE);
	const entries: Dumrel.ReadingWithKnowledge[] = [];
	const readings = new Map<string, Doc<"readings">>();
	for (const row of rows) {
		const reading = await ctx.db
			.query("readings")
			.withIndex("by_reading_key", (q) =>
				q.eq("readingKey", row.ownerReadingKey),
			)
			.unique();
		const lemma = reading ? await ctx.db.get(reading.lemmaId) : null;
		if (!reading || !lemma) continue;
		const value = projectReadingValue(reading, lemma);
		const stored = isRecord(row.knowledge)
			? row.knowledge.source
			: undefined;
		const knowledge = parseReadingKnowledge({
			source: value,
			knowledge: stored === undefined ? {} : { source: stored },
		});
		if (!knowledge.success) {
			warnMalformedStoredRow(
				"accumulatedKnowledge",
				row._id,
				knowledge.error.message,
			);
			continue;
		}
		readings.set(reading.readingKey, reading);
		entries.push({ reading: value, knowledge: knowledge.value });
	}
	const projected = projectSources(entries);
	if (!projected.success) throw projected.error;
	return projected.value.flatMap((edge) => {
		if (
			edge.relation !== "participialAdjective" ||
			lemmaIdentityKey(edge.source) !== verb.lemmaKey
		)
			return [];
		const reading = readings.get(readingIdentityKey(edge.target));
		return reading
			? [
					{
						readingId: reading._id,
						canonicalForm: edge.target.lemma.canonicalForm,
						emojiDescription: unitReadingEmojiDescription(reading),
						target: {
							kind: "Reading" as const,
							readingId: reading._id,
						},
					},
				]
			: [];
	});
}

export async function loadGrammaticalAlternatives(
	ctx: QueryCtx,
	readingId: Id<"readings">,
): Promise<GrammaticalAlternative[]> {
	const source = await ctx.db.get(readingId);
	if (!source) return [];
	const lemmaDoc = await ctx.db.get(source.lemmaId);
	if (!lemmaDoc) return [];
	return reviewedAlternatives(parseStoredGermanLemma(lemmaDoc)).map(
		({ feature, reading }) => ({
			feature,
			readingKey: readingIdentityKey(reading),
			canonicalForm: reading.lemma.canonicalForm,
		}),
	);
}
/**
 * The Paradigm Cells a learner can step to from a reviewed pillar pronoun or
 * article. A stem Lemma (dieser, mein) has none: all its forms are Surfaces
 * of this one Reading, so navigation never leaves it.
 */
export function reviewedAlternatives(lemma: Dumling.Lemma<"de">) {
	if (lemma.family !== "Lexeme") return [];
	if (lemma.kind === "PRON")
		return (["case", "person", "number"] as const).flatMap((feature) =>
			selectGrammaticalAlternatives({
				source: lemma,
				vary: [feature],
			}).map((reading) => ({ feature, reading })),
		);
	if (lemma.kind === "DET")
		// Plural cells have no gender, so a number step also frees gender;
		// only the cells that change number belong to that step.
		return (["case", "gender", "number"] as const).flatMap((feature) =>
			selectGrammaticalAlternatives({
				source: lemma,
				vary: feature === "number" ? ["number", "gender"] : [feature],
			})
				.filter(
					(reading) =>
						feature !== "number" ||
						readingNumber(reading) !== lemma.coreFeatures.number,
				)
				.map((reading) => ({ feature, reading })),
		);
	return [];
}
function readingNumber(reading: Dumling.Reading<"de">) {
	return (reading.lemma.coreFeatures as { number?: string | null }).number;
}

export type PresentedRelations =
	| ({ targetKind?: "lemma" } & Partial<
			Record<Dumrel.SemanticRelation, Dumling.Lemma[]>
	  >)
	| ({ targetKind: "reading" } & Partial<
			Record<Dumrel.SemanticRelation, Dumling.Reading[]>
	  >);
