import {
	readingReferenceSchema,
	type SemanticRelation,
	semanticRelationSchema,
	unitShadowSchema,
} from "dumrel";
import { readingKey, sameReading } from "../core/identity";
import type {
	PendingEntryId,
	PendingSemanticRelationRecord,
	Reading,
	SerializedDictionaryNote,
	SurfaceEntry,
} from "../dto";
import type {
	Lemma,
	LemmaFamilyFor,
	LemmaKindFor,
	SupportedLanguage,
} from "../dumling";

export type SerializedDictionaryNoteV0<L extends SupportedLanguage> = {
	lemmaRecord: {
		lemma: Lemma<L>;
		morphologicalRelations: Partial<Record<string, Lemma<L>[]>>;
	};
	readingEntries: Array<{
		reading: Reading<L>;
		lexicalRelations: Partial<Record<SemanticRelation, Reading<L>[]>>;
		attestedTranslations: string[];
		attestations: string[];
		notes: string;
	}>;
	ownedSurfaceEntries: SurfaceEntry<L>[];
	pendingRefs?: Array<{
		pendingId: PendingEntryId<L>;
		language: L;
		canonicalForm: string;
		family: LemmaFamilyFor<L>;
		kind: LemmaKindFor<L, LemmaFamilyFor<L>>;
	}>;
	pendingRelations: Array<
		| {
				sourceReading: Reading<L>;
				relationFamily: "lexical";
				relation: SemanticRelation;
				targetPendingId: PendingEntryId<L>;
		  }
		| {
				sourceLemma: Lemma<L>;
				relationFamily: "morphological";
				relation: string;
				targetPendingId: PendingEntryId<L>;
		  }
	>;
};

export type UnresolvedV0Morphology<L extends SupportedLanguage> =
	| {
			kind: "stored";
			owner: Lemma<L>;
			relation: string;
			targets: Lemma<L>[];
	  }
	| {
			kind: "pending";
			sourceLemma: Lemma<L>;
			relation: string;
			targetPendingId: PendingEntryId<L>;
	  };

export type InvalidV0SemanticRelation<L extends SupportedLanguage> =
	| {
			kind: "pendingLanguageMismatch";
			sourceReading: Reading<L>;
			relation: SemanticRelation;
			targetPendingId: PendingEntryId<L>;
			target: PendingSemanticRelationRecord<L>["pending"]["target"];
	  }
	| {
			kind: "directLanguageMismatch" | "directSelfRelation";
			sourceReading: Reading<L>;
			relation: SemanticRelation;
			targetReading: Reading<L>;
	  };

export class DumdictV0MigrationError<
	L extends SupportedLanguage = SupportedLanguage,
> extends Error {
	readonly duplicatePendingIds: string[];
	readonly missingPendingIds: string[];
	readonly orphanPendingIds: string[];
	readonly unresolvedMorphology: UnresolvedV0Morphology<L>[];
	readonly invalidSemanticRelations: InvalidV0SemanticRelation<L>[];

	constructor(input: {
		duplicatePendingIds: string[];
		missingPendingIds: string[];
		orphanPendingIds: string[];
		unresolvedMorphology: UnresolvedV0Morphology<L>[];
		invalidSemanticRelations: InvalidV0SemanticRelation<L>[];
	}) {
		super("Version 0 dictionary notes cannot be migrated without loss.");
		this.name = "DumdictV0MigrationError";
		this.duplicatePendingIds = input.duplicatePendingIds;
		this.missingPendingIds = input.missingPendingIds;
		this.orphanPendingIds = input.orphanPendingIds;
		this.unresolvedMorphology = input.unresolvedMorphology;
		this.invalidSemanticRelations = input.invalidSemanticRelations;
	}
}

function sortedUnique(values: string[]) {
	return Array.from(new Set(values)).sort();
}

function hasValues(value: unknown[] | undefined): value is unknown[] {
	return value !== undefined && value.length > 0;
}

function normalizeReading<L extends SupportedLanguage>(
	reading: Reading<L>,
): Reading<L> {
	return readingReferenceSchema.parse(reading) as unknown as Reading<L>;
}

function normalizeUniqueReadings<L extends SupportedLanguage>(
	readings: Reading<L>[],
): Reading<L>[] {
	const byKey = new Map<string, Reading<L>>();
	for (const reading of readings) {
		const normalized = normalizeReading(reading);
		if (!byKey.has(readingKey(normalized))) {
			byKey.set(readingKey(normalized), normalized);
		}
	}
	return Array.from(byKey.values());
}

export function migrateSerializedDictionaryNotesV0ToV1<
	L extends SupportedLanguage,
