import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

const supportedLanguages = ["de", "en", "he"] as const;

import {
	directSemanticRelationSchema,
	knowledgeChangeSchema,
	pendingSemanticRelationSchema,
	readingKnowledgeSchema,
} from "dumrel/schema";
import { type ZodType, z } from "zod/v4";
import type {
	ChangePrecondition,
	CommitChangesRequest,
	DumdictPlan,
	LemmaRecord,
	PendingEntryId,
	PendingSemanticRelationLocator,
	PendingSemanticRelationRecord,
	PlannedChangeOp,
	ReadingEntry,
	ReadingPatchOp,
	StoreRevision,
	SurfaceEntry,
} from "./domain-types.js";
import type { SurfaceId } from "./dumling-id";
import { unitSchemas } from "./generated/unit-schemas.js";
import {
	dumdictNamedValidationErrors,
	dumdictNamedValidationPredicates,
	dumdictNamedValidationTransforms,
	retainCommitChangesRequest,
	retainDumdictPlan,
} from "./validation-semantics";

type ObjectSchemaWithField<
	Output,
	Key extends string,
	FieldOutput,
> = ZodType<Output> &
	Readonly<{
		shape: Readonly<Record<Key, ZodType<FieldOutput>>>;
	}>;

type ExtendableObjectSchemaWithField<
	Output,
	Key extends string,
	FieldOutput,
> = ZodType<Output> &
	Pick<z.ZodObject<{ [Field in Key]: ZodType<FieldOutput> }>, "extend">;

function namedValidationPredicate<Value>(
	name: keyof typeof dumdictNamedValidationPredicates,
): (value: Value) => unknown {
	return dumdictNamedValidationPredicates[name] as (value: Value) => unknown;
}

function namedValidationError(
	name: keyof typeof dumdictNamedValidationErrors,
): { readonly error: () => string } {
	return { error: dumdictNamedValidationErrors[name] };
}

function pendingEntryIdTransform<L extends Dumling.Language>(
	language: L,
): (value: string) => PendingEntryId<L> {
	return dumdictNamedValidationTransforms[
		`dumdict.pending-entry-id.${language}`
	] as (value: string) => PendingEntryId<L>;
}

export type DumdictSchemasFor<L extends Dumling.Language> = Readonly<{
	lemmaRecordSchema: ExtendableObjectSchemaWithField<
		LemmaRecord<L>,
		"lemma",
		Dumling.Lemma<L>
	>;
	readingEntrySchema: ObjectSchemaWithField<
		ReadingEntry<L>,
		"reading",
		Dumling.Reading<L>
	>;
	surfaceEntrySchema: ObjectSchemaWithField<
		SurfaceEntry<L>,
		"surface",
		Dumling.Surface<L>
	>;
	pendingSemanticRelationLocatorSchema: ZodType<
		PendingSemanticRelationLocator<L>
	>;
	pendingSemanticRelationRecordSchema: ZodType<
		PendingSemanticRelationRecord<L>
	>;
	changePreconditionSchema: ZodType<ChangePrecondition<L>>;
	readingPatchOpSchema: ZodType<ReadingPatchOp<L>>;
	plannedChangeOpSchema: ZodType<PlannedChangeOp<L>>;
	dumdictPlanSchema: ZodType<DumdictPlan<L>>;
	commitChangesRequestSchema: ZodType<CommitChangesRequest<L>>;
}>;

