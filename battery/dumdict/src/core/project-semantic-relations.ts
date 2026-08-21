import { readingFingerprint } from "dumling/id";
import type { Lemma, Reading, SupportedLanguage } from "dumling/types";
import { projectRelations } from "dumrel/relations";
import type { DirectSemanticRelation, SemanticRelation } from "dumrel/types";
import type { LemmaRecord, ReadingEntry } from "../dto";
import { lemmaFingerprint } from "./identity";

export type ProjectSemanticRelationsInput<L extends SupportedLanguage> =
	Readonly<{
		lemmas: readonly LemmaRecord<L>[];
		readings: readonly ReadingEntry<L>[];
	}>;

export type SemanticRelationProjection<L extends SupportedLanguage> = {
	sourceReading: Reading<L>;
	relation: SemanticRelation;
	targetLemma: Lemma<L>;
	provenance: "direct" | "inferred";
};

/**
 * Computes the complete deterministic read view from direct Reading Knowledge.
 * The returned projection is deliberately not accepted by Dumdict persistence.
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
		lemmaByKey.set(
			lemmaFingerprint(entry.reading.lemma),
			entry.reading.lemma,
		);
		for (const targets of Object.values(
			entry.knowledge?.semanticRelations ?? {},
		)) {
			for (const target of targets ?? []) {
				lemmaByKey.set(lemmaFingerprint(target), target);
			}
		}
	}
	const direct = input.readings.flatMap((entry) =>
		Object.entries(entry.knowledge?.semanticRelations ?? {}).flatMap(
			([relation, targets]) =>
				(targets ?? []).map((targetLemma) => ({
					sourceReading: readingFingerprint(entry.reading),
					relation: relation as DirectSemanticRelation,
					targetLemma: lemmaFingerprint(targetLemma),
				})),
		),
	);

	return projectRelations({
		readings: input.readings.map(({ reading }) => ({
			reading: readingFingerprint(reading),
			lemma: lemmaFingerprint(reading.lemma),
		})),
		edges: direct,
	}).flatMap((projection): SemanticRelationProjection<L>[] => {
		const sourceReading = readingByKey.get(projection.sourceReading);
		const targetLemma = lemmaByKey.get(projection.targetLemma);
		return sourceReading && targetLemma
			? [
					{
						sourceReading,
						relation: projection.relation,
						targetLemma,
						provenance: projection.provenance,
					},
				]
			: [];
	});
}
