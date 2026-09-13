import { readingFingerprint } from "dumling-old/id";
import type { Lemma, Reading, SupportedLanguage } from "dumling-old/types";
import {
	directSemanticRelationValues,
	projectRelations,
} from "dumrel/relations";
import type {
	DirectSemanticRelationGraphEdge,
	SemanticRelation,
} from "dumrel/types";
import type { LemmaRecord, ReadingEntry } from "../dto";
import { lemmaFingerprint, readingLemma } from "./identity";

export type ProjectSemanticRelationsInput<L extends SupportedLanguage> =
	Readonly<{
		lemmas: readonly LemmaRecord<L>[];
		readings: readonly ReadingEntry<L>[];
	}>;

export type SemanticRelationProjection<L extends SupportedLanguage> =
	| {
			sourceReading: Reading<L>;
			relation: SemanticRelation;
			targetKind?: "lemma";
			targetLemma: Lemma<L>;
			targetReading?: never;
			provenance: "direct" | "inferred";
	  }
	| {
			sourceReading: Reading<L>;
			relation: SemanticRelation;
			targetKind: "reading";
			targetReading: Reading<L>;
			targetLemma: Lemma<L>;
			provenance: "direct" | "inferred";
	  };

/**
 * Computes the deterministic direct and inferred read view over the supplied
 * current dictionary inventory. The projection is not persistence input.
 */
export function projectSemanticRelations<L extends SupportedLanguage>(
	input: ProjectSemanticRelationsInput<L>,
): SemanticRelationProjection<L>[] {
	const readingByKey = new Map<string, Reading<L>>(
		input.readings.map(({ reading }) => [
			readingFingerprint(reading),
			reading,
		]),
	);
	const lemmaByKey = new Map<string, Lemma<L>>(
		input.lemmas.map(({ lemma }) => [lemmaFingerprint(lemma), lemma]),
	);
	for (const entry of input.readings) {
		const lemma = readingLemma(entry.reading);
		lemmaByKey.set(lemmaFingerprint(lemma), lemma);
		const relations = entry.knowledge?.semanticRelations;
		if (!relations) continue;
		if (relations.targetKind === "reading") {
			for (const target of relations.synonym ?? [])
				readingByKey.set(readingFingerprint(target), target);
		} else {
			for (const relation of directSemanticRelationValues)
				for (const target of relations[relation] ?? [])
					lemmaByKey.set(lemmaFingerprint(target), target);
		}
	}
	const direct = input.readings.flatMap(
		(entry): DirectSemanticRelationGraphEdge[] => {
			const relations = entry.knowledge?.semanticRelations;
			if (!relations) return [];
			if (relations.targetKind === "reading") {
				return (relations.synonym ?? []).map((targetReading) => ({
					sourceReading: readingFingerprint(entry.reading),
					relation: "synonym" as const,
					targetKind: "reading" as const,
					targetReading: readingFingerprint(targetReading),
				}));
			}
			return directSemanticRelationValues.flatMap((relation) =>
				(relations[relation] ?? []).map((targetLemma) => ({
					sourceReading: readingFingerprint(entry.reading),
					relation,
					targetLemma: lemmaFingerprint(targetLemma),
				})),
			);
		},
	);

	return projectRelations({
		readings: input.readings.map(({ reading, knowledge }) => {
			const lemma = readingLemma(reading);
			return {
				reading: readingFingerprint(reading),
				lemma: lemmaFingerprint(lemma),
				relationTargetKind:
					knowledge?.semanticRelations?.targetKind === "reading"
						? "reading"
						: "lemma",
			};
		}),
		edges: direct,
	}).flatMap((projection): SemanticRelationProjection<L>[] => {
		const sourceReading = readingByKey.get(projection.sourceReading);
		if (!sourceReading) return [];
		if (projection.targetKind === "reading") {
			const targetReading = readingByKey.get(projection.targetReading);
			if (!targetReading) return [];
			return [
				{
					...projection,
					sourceReading,
					targetReading: targetReading as Reading<L>,
					targetLemma: readingLemma(targetReading),
				},
			];
		}
		const targetLemma = lemmaByKey.get(projection.targetLemma);
		return targetLemma
			? [{ ...projection, sourceReading, targetLemma }]
			: [];
	});
}