function createSchemasFor<const L extends Dumling.Language>(
	language: L,
): DumdictSchemasFor<L> {
	const lemmaSchema = unitSchemas[language].lemma as ZodType<
		Dumling.Lemma<L>
	>;
	const surfaceSchema = unitSchemas[language].surface as ZodType<
		Dumling.Surface<L>
	>;
	const readingSchema = unitSchemas[language].reading;

	// These casts narrow schemas owned by Dumling and Dumrel after a runtime
	// language refinement. Local Dumdict object and union outputs remain inferred.
	const languageReadingSchema = (
		readingSchema as unknown as ZodType<Dumling.Reading<L>>
	).refine(
		namedValidationPredicate<Dumling.Reading<L>>(
			`dumdict.reading.language.${language}`,
		),
		namedValidationError(`dumdict.reading.language.${language}`),
	);
	const languageReadingKnowledgeSchema = (
		readingKnowledgeSchema as unknown as ZodType<
			Dumrel.ReadingKnowledge<Dumling.Reading<L>>
		>
	)
		.refine(
			namedValidationPredicate<
				Dumrel.ReadingKnowledge<Dumling.Reading<L>>
			>(`dumdict.reading-knowledge.language.${language}`),
			namedValidationError(
				`dumdict.reading-knowledge.language.${language}`,
			),
		)
		.refine(
			namedValidationPredicate<
				Dumrel.ReadingKnowledge<Dumling.Reading<L>>
			>("dumdict.reading-knowledge.preposition-case"),
			namedValidationError("dumdict.reading-knowledge.preposition-case"),
		);
	const languagePendingSemanticRelationSchema = (
		pendingSemanticRelationSchema as unknown as ZodType<{
			relation: z.output<typeof directSemanticRelationSchema>;
			target: Dumrel.UnitShadow & { language: L };
		}>
	).refine(
		namedValidationPredicate<{
			relation: z.output<typeof directSemanticRelationSchema>;
			target: Dumrel.UnitShadow & { language: L };
		}>(`dumdict.pending.target-language.${language}`),
		namedValidationError(`dumdict.pending.target-language.${language}`),
	);

	const stringArraySchema = z.array(z.string());
	// Host IDs are opaque branded strings. These are the only local leaf-schema
	// casts; every containing contract is inferred from the schema expression.
	const storeRevisionSchema = z.string().min(1) as ZodType<StoreRevision>;
	const surfaceIdSchema = z.string().min(1) as unknown as ZodType<
		SurfaceId<L>
	>;
	const pendingEntryIdSchema = z
		.string()
		.min(1)
		.transform(pendingEntryIdTransform(language));

	const lemmaRecordSchema = z.strictObject({
		lemma: lemmaSchema,
	});
	const readingEntrySchema = z
		.strictObject({
			reading: languageReadingSchema,
			knowledge: languageReadingKnowledgeSchema.optional(),
			attestedTranslations: stringArraySchema,
			attestations: stringArraySchema,
			notes: z.string(),
		})
		.refine(
			namedValidationPredicate("dumdict.reading-entry.no-same-lemma"),
			namedValidationError("dumdict.reading-entry.no-same-lemma"),
		)
		.refine(
			namedValidationPredicate("dumdict.reading-entry.source-family"),
			namedValidationError("dumdict.reading-entry.source-family"),
		);
	const surfaceEntrySchema = z
		.strictObject({
			id: surfaceIdSchema,
			surface: surfaceSchema,
			ownerLemma: lemmaSchema,
			attestedTranslations: stringArraySchema,
			attestations: stringArraySchema,
			notes: z.string(),
		})
		.refine(
			namedValidationPredicate("dumdict.surface.owner-matches"),
			namedValidationError("dumdict.surface.owner-matches"),
		)
		.refine(
			namedValidationPredicate("dumdict.surface.id-matches"),
			namedValidationError("dumdict.surface.id-matches"),
		);
	const pendingSemanticRelationLocatorSchema = z.strictObject({
		sourceReadingKey: z.string().min(1),
		relation: directSemanticRelationSchema,
		targetPendingId: pendingEntryIdSchema,
	});
	const pendingSemanticRelationRecordSchema = z
		.strictObject({
			sourceReading: languageReadingSchema,
			pending: languagePendingSemanticRelationSchema,
			locator: pendingSemanticRelationLocatorSchema,
		})
		.refine(
			namedValidationPredicate("dumdict.pending.locator-source"),
			namedValidationError("dumdict.pending.locator-source"),
		)
		.refine(
			namedValidationPredicate(
				"dumdict.pending.locator-matches-relation",
			),
			namedValidationError("dumdict.pending.locator-matches-relation"),
		);

	const changePreconditionSchema = z.union([
		z.strictObject({
			kind: z.literal("revisionMatches"),
			revision: storeRevisionSchema,
		}),
		z.strictObject({ kind: z.literal("lemmaExists"), lemma: lemmaSchema }),
		z.strictObject({ kind: z.literal("lemmaMissing"), lemma: lemmaSchema }),
		z.strictObject({
			kind: z.literal("readingExists"),
			reading: languageReadingSchema,
		}),
		z.strictObject({
			kind: z.literal("readingMissing"),
			reading: languageReadingSchema,
		}),
		z.strictObject({
			kind: z.literal("surfaceExists"),
			surfaceId: surfaceIdSchema,
		}),
		z.strictObject({
			kind: z.literal("surfaceMissing"),
			surfaceId: surfaceIdSchema,
		}),
		z.strictObject({
			kind: z.literal("pendingRelationExists"),
			record: pendingSemanticRelationRecordSchema,
		}),
		z.strictObject({
			kind: z.literal("pendingRelationMissing"),
			record: pendingSemanticRelationRecordSchema,
		}),
		z.strictObject({
			kind: z.literal("readingAttestationMissing"),
			reading: languageReadingSchema,
			value: z.string(),
		}),
	]);

	const languageReadingKnowledgeChangeValueSchema = knowledgeChangeSchema
		.refine(
			namedValidationPredicate<Dumrel.KnowledgeChange>(
				`dumdict.knowledge-change.language.${language}`,
			),
			namedValidationError(
				`dumdict.knowledge-change.language.${language}`,
			),
		)
		.refine(
			namedValidationPredicate<Dumrel.KnowledgeChange>(
				"dumdict.knowledge-change.preposition-case",
			),
			namedValidationError("dumdict.knowledge-change.preposition-case"),
		) as unknown as ZodType<Dumrel.KnowledgeChange<Dumling.Reading<L>>>;
	const readingKnowledgeChangeSchema = z.strictObject({
		reading: languageReadingSchema,
		change: languageReadingKnowledgeChangeValueSchema,
	});
	const readingPatchOpSchema = z.union([
		z.strictObject({
			kind: z.literal("addAttestation"),
			value: z.string(),
		}),
		z.strictObject({
			kind: z.literal("applyKnowledgeChange"),
			envelope: readingKnowledgeChangeSchema,
		}),
	]);
	const preconditionsSchema = z.array(changePreconditionSchema);
	const plannedChangeOpSchema = z
		.union([
			z.strictObject({
				type: z.literal("createLemma"),
				record: lemmaRecordSchema,
				preconditions: preconditionsSchema,
			}),
			z.strictObject({
				type: z.literal("createReading"),
				entry: readingEntrySchema,
				preconditions: preconditionsSchema,
			}),
			z.strictObject({
				type: z.literal("patchReading"),
				reading: languageReadingSchema,
				ops: z.array(readingPatchOpSchema),
				preconditions: preconditionsSchema,
			}),
			z.strictObject({
				type: z.literal("createOwnedSurface"),
				entry: surfaceEntrySchema,
				preconditions: preconditionsSchema,
			}),
			z.strictObject({
				type: z.literal("createPendingSemanticRelation"),
				record: pendingSemanticRelationRecordSchema,
				preconditions: preconditionsSchema,
			}),
			z.strictObject({
				type: z.literal("deletePendingSemanticRelation"),
				record: pendingSemanticRelationRecordSchema,
				preconditions: preconditionsSchema,
			}),
		])
		.refine(
			namedValidationPredicate(
				"dumdict.knowledge-change.reading-matches-patched",
			),
			namedValidationError(
				"dumdict.knowledge-change.reading-matches-patched",
			),
		);
	const commitChangesRequestInputSchema = z.strictObject({
		baseRevision: storeRevisionSchema,
		changes: z.array(plannedChangeOpSchema),
	});
	const commitChangesRequestSchema =
		commitChangesRequestInputSchema.transform(retainCommitChangesRequest);
	const dumdictPlanSchema =
		commitChangesRequestInputSchema.transform(retainDumdictPlan);

	return {
		lemmaRecordSchema,
		readingEntrySchema,
		surfaceEntrySchema,
		pendingSemanticRelationLocatorSchema,
		pendingSemanticRelationRecordSchema,
		changePreconditionSchema,
		readingPatchOpSchema,
		plannedChangeOpSchema,
		dumdictPlanSchema,
		commitChangesRequestSchema,
	};
}