>(
	notes: readonly SerializedDictionaryNoteV0<L>[],
): SerializedDictionaryNote<L>[] {
	const refs = notes.flatMap(({ pendingRefs }) => pendingRefs ?? []);
	const refCounts = new Map<string, number>();
	const refsById = new Map<string, (typeof refs)[number]>();
	for (const ref of refs) {
		refCounts.set(ref.pendingId, (refCounts.get(ref.pendingId) ?? 0) + 1);
		refsById.set(ref.pendingId, ref);
	}
	const duplicatePendingIds = Array.from(refCounts)
		.filter(([, count]) => count > 1)
		.map(([id]) => id)
		.sort();
	const lexicalPending = notes.flatMap(({ pendingRelations }) =>
		pendingRelations.filter((value) => value.relationFamily === "lexical"),
	);
	const referencedIds = lexicalPending.map(
		({ targetPendingId }) => targetPendingId,
	);
	const missingPendingIds = sortedUnique(
		referencedIds.filter((id) => !refsById.has(id)),
	);
	const referencedIdSet = new Set(referencedIds);
	const orphanPendingIds = sortedUnique(
		refs
			.filter(({ pendingId }) => !referencedIdSet.has(pendingId))
			.map(({ pendingId }) => pendingId),
	);
	const unresolvedMorphology: UnresolvedV0Morphology<L>[] = [];
	const invalidSemanticRelations: InvalidV0SemanticRelation<L>[] = [];
	for (const note of notes) {
		for (const [relation, targets] of Object.entries(
			note.lemmaRecord.morphologicalRelations,
		)) {
			if (hasValues(targets))
				unresolvedMorphology.push({
					kind: "stored",
					owner: note.lemmaRecord.lemma,
					relation,
					targets: targets as Lemma<L>[],
				});
		}
		for (const pending of note.pendingRelations) {
			if (pending.relationFamily === "morphological") {
				unresolvedMorphology.push({
					kind: "pending",
					sourceLemma: pending.sourceLemma,
					relation: pending.relation,
					targetPendingId: pending.targetPendingId,
				});
				continue;
			}
			const ref = refsById.get(pending.targetPendingId);
			if (!ref) continue;
			const sourceReading = normalizeReading(pending.sourceReading);
			const target = unitShadowSchema.parse({
				language: ref.language,
				canonicalForm: ref.canonicalForm,
				family: ref.family,
				kind: ref.kind,
			}) as unknown as PendingSemanticRelationRecord<L>["pending"]["target"];
			if (sourceReading.lemma.language !== target.language) {
				invalidSemanticRelations.push({
					kind: "pendingLanguageMismatch",
					sourceReading,
					relation: semanticRelationSchema.parse(pending.relation),
					targetPendingId: pending.targetPendingId,
					target,
				});
			}
		}
		for (const entry of note.readingEntries) {
			const sourceReading = normalizeReading(entry.reading);
			for (const [relationValue, targets] of Object.entries(
				entry.lexicalRelations,
			)) {
				const relation = semanticRelationSchema.parse(relationValue);
				for (const targetValue of targets ?? []) {
					const targetReading = normalizeReading(targetValue);
					if (
						sourceReading.lemma.language !==
						targetReading.lemma.language
					) {
						invalidSemanticRelations.push({
							kind: "directLanguageMismatch",
							sourceReading,
							relation,
							targetReading,
						});
					} else if (sameReading(sourceReading, targetReading)) {
						invalidSemanticRelations.push({
							kind: "directSelfRelation",
							sourceReading,
							relation,
							targetReading,
						});
					}
				}
			}
		}
	}
	if (
		duplicatePendingIds.length ||
		missingPendingIds.length ||
		orphanPendingIds.length ||
		unresolvedMorphology.length ||
		invalidSemanticRelations.length
	) {
		throw new DumdictV0MigrationError<L>({
			duplicatePendingIds,
			missingPendingIds,
			orphanPendingIds,
			unresolvedMorphology,
			invalidSemanticRelations,
		});
	}

	return notes.map((note) => {
		const pendingRelations = note.pendingRelations.flatMap(
			(legacy): PendingSemanticRelationRecord<L>[] => {
				if (legacy.relationFamily !== "lexical") return [];
				const ref = refsById.get(legacy.targetPendingId);
				if (!ref)
					throw new Error(
						"Validated pending ref unexpectedly missing.",
					);
				const relation = semanticRelationSchema.parse(legacy.relation);
				const target = unitShadowSchema.parse({
					language: ref.language,
					canonicalForm: ref.canonicalForm,
					family: ref.family,
					kind: ref.kind,
				}) as unknown as PendingSemanticRelationRecord<L>["pending"]["target"];
				return [
					{
						sourceReading: normalizeReading(legacy.sourceReading),
						pending: {
							relation,
							target,
						},
						locator: {
							sourceReadingKey: readingKey(
								normalizeReading(legacy.sourceReading),
							),
							relation,
							targetPendingId: legacy.targetPendingId,
						},
					},
				];
			},
		);
		return {
			schemaVersion: 1,
			lemmaRecord: { lemma: note.lemmaRecord.lemma },
			readingEntries: note.readingEntries.map(
				({ lexicalRelations, ...entry }) => {
					const semanticRelations = Object.fromEntries(
						Object.entries(lexicalRelations).flatMap(
							([relation, targets]) => {
								const normalized = normalizeUniqueReadings(
									targets ?? [],
								);
								return normalized.length === 0
									? []
									: [
											[
												semanticRelationSchema.parse(
													relation,
												),
												normalized,
											],
										];
							},
						),
					);
					return {
						...entry,
						reading: normalizeReading(entry.reading),
						...(Object.values(semanticRelations).some(hasValues)
							? { knowledge: { semanticRelations } }
							: {}),
					};
				},
			),
			ownedSurfaceEntries: note.ownedSurfaceEntries,
			pendingRelations,
		};
	});
}