const schemasByLanguage = {
	de: createSchemasFor("de"),
	en: createSchemasFor("en"),
	he: createSchemasFor("he"),
} satisfies { [L in Dumling.Language]: DumdictSchemasFor<L> };

export function getDumdictSchemasFor<L extends Dumling.Language>(
	language: L,
): DumdictSchemasFor<L> {
	// Generic indexed access widens this to the map's concrete-language union;
	// the map is exhaustive and each value was created with its matching key.
	return schemasByLanguage[language] as unknown as DumdictSchemasFor<L>;
}

type DumdictSchemaKey = keyof DumdictSchemasFor<Dumling.Language>;
type AggregateSchemaOutput<Key extends DumdictSchemaKey> = {
	[L in Dumling.Language]: z.output<DumdictSchemasFor<L>[Key]>;
}[Dumling.Language];

function aggregateSchema<Key extends DumdictSchemaKey>(
	key: Key,
): ZodType<AggregateSchemaOutput<Key>> {
	const schemas = supportedLanguages.map(
		(language) => schemasByLanguage[language][key] as ZodType,
	);
	const [first, second, ...rest] = schemas;
	if (first === undefined)
		throw new Error("Dumling exposes no supported languages.");
	if (second === undefined)
		return first as ZodType<AggregateSchemaOutput<Key>>;
	return z.union([first, second, ...rest]) as ZodType<
		AggregateSchemaOutput<Key>
	>;
}

export const lemmaRecordSchema = aggregateSchema("lemmaRecordSchema");
export const readingEntrySchema = aggregateSchema("readingEntrySchema");
export const surfaceEntrySchema = aggregateSchema("surfaceEntrySchema");
export const pendingSemanticRelationLocatorSchema = aggregateSchema(
	"pendingSemanticRelationLocatorSchema",
);
export const pendingSemanticRelationRecordSchema = aggregateSchema(
	"pendingSemanticRelationRecordSchema",
);
export const changePreconditionSchema = aggregateSchema(
	"changePreconditionSchema",
);
export const readingPatchOpSchema = aggregateSchema("readingPatchOpSchema");
export const plannedChangeOpSchema = aggregateSchema("plannedChangeOpSchema");
export const dumdictPlanSchema = aggregateSchema("dumdictPlanSchema");
export const commitChangesRequestSchema = aggregateSchema(
	"commitChangesRequestSchema",
);

export const commitConflictCodeSchema = z.enum([
	"revisionConflict",
	"semanticPreconditionFailed",
]);
export const commitChangesResultSchema = z.union([
	z.strictObject({
		status: z.literal("committed"),
		nextRevision: z.string().min(1) as ZodType<StoreRevision>,
	}),
	z.strictObject({
		status: z.literal("conflict"),
		code: commitConflictCodeSchema,
		latestRevision: (
			z.string().min(1) as ZodType<StoreRevision>
		).optional(),
		message: z.string().optional(),
	}),
]);

export type {
	ChangePrecondition,
	CommitChangesRequest,
	CommitChangesResult,
	CommitConflictCode,
	DumdictPendingSemanticRelation,
	DumdictPlan,
	LemmaRecord,
	PendingEntryId,
	PendingSemanticRelationLocator,
	PendingSemanticRelationRecord,
	PlannedChangeOp,
	ReadingEntry,
	ReadingPatchOp,
	StoreRevision,
	SurfaceEntry,
} from "./domain-types.js";
